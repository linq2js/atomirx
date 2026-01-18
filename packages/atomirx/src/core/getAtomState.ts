import { isPromiseLike } from "./isPromiseLike";
import { trackPromise } from "./promiseCache";
import { Atom, AtomState } from "./types";

/**
 * Returns the current state of an atom as a discriminated union.
 *
 * For any atom (mutable or derived):
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
