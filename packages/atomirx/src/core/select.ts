import { isAtom } from "./isAtom";
import { isPromiseLike } from "./isPromiseLike";
import { Atom, Getter } from "./types";

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
export function select<D, T>(
  source: Atom<D, any>,
  fn: (source: Getter<D>) => T
): SelectResult<T>;

export function select<const D extends readonly Atom<any, any>[], T>(
  source: D,
  fn: (
    ...values: {
      [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
    }
  ) => T
): SelectResult<T>;

export function select(source: any, fn: any): SelectResult<any> {
  // Track accessed dependencies during computation
  const dependencies = new Set<Atom<any>>();

  /**
   * Creates a suspense-like getter for an atom.
   * - Tracks the atom as a dependency when accessed
   * - If stale(): returns value (fallback/previous) - HIGHEST PRIORITY
   * - If loading: throws the atom's promise
   * - If error: throws the error
   * - Otherwise: returns the value
   */
  const createSuspenseGetter = (a: Atom<any, any>): Getter<any> => {
    return () => {
      // Track this atom as accessed dependency
      dependencies.add(a);

      // stale() check is HIGHEST priority
      // If fallback mode enabled and loading/error → return value (never throw)
      if (a.stale()) {
        return a.value; // Returns fallback or previous resolved value
      }

      if (a.loading) {
        throw a; // Atom is PromiseLike, throw it
      }
      if (a.error !== undefined) {
        throw a.error;
      }
      return a.value;
    };
  };

  // Create getters based on source form
  let getters: any;
  if (isAtom(source)) {
    getters = createSuspenseGetter(source);
  } else {
    // Array form
    const atoms = source as Atom<any>[];
    getters = atoms.map((a) => createSuspenseGetter(a));
  }

  // Execute the select function
  try {
    let result: any;
    if (isAtom(source)) {
      result = fn(getters);
    } else {
      // Array form - spread getters as arguments
      result = fn(...getters);
    }

    // Success
    return {
      value: result,
      error: undefined,
      promise: undefined,
      dependencies,
    };
  } catch (thrown) {
    if (isPromiseLike(thrown)) {
      // Promise thrown - loading state
      return {
        value: undefined,
        error: undefined,
        promise: thrown,
        dependencies,
      };
    } else {
      // Error thrown
      return {
        value: undefined,
        error: thrown,
        promise: undefined,
        dependencies,
      };
    }
  }
}
