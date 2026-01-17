import { Equality, EqualityShorthand } from './types';
/**
 * Strict equality (Object.is).
 */
export declare function strictEqual<T>(a: T, b: T): boolean;
/**
 * Shallow equality for objects/arrays.
 * Compares by reference for each top-level key/index.
 *
 * @param itemEqual - Optional comparator for each item/value (defaults to Object.is)
 */
export declare function shallowEqual<T>(a: T, b: T, itemEqual?: (a: unknown, b: unknown) => boolean): boolean;
/**
 * 2-level shallow equality.
 * Compares keys/length, then shallow compares each item/value.
 *
 * @example
 * [{ id: 1, data: obj }] vs [{ id: 1, data: obj }] // true (same obj ref)
 */
export declare function shallow2Equal<T>(a: T, b: T): boolean;
/**
 * 3-level shallow equality.
 * Compares keys/length, then shallow2 compares each item/value.
 *
 * @example
 * [{ id: 1, nested: { data: obj } }] vs [{ id: 1, nested: { data: obj } }] // true
 */
export declare function shallow3Equal<T>(a: T, b: T): boolean;
/**
 * Deep equality.
 */
export declare const deepEqual: (value: any, other: any) => boolean;
/**
 * Resolve equality strategy to a function.
 */
export declare function resolveEquality<T>(e: Equality<T> | undefined): (a: T, b: T) => boolean;
export declare function equality(shorthand: EqualityShorthand): (a: unknown, b: unknown) => boolean;
export type StableFn<TArgs extends any[], TResult> = ((...args: TArgs) => TResult) & {
    getOriginal: () => (...args: TArgs) => TResult;
    getCurrent: () => (...args: TArgs) => TResult;
    setCurrent: (newFn: (...args: TArgs) => TResult) => void;
};
export declare function createStableFn<TArgs extends any[], TResult>(fn: (...args: TArgs) => TResult): StableFn<TArgs, TResult>;
/**
 * Check if a value is a stable function wrapper.
 */
export declare function isStableFn<TArgs extends any[], TResult>(value: unknown): value is StableFn<TArgs, TResult>;
/**
 * Stabilize a value with automatic function wrapper support.
 *
 * - Functions: Creates/updates stable wrapper (reference never changes)
 * - Date objects: Compared by timestamp (uses deepEqual)
 * - Other values: Returns previous if equal per equalityFn
 *
 * @param prev - Previous value container (or undefined for first call)
 * @param next - New value
 * @param equalityFn - Equality function for non-function/non-date values
 * @returns Tuple of [stabilized value, wasStable]
 */
export declare function tryStabilize<T>(prev: {
    value: T;
} | undefined, next: T, equalityFn: (a: T, b: T) => boolean): [T, boolean];
