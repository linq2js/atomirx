import { isPromiseLike } from "./isPromiseLike";
import { getAtomState, trackPromise } from "./promiseCache";
import { Atom, AtomValue, SettledResult } from "./types";

// AggregateError polyfill for environments that don't support it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const AggregateError: any;
const AggregateErrorClass =
  typeof AggregateError !== "undefined"
    ? AggregateError
    : class AggregateErrorPolyfill extends Error {
        errors: unknown[];
        constructor(errors: unknown[], message?: string) {
          super(message);
          this.name = "AggregateError";
          this.errors = errors;
        }
      };

/**
 * Result of a select computation.
 *
 * @template T - The type of the computed value
 */
export interface SelectResult<T> {
  /** The computed value (undefined if error or loading) */
  value: T | undefined;
  /** Error thrown during computation (undefined if success or loading) */
  error: unknown;
  /** Promise thrown during computation - indicates loading state */
  promise: PromiseLike<unknown> | undefined;
  /** Set of atoms that were accessed during computation */
  dependencies: Set<Atom<unknown>>;
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
   * Suspense-like behavior using getAtomState():
   * - If ready: returns value
   * - If error: throws error
   * - If loading: throws Promise (Suspense)
   *
   * @param atom - The atom to read
   * @returns The atom's current value (Awaited<T>)
   */
  get<T>(atom: Atom<T>): Awaited<T>;

  /**
   * Wait for all atoms to resolve (like Promise.all).
   * Variadic form - pass atoms as arguments.
   *
   * - If all atoms are ready → returns array of values
   * - If any atom has error → throws that error
   * - If any atom is loading (no fallback) → throws Promise
   * - If loading with fallback → uses staleValue
   *
   * @param atoms - Atoms to wait for (variadic)
   * @returns Array of resolved values (same order as input)
   *
   * @example
   * ```ts
   * const [user, posts] = all(user$, posts$);
   * ```
   */
  all<A extends Atom<unknown>[]>(
    ...atoms: A
  ): { [K in keyof A]: AtomValue<A[K]> };

  /**
   * Return the first settled value (like Promise.race).
   * Variadic form - pass atoms as arguments.
   *
   * - If any atom is ready → returns first ready value
   * - If any atom has error → throws first error
   * - If all atoms are loading → throws first Promise
   *
   * Note: race() does NOT use fallback - it's meant for first "real" settled value.
   *
   * @param atoms - Atoms to race (variadic)
   * @returns First settled value
   */
  race<A extends Atom<unknown>[]>(...atoms: A): AtomValue<A[number]>;

  /**
   * Return the first ready value (like Promise.any).
   * Variadic form - pass atoms as arguments.
   *
   * - If any atom is ready → returns first ready value
   * - If all atoms have errors → throws AggregateError
   * - If any loading (not all errored) → throws Promise
   *
   * Note: any() does NOT use fallback - it waits for a real ready value.
   *
   * @param atoms - Atoms to check (variadic)
   * @returns First ready value
   */
  any<A extends Atom<unknown>[]>(...atoms: A): AtomValue<A[number]>;

  /**
   * Get all atom statuses when all are settled (like Promise.allSettled).
   * Variadic form - pass atoms as arguments.
   *
   * - If all atoms are settled → returns array of statuses
   * - If any atom is loading (no fallback) → throws Promise
   * - If loading with fallback → { status: "ready", value: staleValue }
   *
   * @param atoms - Atoms to check (variadic)
   * @returns Array of settled results
   */
  settled<A extends Atom<unknown>[]>(
    ...atoms: A
  ): { [K in keyof A]: SettledResult<AtomValue<A[K]>> };
}

/**
 * Selector function type for context-based API.
 */
export type ContextSelectorFn<T> = (context: SelectContext) => T;

/**
 * Custom error for when all atoms in `any()` are rejected.
 */
export class AllAtomsRejectedError extends Error {
  readonly errors: unknown[];

  constructor(errors: unknown[], message = "All atoms rejected") {
    super(message);
    this.name = "AllAtomsRejectedError";
    this.errors = errors;
  }
}

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
 * All context methods use `getAtomState()` internally.
 *
 * ## IMPORTANT: Selector Must Return Synchronous Value
 *
 * **The selector function MUST NOT return a Promise or PromiseLike value.**
 *
 * If your selector returns a Promise, it will throw an error. This is because:
 * - `select()` is designed for synchronous derivation from atoms
 * - Async atoms should be created using `atom(Promise)` directly
 * - Use `get()` to read async atoms - it handles Suspense-style loading
 *
 * ```ts
 * // ❌ WRONG - Don't return a Promise from selector
 * select(({ get }) => fetch('/api/data'));
 *
 * // ✅ CORRECT - Create async atom and read with get()
 * const data$ = atom(fetch('/api/data').then(r => r.json()));
 * select(({ get }) => get(data$)); // Suspends until resolved
 * ```
 *
 * @template T - The type of the computed value
 * @param fn - Context-based selector function (must return sync value)
 * @returns SelectResult with value, error, promise, and dependencies
 * @throws Error if selector returns a Promise or PromiseLike
 *
 * @example
 * ```ts
 * select(({ get, all }) => {
 *   const user = get(user$);
 *   const [posts, comments] = all(posts$, comments$);
 *   return { user, posts, comments };
 * });
 * ```
 */
export function select<T>(fn: ContextSelectorFn<T>): SelectResult<T> {
  // Track accessed dependencies during computation
  const dependencies = new Set<Atom<unknown>>();

  /**
   * Read atom value using getAtomState().
   * Implements the v2 get() behavior from spec.
   */
  const get = <V>(atom: Atom<V>): Awaited<V> => {
    // Track this atom as accessed dependency
    dependencies.add(atom as Atom<unknown>);

    const state = getAtomState(atom);

    switch (state.status) {
      case "ready":
        return state.value;
      case "error":
        throw state.error;
      case "loading":
        throw state.promise; // Suspense pattern
    }
  };

  /**
   * all() - like Promise.all
   */
  const all = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): { [K in keyof A]: AtomValue<A[K]> } => {
    const results: unknown[] = [];
    let loadingPromise: Promise<unknown> | null = null;

    for (const atom of atoms) {
      dependencies.add(atom);
      const state = getAtomState(atom);

      switch (state.status) {
        case "ready":
          results.push(state.value);
          break;

        case "error":
          // Any error → throw immediately
          throw state.error;

        case "loading":
          // First loading without fallback → will throw
          if (!loadingPromise) {
            loadingPromise = state.promise;
          }
          break;
      }
    }

    // If any loading without fallback → throw Promise
    if (loadingPromise) {
      throw loadingPromise;
    }

    return results as { [K in keyof A]: AtomValue<A[K]> };
  };

  /**
   * race() - like Promise.race
   */
  const race = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): AtomValue<A[number]> => {
    let firstLoadingPromise: Promise<unknown> | null = null;

    for (const atom of atoms) {
      dependencies.add(atom);

      // For race(), we need raw state without fallback handling
      const state = getAtomStateRaw(atom);

      switch (state.status) {
        case "ready":
          return state.value as AtomValue<A[number]>;

        case "error":
          throw state.error;

        case "loading":
          if (!firstLoadingPromise) {
            firstLoadingPromise = state.promise;
          }
          break;
      }
    }

    // All loading → throw first Promise
    if (firstLoadingPromise) {
      throw firstLoadingPromise;
    }

    throw new Error("race() called with no atoms");
  };

  /**
   * any() - like Promise.any
   */
  const any = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): AtomValue<A[number]> => {
    const errors: unknown[] = [];
    let firstLoadingPromise: Promise<unknown> | null = null;

    for (const atom of atoms) {
      dependencies.add(atom);

      // For any(), we need raw state without fallback handling
      const state = getAtomStateRaw(atom);

      switch (state.status) {
        case "ready":
          return state.value as AtomValue<A[number]>;

        case "error":
          errors.push(state.error);
          break;

        case "loading":
          if (!firstLoadingPromise) {
            firstLoadingPromise = state.promise;
          }
          break;
      }
    }

    // If any loading → throw Promise (might still fulfill)
    if (firstLoadingPromise) {
      throw firstLoadingPromise;
    }

    // All errored → throw AggregateError
    throw new AggregateErrorClass(errors, "All atoms rejected");
  };

  /**
   * settled() - like Promise.allSettled
   */
  const settled = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): { [K in keyof A]: SettledResult<AtomValue<A[K]>> } => {
    const results: SettledResult<unknown>[] = [];
    let pendingPromise: Promise<unknown> | null = null;

    for (const atom of atoms) {
      dependencies.add(atom);
      const state = getAtomState(atom);

      switch (state.status) {
        case "ready":
          results.push({ status: "ready", value: state.value });
          break;

        case "error":
          results.push({ status: "error", error: state.error });
          break;

        case "loading":
          // Loading without fallback → will throw
          if (!pendingPromise) {
            pendingPromise = state.promise;
          }
          break;
      }
    }

    // If any loading without fallback → throw Promise
    if (pendingPromise) {
      throw pendingPromise;
    }

    return results as { [K in keyof A]: SettledResult<AtomValue<A[K]>> };
  };

  // Create the context
  const context: SelectContext = { get, all, any, race, settled };

  // Execute the selector function
  try {
    const result = fn(context);

    // Selector must return synchronous value, not a Promise
    if (isPromiseLike(result)) {
      throw new Error(
        "select() selector must return a synchronous value, not a Promise. " +
          "For async data, create an async atom with atom(Promise) and use get() to read it."
      );
    }

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
// Internal helpers
// ============================================================================

// Note: trackPromise is already imported at the top

/**
 * Gets raw atom state WITHOUT fallback handling.
 * Used by race() and any() which need the actual loading state.
 */
function getAtomStateRaw<T>(
  atom: Atom<T>
):
  | { status: "ready"; value: Awaited<T> }
  | { status: "error"; error: unknown }
  | { status: "loading"; promise: Promise<Awaited<T>> } {
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
      // Raw - don't use fallback
      return {
        status: "loading",
        promise: state.promise as Promise<Awaited<T>>,
      };
  }
}
