import { AtomOptions, MutableAtom } from './types';
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
export declare function atom<TValue, TFallback extends Awaited<TValue>>(initialValue: TValue | PromiseLike<TValue> | LazyInitializer<TValue>, options: AtomOptions<Awaited<TValue>> & {
    fallback: TFallback;
}): MutableAtom<Awaited<TValue>, TFallback>;
/**
 * Creates an atom without a fallback value.
 * The `value` property will be undefined during loading/error states.
 */
export declare function atom<TValue>(initialValue: TValue | PromiseLike<TValue> | LazyInitializer<TValue>, options?: AtomOptions<Awaited<TValue>>): MutableAtom<Awaited<TValue>>;
export {};
