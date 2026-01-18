import { isPromiseLike } from "./isPromiseLike";
import { Atom, AtomState, DerivedAtom, SYMBOL_DERIVED } from "./types";

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
 * Returns the current state of an atom as a discriminated union.
 *
 * For DerivedAtom:
 * - Returns atom.state() directly (derived atoms track their own state)
 *
 * For MutableAtom:
 * - If value is not a Promise: returns ready state
 * - If value is a Promise: tracks and returns its state (ready/error/loading)
 *
 * @param atom - The atom to get state from
 * @returns AtomState discriminated union (ready | error | loading)
 *
 * @example
 * ```ts
 * const state = getAtomState(myAtom$);
 *
 * switch (state.status) {
 *   case "ready":
 *     console.log(state.value); // T
 *     break;
 *   case "error":
 *     console.log(state.error);
 *     break;
 *   case "loading":
 *     console.log(state.promise);
 *     break;
 * }
 * ```
 */
export function getAtomState<T>(atom: Atom<T>): AtomState<Awaited<T>> {
  // For derived atoms, use their own state method
  if (isDerived<T>(atom)) {
    return atom.state() as AtomState<Awaited<T>>;
  }

  const value = atom.value;

  // 1. Sync value - ready
  if (!isPromiseLike(value)) {
    return {
      status: "ready",
      value: value as Awaited<T>,
    };
  }

  // 2. Promise value - check state via promiseCache
  const state = trackPromise(value);

  switch (state.status) {
    case "fulfilled":
      return {
        status: "ready",
        value: state.value as Awaited<T>,
      };

    case "rejected":
      return {
        status: "error",
        error: state.error,
      };

    case "pending":
      return {
        status: "loading",
        promise: state.promise as Promise<Awaited<T>>,
      };
  }
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
