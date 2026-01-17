import { isPromiseLike } from "./isPromiseLike";
import { onCreateHook } from "./onCreateHook";
import { atomState } from "./atomState";
import { AtomOptions, MutableAtom, SYMBOL_ATOM } from "./types";
import { withUse } from "./withUse";

/**
 * Type for lazy initializer function.
 * A function that returns the initial value (sync or async).
 */
type LazyInitializer<T> = () => T | PromiseLike<T>;

/**
 * Creates a mutable atom - a reactive state container that holds a single value.
 *
 * Atoms support both synchronous and asynchronous (Promise) initial values,
 * as well as lazy initializer functions.
 * When initialized with a Promise, the atom starts in a loading state and
 * automatically updates when the Promise resolves or rejects.
 *
 * Features:
 * - Lazy initialization: state is not created until first access
 * - Lazy initializer function: accepts `() => T` for deferred computation
 * - Async support: accepts Promise values with loading/error states
 * - Equality checking: configurable equality for reducer-based updates
 * - Plugin system: chainable `.use()` method for extensions
 * - Subscriptions: `.on()` for change notifications
 * - Fallback mode: optional fallback value for loading/error states
 *
 * @template TValue - The type of value stored in the atom
 * @template TFallback - The type of fallback value (must extend T)
 * @param value - Initial value, Promise, or lazy initializer function
 * @param options - Configuration options
 * @param options.key - Optional identifier for debugging/devtools
 * @param options.equals - Equality strategy for change detection (default: strict)
 * @param options.fallback - Fallback value for loading/error states (enables stale mode)
 * @returns A mutable atom with value, loading, error states and set/reset methods
 *
 * @example Synchronous value
 * ```ts
 * const count = atom(0);
 * count.set(1);
 * count.set(prev => prev + 1);
 * console.log(count.value); // 2
 * ```
 *
 * @example Async value
 * ```ts
 * const user = atom(fetchUser(id));
 * console.log(user.loading); // true
 * await user;
 * console.log(user.value); // { name: "John", ... }
 * ```
 *
 * @example Lazy initializer function
 * ```ts
 * const expensive = atom(() => computeExpensiveValue());
 * // computeExpensiveValue() is NOT called until first access
 * console.log(expensive.value); // Now it's computed
 * ```
 *
 * @example Lazy async initializer
 * ```ts
 * const user = atom(() => fetchUser(id));
 * // fetchUser is NOT called until first access
 * console.log(user.loading); // true (fetch starts now)
 * ```
 *
 * @example With equals option
 * ```ts
 * const state = atom({ count: 0 }, { equals: "shallow" });
 * state.set(prev => ({ ...prev })); // No notification (shallow equal)
 * ```
 *
 * @example With fallback (value never undefined during loading/error)
 * ```ts
 * const user = atom(fetchUser(), { fallback: { name: 'Guest' } });
 * console.log(user.value); // { name: 'Guest' } during loading
 * console.log(user.isStale()); // true during loading/error
 * await user;
 * console.log(user.value); // { name: 'John', ... }
 * console.log(user.isStale()); // false
 * ```
 *
 * @overload With fallback - Returns MutableAtom<T, TFallback> where value is T | TFallback
 * @overload Without fallback - Returns MutableAtom<T> where value is T | undefined
 */

/**
 * Creates an atom with a fallback value for loading/error states.
 * The `value` property will return the fallback (or last resolved value) during loading/error,
 * and `isStale()` will return true when the fallback/previous value is being used.
 */
export function atom<TValue, TFallback extends Awaited<TValue>>(
  initialValue: TValue | PromiseLike<TValue> | LazyInitializer<TValue>,
  options: AtomOptions<Awaited<TValue>> & { fallback: TFallback }
): MutableAtom<Awaited<TValue>, TFallback>;

/**
 * Creates an atom without a fallback value.
 * The `value` property will be undefined during loading/error states.
 */
export function atom<TValue>(
  initialValue: TValue | PromiseLike<TValue> | LazyInitializer<TValue>,
  options?: AtomOptions<Awaited<TValue>>
): MutableAtom<Awaited<TValue>>;

// Implementation signature (handles both overloads)
export function atom<TValue>(
  initialValue: TValue | PromiseLike<TValue> | LazyInitializer<TValue>,
  options: AtomOptions<Awaited<TValue>> & { fallback?: TValue } = {}
): MutableAtom<Awaited<TValue>> {
  // Check if fallback mode is enabled
  const hasFallback = "fallback" in options;
  const fallbackValue = options.fallback;

  // Create the state container with equals and fallback options
  const state = atomState<Awaited<TValue>, any>({
    equals: options.equals,
    fallback: fallbackValue,
    hasFallback,
  });

  // Track if state has been initialized (lazy initialization)
  let isInitialized = false;

  /**
   * Handles async promise resolution/rejection.
   * Attaches then/catch handlers to the current promise and updates state
   * when it settles. Ignores stale results if state has changed.
   */
  const handleAsyncPromise = (promise: PromiseLike<Awaited<TValue>>) => {
    // Capture version to detect if it becomes stale
    const version = state.getVersion();

    promise.then(
      (value) => {
        // Ignore if state has changed (e.g., set() was called while loading)
        if (state.isVersionStale(version)) return;
        state.setValue(value);
      },
      (error) => {
        // Ignore if state has changed
        if (state.isVersionStale(version)) return;
        state.setError(error);
      }
    );
  };

  /**
   * Checks if a value is a lazy initializer function.
   * A function is considered a lazy initializer if it's a plain function
   * (not a Promise with a callable then).
   */
  const isLazyInitializer = (
    value: unknown
  ): value is LazyInitializer<Awaited<TValue>> => {
    return typeof value === "function" && !isPromiseLike(value);
  };

  /**
   * Lazily initializes the atom state on first access.
   * For lazy initializer: calls the function and handles result.
   * For sync values: creates resolved state immediately.
   * For async values: creates loading state and starts async resolution.
   */
  const tryInit = () => {
    if (isInitialized) return;
    isInitialized = true;

    // Handle lazy initializer function
    if (isLazyInitializer(initialValue)) {
      try {
        const result = initialValue();

        // Check if result is a Promise
        if (isPromiseLike(result)) {
          state.setLoading(result as PromiseLike<Awaited<TValue>>, true); // silent
          handleAsyncPromise(result as PromiseLike<Awaited<TValue>>);
          return;
        }

        // Synchronous result
        state.setValue(result as Awaited<TValue>, true);
        return;
      } catch (error) {
        // Factory threw synchronously
        state.setError(error, true);
        return;
      }
    }

    // Handle Promise/PromiseLike initial values
    if (isPromiseLike(initialValue)) {
      state.setLoading(initialValue as PromiseLike<Awaited<TValue>>, true); // silent
      handleAsyncPromise(initialValue as PromiseLike<Awaited<TValue>>);
      return;
    }

    // Handle synchronous initial values (silent - don't notify on init)
    state.setValue(initialValue as Awaited<TValue>, true);
  };

  /**
   * Updates the atom's value.
   *
   * Accepts a direct value, a Promise, or a reducer function.
   * - Direct value: updates and notifies
   * - Promise: enters loading state, resolves to value or error
   * - Reducer function: computes new value from previous, only notifies if changed
   *
   * Special handling for loading state:
   * - Direct value/Promise: immediately updates to the new value/loading state
   * - Reducer: chains onto the pending promise
   *
   * @param value - New value, Promise, or reducer function (prev) => newValue
   */
  const set = (
    value:
      | TValue
      | PromiseLike<Awaited<TValue>>
      | ((prev: Awaited<TValue>) => Awaited<TValue>)
  ) => {
    tryInit();

    const currentValue = state.getValue();
    const loading = state.getLoading();
    const error = state.getError();
    const promise = state.getPromise();

    if (typeof value === "function") {
      try {
        const reducer = value as (prev: Awaited<TValue>) => Awaited<TValue>;

        // If still loading, chain the reducer onto the pending promise
        if (loading) {
          const chainedPromise = promise.then(reducer);
          state.setLoading(chainedPromise);
          handleAsyncPromise(chainedPromise);
          return;
        }

        // If there was an error, don't try to call reducer
        if (error) {
          return;
        }

        // Apply reducer - atomState handles equality check internally
        const nextValue = reducer(currentValue as Awaited<TValue>);
        state.setValue(nextValue);
        state.markDirty();
        return;
      } catch (err) {
        state.setError(err);
        return;
      }
    }

    // Handle Promise values - enter loading state
    if (isPromiseLike(value)) {
      state.setLoading(value as PromiseLike<Awaited<TValue>>);
      handleAsyncPromise(value as PromiseLike<Awaited<TValue>>);
      return;
    }

    // Direct value assignment - atomState handles equality check
    state.setValue(value as Awaited<TValue>);
    state.markDirty();
  };

  // Create the atom object with getters for lazy initialization
  const a = withUse({
    [SYMBOL_ATOM]: true,
    key: options.key,
    meta: options.meta,
    /**
     * Current value.
     * - Without fallback: undefined while loading or on error
     * - With fallback: returns fallback/previous value during loading/error
     */
    get value(): any {
      tryInit();
      return state.getValue();
    },

    /** Whether the atom is waiting for a Promise to resolve */
    get loading(): any {
      tryInit();
      return state.getLoading();
    },

    /** Error from rejected Promise (undefined if no error) */
    get error(): any {
      tryInit();
      return state.getError();
    },

    /**
     * Returns true if fallback mode is enabled AND atom is in loading or error state.
     * When stale() returns true, `value` returns the fallback or previous resolved value.
     */
    stale(): boolean {
      tryInit();
      return state.stale();
    },

    /**
     * Returns true if the value has been changed by set() since creation or last reset().
     * Useful for tracking if the atom has been modified from its initial state.
     */
    dirty(): boolean {
      return state.isDirty();
    },

    /**
     * Makes the atom thenable (awaitable).
     * Allows: `const value = await atom;`
     */
    then(onfulfilled?: any, onrejected?: any) {
      tryInit();
      return state.getPromise().then(onfulfilled, onrejected);
    },

    set,

    /**
     * Resets the atom to its initial state.
     * Re-evaluates the initial value on next access.
     */
    reset() {
      if (isInitialized) {
        isInitialized = false;
        state.reset();
      }
    },

    /** Subscribe to value changes */
    on: state.on,
  }) as MutableAtom<Awaited<TValue>>;

  // Notify devtools/plugins of atom creation
  onCreateHook.current?.({
    type: "mutable",
    key: options.key,
    meta: options.meta,
    atom: a,
  });

  return a;
}
