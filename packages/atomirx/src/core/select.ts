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
 * Context object passed to selector functions.
 * Provides utilities for reading atoms and handling async operations.
 */
export interface SelectContext {
  /**
   * Read the current value of an atom.
   * Tracks the atom as a dependency.
   *
   * Suspense-like behavior:
   * - If atom has fallback and is stale: returns fallback/previous value
   * - If atom is loading: throws the promise
   * - If atom has error: throws the error
   * - Otherwise: returns the value
   *
   * @param atom - The atom to read
   * @returns The atom's current value
   *
   * @example
   * ```ts
   * derived(({ get }) => {
   *   const user = get(user$);
   *   const settings = get(settings$);
   *   return { user, theme: settings.theme };
   * });
   * ```
   */
  get<T>(atom: Atom<T, any>): T;

  /**
   * Wait for all atoms to resolve (like Promise.all).
   * Array-only - use destructuring for custom variable names.
   *
   * - If all atoms are resolved → returns array of values
   * - If any atom has error → throws that error immediately
   * - If any atom is loading (and none errored) → throws combined promise
   *
   * @param atoms - Array of atoms
   * @returns Array of resolved values (same order as input)
   *
   * @example
   * ```ts
   * derived(({ all }) => {
   *   const [user, posts, customName] = all([user$, posts$, comments$]);
   *   return { user, posts, comments: customName };
   * });
   * ```
   */
  all<const T extends readonly Atom<any, any>[]>(
    atoms: T
  ): { [K in keyof T]: T[K] extends Atom<infer U, any> ? U : never };

  /**
   * Return the first resolved atom's value (like Promise.any).
   * Object-only - returns [key, value] tuple to identify the winner.
   *
   * - If any atom is resolved → returns [key, value] tuple (skips errors)
   * - If all atoms have errors → throws AllAtomsRejectedError
   * - If some are loading and rest errored → throws promise that resolves to first success
   *
   * @param atoms - Object of atoms
   * @returns Tuple of [winner key, value]
   *
   * @example
   * ```ts
   * derived(({ any }) => {
   *   const [source, data] = any({ cache: cache$, api: api$ });
   *   console.log(`Data from: ${source}`);
   *   return data;
   * });
   * ```
   */
  any<T extends Record<string, Atom<any, any>>>(
    atoms: T
  ): [keyof T & string, T[keyof T] extends Atom<infer U, any> ? U : never];

  /**
   * Return the first settled atom's value (like Promise.race).
   * Object-only - returns [key, value] tuple to identify the winner.
   *
   * - If any atom is resolved → returns [key, value] tuple
   * - If any atom has error (and none resolved before it) → throws that error
   * - If all atoms are loading → throws combined promise
   *
   * @param atoms - Object of atoms
   * @returns Tuple of [winner key, value]
   *
   * @example
   * ```ts
   * derived(({ race }) => {
   *   const [source, data] = race({ fast: fast$, slow: slow$ });
   *   console.log(`Winner: ${source}`);
   *   return data;
   * });
   * ```
   */
  race<T extends Record<string, Atom<any, any>>>(
    atoms: T
  ): [keyof T & string, T[keyof T] extends Atom<infer U, any> ? U : never];

  /**
   * Get all atom statuses when all are settled (like Promise.allSettled).
   * Array-only - use destructuring for custom variable names.
   *
   * - If all atoms are settled (resolved or rejected) → returns array of statuses
   * - If any atom is loading → throws combined promise
   *
   * @param atoms - Array of atoms
   * @returns Array of settled results (same order as input)
   *
   * @example
   * ```ts
   * derived(({ settled }) => {
   *   const [userResult, postsResult] = settled([user$, posts$]);
   *   return {
   *     user: userResult.status === 'resolved' ? userResult.value : null,
   *     posts: postsResult.status === 'resolved' ? postsResult.value : [],
   *   };
   * });
   * ```
   */
  settled<const T extends readonly Atom<any, any>[]>(
    atoms: T
  ): {
    [K in keyof T]: T[K] extends Atom<infer U, any> ? SettledResult<U> : never;
  };
}

/**
 * Result type for settled operations.
 */
export type SettledResult<T> =
  | { status: "resolved"; value: T }
  | { status: "rejected"; error: unknown };

/**
 * Custom error for when all atoms in `any()` are rejected.
 */
export class AllAtomsRejectedError extends Error {
  readonly errors: Record<string, unknown>;

  constructor(errors: Record<string, unknown>, message = "All atoms rejected") {
    super(message);
    this.name = "AllAtomsRejectedError";
    this.errors = errors;
  }
}

/**
 * Selector function type for context-based API.
 */
export type ContextSelectorFn<T> = (context: SelectContext) => T;

/**
 * Legacy selector function type for array-based API.
 */
export type LegacySelectorFn<D extends readonly Atom<any, any>[], T> = (
  ...values: {
    [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
  }
) => T;

// ============================================================================
// select() - Core selection/computation function
// ============================================================================

/**
 * Selects/computes a value from atom(s) with dependency tracking.
 *
 * This is the core computation logic used by `derived()`. It:
 * 1. Creates a context with `get`, `all`, `any`, `race`, `settled` utilities
 * 2. Tracks which atoms are accessed during computation
 * 3. Returns a result with value/error/promise and dependencies
 *
 * ## Context API (Recommended)
 *
 * ```ts
 * select(({ get, all }) => {
 *   const user = get(user$);
 *   const [posts, comments] = all([posts$, comments$]);
 *   return { user, posts, comments };
 * });
 * ```
 *
 * ## Utility Forms
 *
 * | Utility | Form | Reason |
 * |---------|------|--------|
 * | `all()` | Array | Custom names via destructuring |
 * | `settled()` | Array | Custom names via destructuring |
 * | `race()` | Object | Need winner key in result |
 * | `any()` | Object | Need winner key in result |
 *
 * ## Legacy Array API (Still Supported)
 *
 * ```ts
 * select([user$, posts$], (getUser, getPosts) => ({
 *   user: getUser(),
 *   posts: getPosts(),
 * }));
 * ```
 *
 * @template T - The type of the computed value
 * @param fn - Context-based selector function
 * @returns SelectResult with value, error, promise, and dependencies
 */
export function select<T>(fn: ContextSelectorFn<T>): SelectResult<T>;

/**
 * Legacy: Single atom source with getter.
 * @deprecated Use context API: `select(({ get }) => get(atom))`
 */
export function select<D, T>(
  source: Atom<D, any>,
  fn: (source: Getter<D>) => T
): SelectResult<T>;

/**
 * Legacy: Array of atoms with positional getters.
 * @deprecated Use context API: `select(({ get }) => { get(a); get(b); })`
 */
export function select<const D extends readonly Atom<any, any>[], T>(
  source: D,
  fn: LegacySelectorFn<D, T>
): SelectResult<T>;

export function select(sourceOrFn: any, fn?: any): SelectResult<any> {
  // Detect which API is being used
  if (typeof sourceOrFn === "function" && fn === undefined) {
    // New context API: select(({ get }) => ...)
    return selectWithContext(sourceOrFn);
  } else {
    // Legacy API: select(source, fn) or select([sources], fn)
    return selectLegacy(sourceOrFn, fn);
  }
}

// ============================================================================
// Context-based implementation
// ============================================================================

function selectWithContext<T>(fn: ContextSelectorFn<T>): SelectResult<T> {
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
  const get = <T>(atom: Atom<T, any>): T => {
    // Track this atom as accessed dependency
    dependencies.add(atom);

    // stale() check is HIGHEST priority
    // If fallback mode enabled and loading/error → return value (never throw)
    if (atom.stale()) {
      return atom.value as T;
    }

    if (atom.loading) {
      throw atom; // Atom is PromiseLike, throw it
    }
    if (atom.error !== undefined) {
      throw atom.error;
    }
    return atom.value as T;
  };

  /**
   * Wait for all atoms to resolve (like Promise.all).
   * Array-only for simpler API.
   */
  const all = <const T extends readonly Atom<any, any>[]>(
    atoms: T
  ): { [K in keyof T]: T[K] extends Atom<infer U, any> ? U : never } => {
    return allArray(atoms, get) as {
      [K in keyof T]: T[K] extends Atom<infer U, any> ? U : never;
    };
  };

  /**
   * Return the first resolved atom (like Promise.any).
   * Object-only to return winner key.
   */
  const any = <T extends Record<string, Atom<any, any>>>(
    atoms: T
  ): [keyof T & string, T[keyof T] extends Atom<infer U, any> ? U : never] => {
    return anyImpl(atoms, get);
  };

  /**
   * Return the first settled atom (like Promise.race).
   * Object-only to return winner key.
   */
  const race = <T extends Record<string, Atom<any, any>>>(
    atoms: T
  ): [keyof T & string, T[keyof T] extends Atom<infer U, any> ? U : never] => {
    return raceImpl(atoms, get);
  };

  /**
   * Get all atom statuses when settled (like Promise.allSettled).
   * Array-only for simpler API.
   */
  const settled = <const T extends readonly Atom<any, any>[]>(
    atoms: T
  ): {
    [K in keyof T]: T[K] extends Atom<infer U, any> ? SettledResult<U> : never;
  } => {
    return settledArray(atoms, get) as {
      [K in keyof T]: T[K] extends Atom<infer U, any> ? SettledResult<U> : never;
    };
  };

  // Create the context
  const context: SelectContext = { get, all, any, race, settled };

  // Execute the selector function
  try {
    const result = fn(context);

    return {
      value: result,
      error: undefined,
      promise: undefined,
      dependencies,
    };
  } catch (thrown) {
    if (isPromiseLike(thrown)) {
      return {
        value: undefined,
        error: undefined,
        promise: thrown,
        dependencies,
      };
    } else {
      return {
        value: undefined,
        error: thrown,
        promise: undefined,
        dependencies,
      };
    }
  }
}

// ============================================================================
// Async utility implementations
// ============================================================================

/**
 * Helper to get atom status via get().
 */
type AtomStatus<T> =
  | { status: "resolved"; value: T }
  | { status: "rejected"; error: unknown }
  | { status: "loading"; promise: PromiseLike<unknown> };

function getAtomStatus<T>(
  atom: Atom<T, any>,
  get: <U>(a: Atom<U, any>) => U
): AtomStatus<T> {
  try {
    const value = get(atom);
    return { status: "resolved", value };
  } catch (thrown) {
    if (isPromiseLike(thrown)) {
      return { status: "loading", promise: thrown };
    }
    return { status: "rejected", error: thrown };
  }
}

function allArray<T>(
  atoms: readonly Atom<T, any>[],
  get: <U>(a: Atom<U, any>) => U
): T[] {
  if (atoms.length === 0) return [];

  const results: T[] = [];
  const loadingPromises: PromiseLike<unknown>[] = [];
  let firstError: unknown = undefined;
  let hasError = false;

  for (const atom of atoms) {
    const status = getAtomStatus(atom, get);

    if (status.status === "resolved") {
      results.push(status.value);
    } else if (status.status === "rejected") {
      if (!hasError) {
        firstError = status.error;
        hasError = true;
      }
    } else {
      loadingPromises.push(status.promise);
    }
  }

  // Errors take priority over loading
  if (hasError) {
    throw firstError;
  }

  // If any loading, throw combined promise
  if (loadingPromises.length > 0) {
    throw Promise.all(loadingPromises);
  }

  return results;
}

function anyImpl<T extends Record<string, Atom<any, any>>>(
  atoms: T,
  get: <U>(a: Atom<U, any>) => U
): [keyof T & string, T[keyof T] extends Atom<infer U, any> ? U : never] {
  const keys = Object.keys(atoms) as (keyof T & string)[];

  if (keys.length === 0) {
    throw new AllAtomsRejectedError({});
  }

  const errors: Record<string, unknown> = {};
  const loadingPromises: PromiseLike<unknown>[] = [];

  for (const key of keys) {
    const status = getAtomStatus(atoms[key], get);

    if (status.status === "resolved") {
      return [key, status.value] as [
        keyof T & string,
        T[keyof T] extends Atom<infer U, any> ? U : never
      ];
    }

    if (status.status === "rejected") {
      errors[key] = status.error;
    } else {
      loadingPromises.push(status.promise);
    }
  }

  // If some are still loading, throw combined promise
  if (loadingPromises.length > 0) {
    throw promiseAny(loadingPromises, () => new AllAtomsRejectedError(errors));
  }

  // All rejected
  throw new AllAtomsRejectedError(errors);
}

function raceImpl<T extends Record<string, Atom<any, any>>>(
  atoms: T,
  get: <U>(a: Atom<U, any>) => U
): [keyof T & string, T[keyof T] extends Atom<infer U, any> ? U : never] {
  const keys = Object.keys(atoms) as (keyof T & string)[];

  if (keys.length === 0) {
    return undefined as unknown as [
      keyof T & string,
      T[keyof T] extends Atom<infer U, any> ? U : never
    ];
  }

  const loadingPromises: PromiseLike<unknown>[] = [];

  for (const key of keys) {
    const status = getAtomStatus(atoms[key], get);

    if (status.status === "resolved") {
      return [key, status.value] as [
        keyof T & string,
        T[keyof T] extends Atom<infer U, any> ? U : never
      ];
    }

    if (status.status === "rejected") {
      throw status.error;
    }

    // Loading - collect promise
    loadingPromises.push(status.promise);
  }

  // All are loading - throw combined promise
  throw Promise.race(loadingPromises);
}

function settledArray<T>(
  atoms: readonly Atom<T, any>[],
  get: <U>(a: Atom<U, any>) => U
): SettledResult<T>[] {
  if (atoms.length === 0) return [];

  const results: SettledResult<T>[] = [];
  const loadingPromises: PromiseLike<unknown>[] = [];

  for (const atom of atoms) {
    const status = getAtomStatus(atom, get);

    if (status.status === "resolved") {
      results.push({ status: "resolved", value: status.value });
    } else if (status.status === "rejected") {
      results.push({ status: "rejected", error: status.error });
    } else {
      loadingPromises.push(status.promise);
    }
  }

  // If any loading, throw combined promise
  if (loadingPromises.length > 0) {
    throw Promise.all(loadingPromises);
  }

  return results;
}

/**
 * Polyfill for Promise.any behavior.
 */
function promiseAny<T>(
  promises: PromiseLike<T>[],
  errorFactory: () => AllAtomsRejectedError
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) {
      reject(errorFactory());
      return;
    }

    const errors: unknown[] = new Array(promises.length);
    let rejectedCount = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(resolve, (error) => {
        errors[index] = error;
        rejectedCount++;
        if (rejectedCount === promises.length) {
          reject(errorFactory());
        }
      });
    });
  });
}

// ============================================================================
// Legacy implementation (for backward compatibility)
// ============================================================================

function selectLegacy(source: any, fn: any): SelectResult<any> {
  // Track accessed dependencies during computation
  const dependencies = new Set<Atom<any>>();

  /**
   * Creates a suspense-like getter for an atom.
   */
  const createSuspenseGetter = (a: Atom<any, any>): Getter<any> => {
    return () => {
      // Track this atom as accessed dependency
      dependencies.add(a);

      // stale() check is HIGHEST priority
      if (a.stale()) {
        return a.value;
      }

      if (a.loading) {
        throw a;
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
