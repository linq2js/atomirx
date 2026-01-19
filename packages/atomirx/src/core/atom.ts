import { onCreateHook } from "./onCreateHook";
import { emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { scheduleNotifyHook } from "./scheduleNotifyHook";
import {
  AtomOptions,
  MutableAtom,
  SYMBOL_ATOM,
  Equality,
  Pipeable,
  Atom,
} from "./types";
import { withUse } from "./withUse";
import { isPromiseLike } from "./isPromiseLike";
import { trackPromise } from "./promiseCache";

/**
 * Context object passed to atom initializer functions.
 * Provides utilities for cleanup and cancellation.
 */
export interface AtomContext extends Pipeable {
  /**
   * AbortSignal that is aborted when the atom value changes (via set or reset).
   * Use this to cancel pending async operations.
   */
  signal: AbortSignal;
  /**
   * Register a cleanup function that runs when the atom value changes or resets.
   * Multiple cleanup functions can be registered; they run in FIFO order.
   *
   * @param cleanup - Function to run during cleanup
   */
  onCleanup(cleanup: VoidFunction): void;
}

/**
 * Creates a mutable atom - a reactive state container that holds a single value.
 *
 * MutableAtom is a raw storage container. It stores values as-is, including Promises.
 * If you store a Promise, `.get()` returns the Promise object itself.
 *
 * Features:
 * - Raw storage: stores any value including Promises
 * - Lazy initialization: pass a function to defer computation
 * - Equality checking: configurable equality for reducer-based updates
 * - Plugin system: chainable `.use()` method for extensions
 * - Subscriptions: `.on()` for change notifications
 *
 * @template T - The type of value stored in the atom
 * @param valueOrInit - Initial value or lazy initializer function `() => T`
 * @param options - Configuration options
 * @param options.meta - Optional metadata for debugging/devtools
 * @param options.equals - Equality strategy for change detection (default: strict)
 * @returns A mutable atom with get, set/reset methods
 *
 * @example Synchronous value
 * ```ts
 * const count = atom(0);
 * count.set(1);
 * count.set(prev => prev + 1);
 * console.log(count.get()); // 2
 * ```
 *
 * @example Lazy initialization
 * ```ts
 * // Initial value computed at creation
 * const config = atom(() => parseExpensiveConfig());
 *
 * // reset() re-runs the initializer for fresh values
 * const timestamp = atom(() => Date.now());
 * timestamp.reset(); // Gets new timestamp
 *
 * // To store a function as value, wrap it:
 * const callback = atom(() => () => console.log('hello'));
 * ```
 *
 * @example Async value (stores Promise as-is)
 * ```ts
 * const posts = atom(fetchPosts());
 * posts.get(); // Promise<Post[]>
 *
 * // Refetch - set a new Promise
 * posts.set(fetchPosts());
 *
 * // Reset with direct value - restores original Promise (does NOT refetch)
 * // Reset with lazy init - re-runs initializer (DOES refetch)
 * const lazyPosts = atom(() => fetchPosts());
 * lazyPosts.reset(); // Refetches!
 * ```
 *
 * @example With equals option
 * ```ts
 * const state = atom({ count: 0 }, { equals: "shallow" });
 * state.set(prev => ({ ...prev })); // No notification (shallow equal)
 * ```
 */
export function atom<T>(
  valueOrInit: T | ((context: AtomContext) => T),
  options: AtomOptions<T> = {}
): MutableAtom<T> {
  const changeEmitter = emitter();
  const eq = resolveEquality(options.equals as Equality<unknown>);

  // Track current AbortController and cleanup emitter for init context
  let abortController: AbortController | null = null;
  const cleanupEmitter = emitter();

  /**
   * Aborts the current signal and calls all registered cleanup functions.
   */
  const abortAndCleanup = (reason: string) => {
    // Abort the signal first
    if (abortController) {
      abortController.abort(reason);
      abortController = null;
    }
    // Then call all registered cleanups
    cleanupEmitter.emitAndClear();
  };

  /**
   * Creates a fresh AtomContext for initializer functions.
   */
  const createContext = (): AtomContext => {
    abortController = new AbortController();
    return withUse({
      signal: abortController.signal,
      onCleanup: cleanupEmitter.on,
    });
  };

  // Resolve initial value (supports lazy initialization with context)
  const isInitFunction = typeof valueOrInit === "function";
  const initialValue: T = isInitFunction
    ? (valueOrInit as (context: AtomContext) => T)(createContext())
    : valueOrInit;

  // Current value
  let value: T = initialValue;

  // Track if value has changed since init/reset
  let isDirty = false;

  isPromiseLike(value) && trackPromise(value);

  /**
   * Schedules notification to all subscribers.
   */
  const notify = () => {
    changeEmitter.forEach((listener) => {
      scheduleNotifyHook.current(listener);
    });
  };

  /**
   * Updates the atom's value.
   *
   * @param newValue - New value or reducer function (prev) => newValue
   */
  const set = (newValue: T | ((prev: T) => T)) => {
    let nextValue: T;

    if (typeof newValue === "function") {
      // Reducer function
      nextValue = (newValue as (prev: T) => T)(value);
    } else {
      nextValue = newValue;
    }

    // Check equality
    if (eq(nextValue, value)) {
      return;
    }

    // Abort previous signal and run cleanups before changing value
    abortAndCleanup("value changed");

    value = nextValue;
    isDirty = true;
    isPromiseLike(value) && trackPromise(value);
    notify();
  };

  /**
   * Resets the atom to its initial value and clears dirty flag.
   */
  const reset = () => {
    // Abort previous signal and run cleanups before resetting
    abortAndCleanup("reset");

    // Re-run initializer if function (with fresh context), otherwise use initial value
    const nextValue: T = isInitFunction
      ? (valueOrInit as (context: AtomContext) => T)(createContext())
      : valueOrInit;

    // Track promise if needed
    isPromiseLike(nextValue) && trackPromise(nextValue);

    // Check if value actually changed
    const changed = !eq(nextValue, value);

    value = nextValue;
    isDirty = false; // Always clear dirty flag on reset

    if (changed) {
      notify();
    }
  };

  /**
   * Returns true if the value has changed since initialization or last reset().
   */
  const dirty = (): boolean => {
    return isDirty;
  };

  // Create the atom object
  const a = withUse({
    [SYMBOL_ATOM]: true as const,
    meta: options.meta,

    /**
     * Get the current value (raw, including Promises).
     */
    get(): any {
      return value;
    },
    use: undefined as any,
    set,
    reset,
    dirty,
    /**
     * Subscribe to value changes.
     */
    on: changeEmitter.on,
  }) as Pipeable & MutableAtom<T>;

  // Notify devtools/plugins of atom creation
  onCreateHook.current?.({
    type: "mutable",
    key: options.meta?.key,
    meta: options.meta,
    atom: a as MutableAtom<unknown>,
  });

  return a;
}

/**
 * Type utility to expose an atom as read-only when exporting from a module.
 *
 * This function returns the same atom instance but with a narrowed type (`Atom<T>`)
 * that hides mutable methods like `set()` and `reset()`. Use this to encapsulate
 * state mutations within a module while allowing external consumers to only read
 * and subscribe to changes.
 *
 * **Note:** This is a compile-time restriction only. At runtime, the atom is unchanged.
 * Consumers with access to the original reference can still mutate it.
 *
 * @param atom - The atom (or record of atoms) to expose as read-only
 * @returns The same atom(s) with a read-only type signature
 *
 * @example Single atom
 * ```ts
 * const myModule = define(() => {
 *   const count$ = atom(0); // Internal mutable atom
 *
 *   return {
 *     // Expose as read-only - consumers can't call set() or reset()
 *     count$: readonly(count$),
 *     // Mutations only possible through explicit actions
 *     increment: () => count$.set(prev => prev + 1),
 *     decrement: () => count$.set(prev => prev - 1),
 *   };
 * });
 *
 * // Usage:
 * const { count$, increment } = myModule();
 * count$.get();        // ✅ OK - reading is allowed
 * count$.on(console.log); // ✅ OK - subscribing is allowed
 * count$.set(5);       // ❌ TypeScript error - set() not available on Atom<T>
 * increment();         // ✅ OK - use exposed action instead
 * ```
 *
 * @example Record of atoms
 * ```ts
 * const myModule = define(() => {
 *   const count$ = atom(0);
 *   const name$ = atom('');
 *
 *   return {
 *     // Expose multiple atoms as read-only at once
 *     ...readonly({ count$, name$ }),
 *     setName: (name: string) => name$.set(name),
 *   };
 * });
 *
 * // Usage:
 * const { count$, name$, setName } = myModule();
 * count$.get();  // ✅ Atom<number>
 * name$.get();   // ✅ Atom<string>
 * name$.set(''); // ❌ TypeScript error
 * ```
 */
export function readonly<T extends Atom<any> | Record<string, Atom<any>>>(
  atom: T
): T extends Atom<infer V>
  ? Atom<V>
  : { [K in keyof T]: T[K] extends Atom<infer V> ? Atom<V> : never } {
  return atom as any;
}
