/**
 * Check if a value is a PromiseLike (has a .then method).
 *
 * @example
 * isPromiseLike(Promise.resolve(1)) // true
 * isPromiseLike({ then: () => {} }) // true
 * isPromiseLike(42) // false
 */
export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    "then" in value &&
    typeof (value as any).then === "function"
  );
}
