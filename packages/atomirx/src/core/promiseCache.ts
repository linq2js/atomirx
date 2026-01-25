import { shallow2Equal } from "./equality";
import { isPromiseLike } from "./isPromiseLike";
import { AnyFunc, DerivedAtom, SYMBOL_DERIVED } from "./types";

/**
 * Metadata attached to combined promises for comparison.
 */
export interface CombinedPromiseMeta {
  type: "all" | "race" | "allSettled";
  promises: Promise<unknown>[];
}

/**
 * WeakMap cache for combined promise metadata.
 * Using WeakMap allows promises to be garbage collected when no longer referenced.
 */
const combinedPromiseCache = new WeakMap<
  PromiseLike<unknown>,
  CombinedPromiseMeta
>();

/**
 * Gets the metadata for a combined promise, if any.
 * Used internally by promisesEqual for comparison.
 */
export function getCombinedPromiseMetadata(
  promise: PromiseLike<unknown>
): CombinedPromiseMeta | undefined {
  return combinedPromiseCache.get(promise);
}

/**
 * Create a combined promise with metadata for comparison.
 * If only one promise, returns it directly (no metadata needed).
 */
export function createCombinedPromise(
  type: "all" | "race" | "allSettled",
  promises: Promise<unknown>[]
): PromiseLike<unknown> {
  if (promises.length === 1) {
    // Single promise - no need for metadata, just return it
    // For allSettled, we still need to wrap to prevent rejection propagation
    if (type === "allSettled") {
      const combined = Promise.allSettled(promises).then(() => undefined);
      combinedPromiseCache.set(combined, { type, promises });
      return combined;
    }
    return promises[0];
  }

  const combined = (Promise[type] as AnyFunc)(promises);
  // Attach no-op catch to prevent unhandled rejection warnings
  combined.catch(() => {});
  combinedPromiseCache.set(combined, { type, promises });
  return combined;
}

/**
 * Compare two promises, considering combined promise metadata.
 * Returns true if promises are considered equal.
 */
export function promisesEqual(
  a: PromiseLike<unknown> | undefined,
  b: PromiseLike<unknown> | undefined
): boolean {
  // Same reference
  if (a === b) return true;

  // One is undefined
  if (!a || !b) return false;

  // Compare by metadata (type + source promises array)
  const metaA = getCombinedPromiseMetadata(a);
  const metaB = getCombinedPromiseMetadata(b);

  return !!metaA && !!metaB && shallow2Equal(metaA, metaB);
}

/**
 * Represents the state of a tracked Promise.
 */
export type PromiseState<T> =
  | { status: "pending"; promise: PromiseLike<T> }
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; error: unknown };

/**
 * WeakMap cache for Promise states.
 * Using WeakMap allows Promises to be garbage collected when no longer referenced.
 */
const promiseCache = new WeakMap<PromiseLike<unknown>, PromiseState<unknown>>();

/**
 * Tracks a Promise and caches its state.
 * If the Promise is already tracked, returns the existing state.
 * Otherwise, starts tracking and returns the initial pending state.
 *
 * @param promise - The Promise to track
 * @returns The current state of the Promise
 *
 * @example
 * ```ts
 * const promise = fetchData();
 * const state = trackPromise(promise);
 * // state.status === 'pending'
 *
 * await promise;
 * const state2 = trackPromise(promise);
 * // state2.status === 'fulfilled'
 * ```
 */
export function trackPromise<T>(promise: PromiseLike<T>): PromiseState<T> {
  const existing = promiseCache.get(promise);
  if (existing) {
    return existing as PromiseState<T>;
  }

  const state: PromiseState<T> = { status: "pending", promise };
  promiseCache.set(promise, state as PromiseState<unknown>);

  promise.then(
    (value) => {
      // Only update if still pending (not replaced by another state)
      const current = promiseCache.get(promise);
      if (current?.status === "pending") {
        promiseCache.set(promise, { status: "fulfilled", value });
      }
    },
    (error) => {
      // Only update if still pending
      const current = promiseCache.get(promise);
      if (current?.status === "pending") {
        promiseCache.set(promise, { status: "rejected", error });
      }
    }
  );

  return state;
}

/**
 * Gets the current state of a Promise without tracking it.
 * Returns undefined if the Promise is not being tracked.
 *
 * @param promise - The Promise to check
 * @returns The current state or undefined if not tracked
 */
export function getPromiseState<T>(
  promise: PromiseLike<T>
): PromiseState<T> | undefined {
  return promiseCache.get(promise) as PromiseState<T> | undefined;
}

/**
 * Checks if a Promise is being tracked.
 *
 * @param promise - The Promise to check
 * @returns true if the Promise is tracked
 */
export function isTracked(promise: PromiseLike<unknown>): boolean {
  return promiseCache.has(promise);
}

/**
 * Type guard to check if a value is a DerivedAtom.
 */
export function isDerived<T>(value: unknown): value is DerivedAtom<T, boolean> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_DERIVED in value &&
    (value as DerivedAtom<T, boolean>)[SYMBOL_DERIVED] === true
  );
}

/**
 * Unwraps a value that may be a Promise.
 * - If not a Promise, returns the value directly.
 * - If a resolved Promise, returns the resolved value.
 * - If a loading Promise, throws the Promise (for Suspense).
 * - If a rejected Promise, throws the error.
 *
 * This follows the React Suspense pattern where throwing a Promise
 * signals that the component should suspend until the Promise resolves.
 *
 * @param value - The value to unwrap (may be a Promise)
 * @returns The unwrapped value
 * @throws Promise if loading, Error if rejected
 */
export function unwrap<T>(value: T | PromiseLike<T>): T {
  if (!isPromiseLike(value)) {
    return value;
  }

  const promise = value as PromiseLike<T>;
  const state = trackPromise(promise);

  switch (state.status) {
    case "pending":
      throw state.promise;
    case "rejected":
      throw state.error;
    case "fulfilled":
      return state.value;
  }
}

/**
 * Checks if a value is a pending Promise.
 *
 * @param value - The value to check
 * @returns true if value is a Promise in pending state
 */
export function isPending<T>(value: T | PromiseLike<T>): boolean {
  if (!isPromiseLike(value)) {
    return false;
  }
  const state = trackPromise(value as PromiseLike<T>);
  return state.status === "pending";
}

/**
 * Checks if a value is a fulfilled Promise.
 *
 * @param value - The value to check
 * @returns true if value is a Promise in fulfilled state
 */
export function isFulfilled<T>(value: T | PromiseLike<T>): boolean {
  if (!isPromiseLike(value)) {
    return false;
  }
  const state = trackPromise(value as PromiseLike<T>);
  return state.status === "fulfilled";
}

/**
 * Checks if a value is a rejected Promise.
 *
 * @param value - The value to check
 * @returns true if value is a Promise in rejected state
 */
export function isRejected<T>(value: T | PromiseLike<T>): boolean {
  if (!isPromiseLike(value)) {
    return false;
  }
  const state = trackPromise(value as PromiseLike<T>);
  return state.status === "rejected";
}

/**
 * Creates a Promise that is immediately resolved AND pre-cached as fulfilled.
 * This avoids the loading→resolved flicker when trackPromise() is called.
 *
 * Use this instead of `Promise.resolve(value)` when you need the promise
 * to be recognized as already-resolved by the promise tracking system.
 *
 * @param value - The resolved value
 * @returns A resolved Promise with pre-populated cache state
 *
 * @example
 * ```ts
 * const promise = createResolvedPromise(42);
 * const state = trackPromise(promise);
 * // state.status === 'fulfilled' immediately (no loading flicker)
 * ```
 */
export function createResolvedPromise<T>(value: T): Promise<T> {
  const promise = Promise.resolve(value);
  promiseCache.set(promise, { status: "fulfilled", value });
  return promise;
}

/**
 * Creates a Promise that is immediately rejected AND pre-cached as rejected.
 * This avoids the loading→rejected flicker when trackPromise() is called.
 *
 * Note: Attaches a no-op catch to prevent unhandled rejection warnings.
 *
 * @param error - The rejection error
 * @returns A rejected Promise with pre-populated cache state
 *
 * @example
 * ```ts
 * const promise = createRejectedPromise(new Error('Failed'));
 * const state = trackPromise(promise);
 * // state.status === 'rejected' immediately (no loading flicker)
 * ```
 */
export function createRejectedPromise<T = never>(error: unknown): Promise<T> {
  const promise = Promise.reject(error) as Promise<T>;
  // Prevent unhandled rejection warning
  promise.catch(() => {});
  promiseCache.set(promise, { status: "rejected", error });
  return promise;
}

/**
 * Gets the resolved value of a Promise if fulfilled, otherwise undefined.
 *
 * @param value - The value to check
 * @returns The resolved value or undefined
 */
export function getResolvedValue<T>(value: T | PromiseLike<T>): T | undefined {
  if (!isPromiseLike(value)) {
    return value;
  }
  const state = getPromiseState(value as PromiseLike<T>);
  if (state?.status === "fulfilled") {
    return state.value;
  }
  return undefined;
}

/**
 * Gets the error of a Promise if rejected, otherwise undefined.
 *
 * @param value - The value to check
 * @returns The error or undefined
 */
export function getRejectedError<T>(
  value: T | PromiseLike<T>
): unknown | undefined {
  if (!isPromiseLike(value)) {
    return undefined;
  }
  const state = getPromiseState(value as PromiseLike<T>);
  if (state?.status === "rejected") {
    return state.error;
  }
  return undefined;
}
