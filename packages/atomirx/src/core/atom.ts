import { onCreateHook } from "./onCreateHook";
import { emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { scheduleNotifyHook } from "./scheduleNotifyHook";
import { AtomOptions, MutableAtom, SYMBOL_ATOM, Equality } from "./types";
import { withUse } from "./withUse";
import { isPromiseLike } from "./isPromiseLike";
import { trackPromise } from "./promiseCache";

/**
 * Creates a mutable atom - a reactive state container that holds a single value.
 *
 * MutableAtom is a raw storage container. It stores values as-is, including Promises.
 * If you store a Promise, `.value` returns the Promise object itself.
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
 * @returns A mutable atom with value, set/reset methods
 *
 * @example Synchronous value
 * ```ts
 * const count = atom(0);
 * count.set(1);
 * count.set(prev => prev + 1);
 * console.log(count.value); // 2
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
 * posts.value; // Promise<Post[]>
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
  valueOrInit: T | (() => T),
  options: AtomOptions<T> = {}
): MutableAtom<T> {
  const changeEmitter = emitter();
  const eq = resolveEquality(options.equals as Equality<unknown>);

  // Resolve initial value (supports lazy initialization)
  const initialValue: T =
    typeof valueOrInit === "function"
      ? (valueOrInit as () => T)()
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

    value = nextValue;
    isDirty = true;
    isPromiseLike(value) && trackPromise(value);
    notify();
  };

  /**
   * Resets the atom to its initial value and clears dirty flag.
   */
  const reset = () => {
    // Re-run initializer if function, otherwise use initial value
    const nextValue: T =
      typeof valueOrInit === "function"
        ? (valueOrInit as () => T)()
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
     * Current value (raw, including Promises).
     */
    get value(): T {
      return value;
    },

    set,
    reset,
    dirty,

    /**
     * Subscribe to value changes.
     */
    on: changeEmitter.on,
  }) as MutableAtom<T>;

  // Notify devtools/plugins of atom creation
  onCreateHook.current?.({
    type: "mutable",
    key: options.meta?.key,
    meta: options.meta,
    atom: a as MutableAtom<unknown>,
  });

  return a;
}
