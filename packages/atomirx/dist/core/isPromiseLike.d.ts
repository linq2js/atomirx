/**
 * Check if a value is a PromiseLike (has a .then method).
 *
 * @example
 * isPromiseLike(Promise.resolve(1)) // true
 * isPromiseLike({ then: () => {} }) // true
 * isPromiseLike(42) // false
 */
export declare function isPromiseLike<T>(value: unknown): value is PromiseLike<T>;
