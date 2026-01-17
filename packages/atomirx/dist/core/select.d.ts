import { Atom, Getter } from './types';
/**
 * Result of a select computation.
 *
 * @template T - The type of the computed value
 */
export interface SelectResult<T> {
    /** The computed value (undefined if error or loading) */
    value: T | undefined;
    /** Error thrown during computation (undefined if success or loading) */
    error: any;
    /** Promise thrown during computation - indicates loading state (undefined if success or error) */
    promise: PromiseLike<any> | undefined;
    /** Set of atoms that were accessed during computation */
    dependencies: Set<Atom<any, any>>;
}
/**
 * Selects/computes a value from atom(s) with suspense-like getters and tracks dependencies.
 *
 * This is the core computation logic used by `derived()`. It:
 * 1. Creates suspense-like getters that throw promises/errors
 * 2. Tracks which atoms are accessed during computation
 * 3. Returns a result with value/error/promise and dependencies
 *
 * @template T - The type of the computed value
 * @param source - Single atom or array of atoms
 * @param fn - Selector function that computes the derived value
 * @returns SelectResult with value, error, promise, and dependencies
 *
 * @example Single source
 * ```ts
 * const count = atom(5);
 * const result = select(count, (get) => get() * 2);
 * // result.value === 10
 * // result.dependencies.has(count) === true
 * ```
 *
 * @example Multiple sources (array form)
 * ```ts
 * const a = atom(1);
 * const b = atom(2);
 * const result = select([a, b], (getA, getB) => getA() + getB());
 * // result.value === 3
 * ```
 *
 * @example Conditional dependencies
 * ```ts
 * const flag = atom(true);
 * const a = atom(1);
 * const b = atom(2);
 * const result = select([flag, a, b], (getFlag, getA, getB) => getFlag() ? getA() : getB());
 * // result.dependencies only contains flag and a (not b)
 * ```
 */
export declare function select<D, T>(source: Atom<D, any>, fn: (source: Getter<D>) => T): SelectResult<T>;
export declare function select<const D extends readonly Atom<any, any>[], T>(source: D, fn: (...values: {
    [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
}) => T): SelectResult<T>;
