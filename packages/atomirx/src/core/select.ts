import { isPromiseLike } from "./isPromiseLike";
import { getAtomState } from "./getAtomState";
import { createCombinedPromise } from "./promiseCache";
import { isAtom } from "./isAtom";
import {
  Atom,
  AtomValue,
  KeyedResult,
  MutableAtom,
  Pipeable,
  Pool,
  ScopedAtom,
  SelectStateResult,
  SettledResult,
  SYMBOL_ATOM,
  SYMBOL_POOL,
  SYMBOL_SCOPED,
} from "./types";
import { withUse } from "./withUse";

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
  /**
   * Set of atoms that were accessed during computation.
   * @deprecated Use _atomDeps instead. Kept for backward compatibility.
   */
  dependencies: Set<Atom<unknown>>;
  /**
   * Set of atoms that were accessed during computation.
   * @internal
   */
  _atomDeps: Set<Atom<unknown>>;
  /**
   * Map of pools to their accessed params.
   * @internal
   */
  _poolDeps: Map<Pool<any, any>, Set<any>>;
}

/**
 * Result type for safe() - error-first tuple.
 * Either [undefined, T] for success or [unknown, undefined] for error.
 */
export type SafeResult<T> =
  | [error: undefined, result: T]
  | [error: unknown, result: undefined];

/**
 * Condition input type for and()/or() operators.
 *
 * Supports three forms:
 * - `boolean` - Static value, no subscription
 * - `Atom<unknown>` - Always read and subscribed
 * - `() => boolean | Atom<unknown>` - Lazy evaluation, only called if needed
 */
export type Condition =
  | boolean
  | Atom<unknown>
  | (() => boolean | Atom<unknown>);

/**
 * Context object passed to selector functions.
 * Provides utilities for reading atoms and handling async operations.
 */
export interface SelectContext extends Pipeable {
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
  read<T>(atom: Atom<T>): Awaited<T>;

  /**
   * Get a ScopedAtom from a pool for the given params.
   * The ScopedAtom is only valid during this select() execution.
   *
   * When the pool entry is removed (GC or manual), the computation
   * will automatically re-run to get the new atom.
   *
   * @param pool - The pool to get atom from
   * @param params - The params to look up
   * @returns A ScopedAtom wrapping the pool entry's atom
   *
   * @example
   * ```ts
   * derived(({ read, from }) => {
   *   const user$ = from(userPool, "user-1");
   *   return read(user$);
   * });
   * ```
   */
  from<P, T>(pool: Pool<P, T>, params: P): ScopedAtom<T>;

  /**
   * Track an atom as a dependency without reading its value.
   * Useful when you need to subscribe to changes but already have the value.
   *
   * @param atom - The atom to track (can be ScopedAtom)
   */
  track(atom: Atom<unknown>): void;

  /**
   * Wait for all atoms to resolve (like Promise.all).
   * Array-based - pass atoms as an array.
   *
   * - If all atoms are ready → returns array of values
   * - If any atom has error → throws that error
   * - If any atom is loading (no fallback) → throws Promise
   * - If loading with fallback → uses staleValue
   *
   * @param atoms - Array of atoms to wait for
   * @returns Array of resolved values (same order as input)
   *
   * @example
   * ```ts
   * const [user, posts] = all([user$, posts$]);
   * ```
   */
  all<A extends Atom<unknown>[]>(atoms: A): { [K in keyof A]: AtomValue<A[K]> };

  /**
   * Return the first settled value (like Promise.race).
   * Object-based - pass atoms as a record with keys.
   *
   * - If any atom is ready → returns `{ key, value }` for first ready
   * - If any atom has error → throws first error
   * - If all atoms are loading → throws first Promise
   *
   * The `key` in the result identifies which atom won the race.
   *
   * Note: race() does NOT use fallback - it's meant for first "real" settled value.
   *
   * @param atoms - Record of atoms to race
   * @returns KeyedResult with winning key and value
   *
   * @example
   * ```ts
   * const result = race({ cache: cache$, api: api$ });
   * console.log(result.key);   // "cache" or "api"
   * console.log(result.value); // The winning value
   * ```
   */
  race<T extends Record<string, Atom<unknown>>>(
    atoms: T
  ): KeyedResult<keyof T & string, AtomValue<T[keyof T]>>;

  /**
   * Return the first ready value (like Promise.any).
   * Object-based - pass atoms as a record with keys.
   *
   * - If any atom is ready → returns `{ key, value }` for first ready
   * - If all atoms have errors → throws AggregateError
   * - If any loading (not all errored) → throws Promise
   *
   * The `key` in the result identifies which atom resolved first.
   *
   * Note: any() does NOT use fallback - it waits for a real ready value.
   *
   * @param atoms - Record of atoms to check
   * @returns KeyedResult with winning key and value
   *
   * @example
   * ```ts
   * const result = any({ primary: primaryApi$, fallback: fallbackApi$ });
   * console.log(result.key);   // "primary" or "fallback"
   * console.log(result.value); // The winning value
   * ```
   */
  any<T extends Record<string, Atom<unknown>>>(
    atoms: T
  ): KeyedResult<keyof T & string, AtomValue<T[keyof T]>>;

  /**
   * Get all atom statuses when all are settled (like Promise.allSettled).
   * Array-based - pass atoms as an array.
   *
   * - If all atoms are settled → returns array of statuses
   * - If any atom is loading (no fallback) → throws Promise
   * - If loading with fallback → { status: "ready", value: staleValue }
   *
   * @param atoms - Array of atoms to check
   * @returns Array of settled results
   *
   * @example
   * ```ts
   * const [userResult, postsResult] = settled([user$, posts$]);
   * ```
   */
  settled<A extends Atom<unknown>[]>(
    atoms: A
  ): { [K in keyof A]: SettledResult<AtomValue<A[K]>> };

  /**
   * Safely execute a function, catching errors but preserving Suspense.
   *
   * - If function succeeds → returns [undefined, result]
   * - If function throws Error → returns [error, undefined]
   * - If function throws Promise → re-throws (preserves Suspense)
   *
   * Use this when you need error handling inside selectors without
   * accidentally catching Suspense promises.
   *
   * @param fn - Function to execute safely
   * @returns Error-first tuple: [error, result]
   *
   * @example
   * ```ts
   * const data$ = derived(({ get, safe }) => {
   *   const [err, data] = safe(() => {
   *     const raw = get(raw$);
   *     return JSON.parse(raw); // Can throw SyntaxError
   *   });
   *
   *   if (err) {
   *     return { error: err.message };
   *   }
   *   return { data };
   * });
   * ```
   */
  safe<T>(fn: () => T): SafeResult<T>;

  /**
   * Get the async state of an atom or selector without throwing.
   *
   * Unlike `read()` which throws promises/errors (Suspense pattern),
   * `state()` always returns a `SelectStateResult<T>` object that you can
   * inspect and handle inline.
   *
   * All properties (`status`, `value`, `error`) are always present,
   * enabling easy destructuring:
   * ```ts
   * const { status, value, error } = state(atom$);
   * ```
   *
   * @param atom - The atom to get state from
   * @returns SelectStateResult with status, value, error (no promise - for equality)
   *
   * @example
   * ```ts
   * // Get state of single atom
   * const dashboard$ = derived(({ state }) => {
   *   const userState = state(user$);
   *   const postsState = state(posts$);
   *
   *   return {
   *     user: userState.value, // undefined if not ready
   *     isLoading: userState.status === 'loading' || postsState.status === 'loading',
   *   };
   * });
   * ```
   */
  state<T>(atom: Atom<T>): SelectStateResult<Awaited<T>>;

  /**
   * Get the async state of a selector function without throwing.
   *
   * Wraps the selector in try/catch and returns the result as a
   * `SelectStateResult<T>` object. Useful for getting state of combined
   * operations like `all()`, `race()`, etc.
   *
   * @param selector - Function that may throw promises or errors
   * @returns SelectStateResult with status, value, error (no promise - for equality)
   *
   * @example
   * ```ts
   * // Get state of combined operation
   * const allData$ = derived(({ state, all }) => {
   *   const result = state(() => all(a$, b$, c$));
   *
   *   if (result.status === 'loading') return { loading: true };
   *   if (result.status === 'error') return { error: result.error };
   *   return { data: result.value };
   * });
   * ```
   */
  state<T>(selector: () => T): SelectStateResult<T>;

  /**
   * Logical AND - returns true if ALL conditions are truthy.
   * Short-circuits on first falsy value (lazy conditions after that are not evaluated).
   *
   * ## Condition Types
   *
   * - `boolean` - Static value, no subscription
   * - `Atom<T>` - Always read and subscribed
   * - `() => boolean | Atom<T>` - Lazy, only called if previous conditions are truthy
   *
   * ## Evaluation Flow
   *
   * ```
   * and([a, b, () => c, () => d])
   *      │
   *      ▼
   *   a truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   b truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   call () => c
   *   c truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   call () => d
   *   d truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   return true
   * ```
   *
   * @param conditions - Array of conditions (booleans, atoms, or lazy functions)
   * @returns true if all conditions are truthy, false otherwise
   *
   * @example
   * ```ts
   * // Simple: all atoms must be truthy
   * const canAccess = and([isLoggedIn$, hasPermission$]);
   *
   * // With static value
   * const canEdit = and([FEATURE_ENABLED, isLoggedIn$, hasEditRole$]);
   *
   * // With lazy evaluation (only check permission if logged in)
   * const canDelete = and([
   *   isLoggedIn$,
   *   () => hasDeletePermission$,  // Only read if logged in
   * ]);
   *
   * // Nested: (A && B) || C
   * const result = or([and([a$, b$]), c$]);
   * ```
   */
  and(conditions: Condition[]): boolean;

  /**
   * Logical OR - returns true if ANY condition is truthy.
   * Short-circuits on first truthy value (lazy conditions after that are not evaluated).
   *
   * ## Condition Types
   *
   * - `boolean` - Static value, no subscription
   * - `Atom<T>` - Always read and subscribed
   * - `() => boolean | Atom<T>` - Lazy, only called if previous conditions are falsy
   *
   * ## Evaluation Flow
   *
   * ```
   * or([a, b, () => c, () => d])
   *     │
   *     ▼
   *  a truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  b truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  call () => c
   *  c truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  call () => d
   *  d truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  return false
   * ```
   *
   * @param conditions - Array of conditions (booleans, atoms, or lazy functions)
   * @returns true if any condition is truthy, false otherwise
   *
   * @example
   * ```ts
   * // Simple: any atom truthy
   * const hasData = or([cacheData$, apiData$]);
   *
   * // With lazy fallback chain
   * const data = or([
   *   () => primaryData$,   // Try primary first
   *   () => fallbackData$,  // Only if primary is falsy
   * ]);
   *
   * // Nested: A || (B && C)
   * const result = or([a$, and([b$, c$])]);
   * ```
   */
  or(conditions: Condition[]): boolean;

  /**
   * Read atoms or execute functions without tracking dependencies.
   * Useful when you need to read a value but don't want to re-compute when it changes.
   *
   * Supports two forms:
   * - `untrack(atom$)` - Read atom value without tracking
   * - `untrack(() => expr)` - Execute function without tracking any reads inside
   *
   * ## Flow Diagram
   *
   * ```
   * untrack(input)
   *       │
   *       ▼
   *   Is input an Atom?
   *       │
   *   ┌───┴───┐
   *   │Yes    │No (function)
   *   ▼       ▼
   *  Read    Set isUntracking = true
   *  without  │
   *  tracking ▼
   *   │      Execute fn()
   *   │       │
   *   │       ▼
   *   │      Set isUntracking = false
   *   │       │
   *   └───────┴──→ Return value
   * ```
   *
   * @param atom - Atom to read without tracking
   * @returns The atom's current value
   *
   * @example
   * ```ts
   * const combined$ = derived(({ read, untrack }) => {
   *   const count = read(count$);           // Tracks count$
   *   const doubled = untrack(doubled$);    // Does NOT track doubled$
   *   return count + doubled;
   * });
   * ```
   */
  untrack<T>(atom: Atom<T>): Awaited<T>;

  /**
   * Execute a function without tracking any atom reads inside.
   *
   * @param fn - Function to execute without tracking
   * @returns The function's return value
   *
   * @example
   * ```ts
   * const combined$ = derived(({ read, untrack }) => {
   *   const count = read(count$);           // Tracks count$
   *   const tripled = untrack(() => {
   *     // None of these reads are tracked
   *     return read(a$) + read(b$) + read(c$);
   *   });
   *   return count + tripled;
   * });
   * ```
   */
  untrack<T>(fn: () => T): T;
}

/**
 * Selector function type for context-based API.
 */
export type ReactiveSelector<T, C extends SelectContext = SelectContext> = (
  context: C
) => T;

/**
 * Output of select() - includes result and startTracking function.
 */
export interface SelectOutput<T> {
  /** The computation result */
  result: SelectResult<T>;
  /**
   * Start tracking dependencies and subscribe to changes.
   * Call this after computation to set up subscriptions.
   *
   * @param onNotify - Callback to invoke when any dependency changes
   * @returns Cleanup function to unsubscribe all
   */
  startTracking(onNotify: VoidFunction): VoidFunction;
}

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
// ScopedAtom - Temporary wrapper for pool atoms
// ============================================================================

/**
 * Creates a ScopedAtom that wraps a real atom from a pool.
 * ScopedAtom is only valid during select() execution.
 *
 * ## Design Philosophy
 *
 * ScopedAtom intentionally restricts direct access to atom properties.
 * Users must use `read(virtualAtom)` instead of `virtualAtom.get()`.
 *
 * This enforces the pool pattern where atoms are never stored in variables
 * or accessed outside the select context, preventing orphan atom references.
 *
 * ```
 * ❌ const value = virtualAtom.get();     // Throws error
 * ✅ const value = read(virtualAtom);     // Correct - uses select context
 *
 * ❌ virtualAtom.on(() => { ... });       // Throws error
 * ✅ derived(({ read, from }) => {        // Correct - reactive via derived
 *      const atom = from(pool, params);
 *      return read(atom);
 *    });
 * ```
 */
function createScopedAtom<T>(realAtom: MutableAtom<T>): ScopedAtom<T> {
  let atom: MutableAtom<T> | undefined = realAtom;

  const throwDirectAccessError = (methodName: string): never => {
    throw new Error(
      `ScopedAtom.${methodName}() is not allowed. ` +
        "ScopedAtom cannot be accessed directly - use read(virtualAtom) in select context instead. " +
        "This prevents orphan atom references and ensures proper reactive tracking."
    );
  };

  const assertNotDisposed = (): MutableAtom<T> => {
    if (!atom) {
      throw new Error(
        "ScopedAtom._getAtom() was called after disposal. " +
          "ScopedAtoms are only valid during select() execution. " +
          "Always use from(pool, params) inside the computation, not outside."
      );
    }
    return atom;
  };

  const virtual: ScopedAtom<T> = {
    [SYMBOL_ATOM]: true as const,
    [SYMBOL_SCOPED]: true as const,

    get meta() {
      return throwDirectAccessError("meta");
    },

    get(): T {
      return throwDirectAccessError("get");
    },

    on(_listener: VoidFunction): VoidFunction {
      return throwDirectAccessError("on");
    },

    _getAtom(): MutableAtom<T> {
      return assertNotDisposed();
    },

    _dispose(): void {
      atom = undefined;
    },
  };

  return virtual;
}

/**
 * Type guard to check if a value is a ScopedAtom.
 */
export function isScopedAtom<T = unknown>(
  value: unknown
): value is ScopedAtom<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_SCOPED in value &&
    (value as ScopedAtom<T>)[SYMBOL_SCOPED] === true
  );
}

/**
 * Type guard to check if a value is a Pool.
 */
export function isPool<P = unknown, T = unknown>(
  value: unknown
): value is Pool<P, T> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_POOL in value &&
    (value as Pool<P, T>)[SYMBOL_POOL] === true
  );
}

// ============================================================================
// select() - Core selection/computation function
// ============================================================================

/**
 * Selects/computes a value from atom(s) with dependency tracking.
 *
 * This is the core computation logic used by `derived()`. It:
 * 1. Creates a context with `read`, `from`, `all`, `any`, `race`, `settled`, `safe` utilities
 * 2. Tracks which atoms and pools are accessed during computation
 * 3. Returns a result with value/error/promise and a startTracking function
 *
 * ## New API
 *
 * ```ts
 * const { result, startTracking } = select(fn, prevResult);
 * const cleanup = startTracking(onNotify);
 * ```
 *
 * The `startTracking` function sets up subscriptions to all dependencies
 * (atoms and pool entries) and returns a cleanup function.
 *
 * ## Pool Support via from()
 *
 * Use `from(pool, params)` to get a ScopedAtom from a pool:
 * ```ts
 * const { result } = select(({ read, from }) => {
 *   const user$ = from(userPool, "user-1");
 *   return read(user$);
 * });
 * ```
 *
 * ScopedAtoms are automatically disposed after select() completes,
 * preventing memory leaks from stale atom references.
 *
 * ## IMPORTANT: Selector Must Return Synchronous Value
 *
 * **The selector function MUST NOT return a Promise or PromiseLike value.**
 *
 * ## IMPORTANT: Do NOT Use try/catch - Use safe() Instead
 *
 * **Never wrap `read()` calls in try/catch blocks.** Use `safe()` instead.
 *
 * @template T - The type of the computed value
 * @param fn - Context-based selector function (must return sync value)
 * @param prevResult - Previous result for diff-based subscription updates
 * @returns SelectOutput with result and startTracking function
 *
 * @example
 * ```ts
 * // Basic usage
 * const { result, startTracking } = select(({ read }) => {
 *   return read(count$) * 2;
 * }, null);
 *
 * // With pool
 * const { result, startTracking } = select(({ read, from }) => {
 *   const user$ = from(userPool, userId);
 *   return read(user$);
 * }, prevResult);
 *
 * // Start tracking dependencies
 * const cleanup = startTracking(() => recompute());
 * ```
 */
export function select<T>(
  fn: ReactiveSelector<T>,
  _prevResult: SelectResult<T> | null = null
): SelectOutput<T> {
  // Track accessed dependencies during computation
  const atomDeps = new Set<Atom<unknown>>();
  const poolDeps = new Map<Pool<unknown, unknown>, Set<unknown>>();

  // Map of real atoms to their ScopedAtom wrappers (for reuse within same computation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const virtualAtoms = new Map<Atom<any>, ScopedAtom<any>>();

  // Flag to detect calls outside selection context (e.g., in async callbacks)
  let isSelecting = true;

  // Flag to disable dependency tracking during untrack() execution
  let isUntracking = false;

  /**
   * Throws an error if called outside the synchronous selection context.
   */
  const assertSelecting = (methodName: string) => {
    if (!isSelecting) {
      throw new Error(
        `${methodName}() was called outside of the selection context. ` +
          "This usually happens when calling context methods in async callbacks (setTimeout, Promise.then, etc.). " +
          "All atom reads must happen synchronously during selector execution. " +
          "For async access, use atom.get() directly."
      );
    }
  };

  /**
   * Track an atom as a dependency (unwraps ScopedAtom if needed).
   * Skips tracking if inside an untrack() block.
   */
  const track = (atom: Atom<unknown>): void => {
    assertSelecting("track");
    // Skip tracking when inside untrack() block
    if (isUntracking) return;

    if (isScopedAtom(atom)) {
      atomDeps.add(atom._getAtom());
    } else {
      atomDeps.add(atom);
    }
  };

  /**
   * Get a ScopedAtom from a pool.
   */
  const from = <P, V>(pool: Pool<P, V>, params: P): ScopedAtom<V> => {
    assertSelecting("from");

    // Track pool dependency
    if (!poolDeps.has(pool as Pool<unknown, unknown>)) {
      poolDeps.set(pool as Pool<unknown, unknown>, new Set());
    }
    poolDeps.get(pool as Pool<unknown, unknown>)!.add(params);

    // Get the real atom from pool
    const realAtom = pool._getAtom(params);

    // Reuse existing ScopedAtom for same underlying atom
    if (virtualAtoms.has(realAtom)) {
      return virtualAtoms.get(realAtom) as ScopedAtom<V>;
    }

    // Create new ScopedAtom
    const virtual = createScopedAtom(realAtom);
    virtualAtoms.set(realAtom, virtual);
    return virtual;
  };

  /**
   * Read atom value using getAtomState().
   * Implements Suspense-like behavior.
   */
  const read = <V>(atom: Atom<V>): Awaited<V> => {
    assertSelecting("read");

    // Track dependency (unwrap ScopedAtom)
    track(atom as Atom<unknown>);

    // Get the real atom for state access
    const realAtom = isScopedAtom(atom) ? atom._getAtom() : atom;
    const state = getAtomState(realAtom);

    switch (state.status) {
      case "ready":
        return state.value as Awaited<V>;
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
    atoms: A
  ): { [K in keyof A]: AtomValue<A[K]> } => {
    assertSelecting("all");

    const results: unknown[] = [];
    const loadingPromises: Promise<unknown>[] = [];

    for (const atom of atoms) {
      track(atom);
      const realAtom = isScopedAtom(atom) ? atom._getAtom() : atom;
      const state = getAtomState(realAtom);

      switch (state.status) {
        case "ready":
          results.push(state.value);
          break;
        case "error":
          throw state.error;
        case "loading":
          loadingPromises.push(state.promise!);
          break;
      }
    }

    if (loadingPromises.length > 0) {
      throw createCombinedPromise("all", loadingPromises);
    }

    return results as { [K in keyof A]: AtomValue<A[K]> };
  };

  /**
   * race() - like Promise.race
   */
  const race = <R extends Record<string, Atom<unknown>>>(
    atoms: R
  ): KeyedResult<keyof R & string, AtomValue<R[keyof R]>> => {
    assertSelecting("race");

    const loadingPromises: Promise<unknown>[] = [];
    const entries = Object.entries(atoms);

    for (const [key, atom] of entries) {
      track(atom);
      const realAtom = isScopedAtom(atom) ? atom._getAtom() : atom;
      const state = getAtomState(realAtom);

      switch (state.status) {
        case "ready":
          return {
            key: key as keyof R & string,
            value: state.value as AtomValue<R[keyof R]>,
          };
        case "error":
          throw state.error;
        case "loading":
          loadingPromises.push(state.promise!);
          break;
      }
    }

    if (loadingPromises.length > 0) {
      throw createCombinedPromise("race", loadingPromises);
    }

    throw new Error("race() called with no atoms");
  };

  /**
   * any() - like Promise.any
   */
  const any = <R extends Record<string, Atom<unknown>>>(
    atoms: R
  ): KeyedResult<keyof R & string, AtomValue<R[keyof R]>> => {
    assertSelecting("any");

    const errors: unknown[] = [];
    const loadingPromises: Promise<unknown>[] = [];
    const entries = Object.entries(atoms);

    for (const [key, atom] of entries) {
      track(atom);
      const realAtom = isScopedAtom(atom) ? atom._getAtom() : atom;
      const state = getAtomState(realAtom);

      switch (state.status) {
        case "ready":
          return {
            key: key as keyof R & string,
            value: state.value as AtomValue<R[keyof R]>,
          };
        case "error":
          errors.push(state.error);
          break;
        case "loading":
          loadingPromises.push(state.promise!);
          break;
      }
    }

    if (loadingPromises.length > 0) {
      throw createCombinedPromise("race", loadingPromises);
    }

    throw new AggregateErrorClass(errors, "All atoms rejected");
  };

  /**
   * settled() - like Promise.allSettled
   */
  const settled = <A extends Atom<unknown>[]>(
    atoms: A
  ): { [K in keyof A]: SettledResult<AtomValue<A[K]>> } => {
    assertSelecting("settled");

    const results: SettledResult<unknown>[] = [];
    const loadingPromises: Promise<unknown>[] = [];

    for (const atom of atoms) {
      track(atom);
      const realAtom = isScopedAtom(atom) ? atom._getAtom() : atom;
      const state = getAtomState(realAtom);

      switch (state.status) {
        case "ready":
          results.push({ status: "ready", value: state.value });
          break;
        case "error":
          results.push({ status: "error", error: state.error });
          break;
        case "loading":
          loadingPromises.push(state.promise!);
          break;
      }
    }

    if (loadingPromises.length > 0) {
      throw createCombinedPromise("allSettled", loadingPromises);
    }

    return results as { [K in keyof A]: SettledResult<AtomValue<A[K]>> };
  };

  /**
   * safe() - Execute function with error handling, preserving Suspense
   */
  const safe = <S>(safeFn: () => S): SafeResult<S> => {
    assertSelecting("safe");

    try {
      const result = safeFn();
      return [undefined, result];
    } catch (e) {
      if (isPromiseLike(e)) {
        throw e;
      }
      return [e, undefined];
    }
  };

  /**
   * state() - Get async state without throwing
   */
  function state<S>(atom: Atom<S>): SelectStateResult<Awaited<S>>;
  function state<S>(selector: () => S): SelectStateResult<S>;
  function state<S>(
    atomOrSelector: Atom<S> | (() => S)
  ): SelectStateResult<Awaited<S>> | SelectStateResult<S> {
    assertSelecting("state");

    if (isAtom(atomOrSelector)) {
      track(atomOrSelector as Atom<unknown>);
      const realAtom = isScopedAtom(atomOrSelector)
        ? atomOrSelector._getAtom()
        : atomOrSelector;
      const atomState = getAtomState(realAtom);

      switch (atomState.status) {
        case "ready":
          return {
            status: "ready",
            value: atomState.value,
            error: undefined,
          } as SelectStateResult<Awaited<S>>;
        case "error":
          return {
            status: "error",
            value: undefined,
            error: atomState.error,
          } as SelectStateResult<Awaited<S>>;
        case "loading":
          return {
            status: "loading",
            value: undefined,
            error: undefined,
          } as SelectStateResult<Awaited<S>>;
      }
    }

    try {
      const value = atomOrSelector();
      return {
        status: "ready",
        value,
        error: undefined,
      } as SelectStateResult<S>;
    } catch (e) {
      if (isPromiseLike(e)) {
        return {
          status: "loading",
          value: undefined,
          error: undefined,
        } as SelectStateResult<S>;
      }
      return {
        status: "error",
        value: undefined,
        error: e,
      } as SelectStateResult<S>;
    }
  }

  /**
   * Evaluates a single condition and returns its boolean value.
   * Handles boolean, atom, and lazy function inputs.
   *
   * @param cond - The condition to evaluate
   * @returns The boolean value of the condition
   */
  const evaluateCondition = (cond: Condition): boolean => {
    if (typeof cond === "boolean") {
      return cond;
    }

    if (typeof cond === "function") {
      const result = cond();
      if (typeof result === "boolean") {
        return result;
      }
      // It's an atom returned from the function
      return Boolean(read(result));
    }

    // It's an atom
    return Boolean(read(cond));
  };

  /**
   * and() - Logical AND with short-circuit evaluation
   *
   * ## Evaluation Flow
   *
   * ```
   * and([a, b, () => c])
   *      │
   *      ▼
   *   a truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   b truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   call () => c
   *   c truthy? ─No──→ return false
   *      │Yes
   *      ▼
   *   return true
   * ```
   */
  const and = (conditions: Condition[]): boolean => {
    assertSelecting("and");

    for (const cond of conditions) {
      if (!evaluateCondition(cond)) {
        return false;
      }
    }
    return true;
  };

  /**
   * or() - Logical OR with short-circuit evaluation
   *
   * ## Evaluation Flow
   *
   * ```
   * or([a, b, () => c])
   *     │
   *     ▼
   *  a truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  b truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  call () => c
   *  c truthy? ─Yes─→ return true
   *     │No
   *     ▼
   *  return false
   * ```
   */
  const or = (conditions: Condition[]): boolean => {
    assertSelecting("or");

    for (const cond of conditions) {
      if (evaluateCondition(cond)) {
        return true;
      }
    }
    return false;
  };

  /**
   * untrack() - Read atoms or execute functions without tracking dependencies.
   *
   * ## Flow Diagram
   *
   * ```
   * untrack(input)
   *       │
   *       ▼
   *   Is input an Atom?
   *       │
   *   ┌───┴───┐
   *   │Yes    │No (function)
   *   ▼       ▼
   *  Read    Set isUntracking = true
   *  without  │
   *  tracking ▼
   *   │      Execute fn()
   *   │       │
   *   │       ▼
   *   │      Set isUntracking = false
   *   │       │
   *   └───────┴──→ Return value
   * ```
   */
  function untrack<U>(atom: Atom<U>): Awaited<U>;
  function untrack<U>(fn: () => U): U;
  function untrack<U>(atomOrFn: Atom<U> | (() => U)): Awaited<U> | U {
    assertSelecting("untrack");

    if (isAtom(atomOrFn)) {
      // For atom: read value without tracking (don't call track())
      const realAtom = isScopedAtom(atomOrFn) ? atomOrFn._getAtom() : atomOrFn;
      const state = getAtomState(realAtom);

      switch (state.status) {
        case "ready":
          return state.value as Awaited<U>;
        case "error":
          throw state.error;
        case "loading":
          throw state.promise; // Suspense pattern
      }
    }

    // For function: execute with tracking disabled
    const previousUntracking = isUntracking;
    isUntracking = true;
    try {
      return atomOrFn();
    } finally {
      isUntracking = previousUntracking;
    }
  }

  // Create the context
  const context: SelectContext = withUse({
    read,
    from,
    track,
    all,
    any,
    race,
    settled,
    safe,
    state,
    and,
    or,
    untrack,
  });

  // Execute the selector function and build result
  let result: SelectResult<T>;

  try {
    const value = fn(context);

    if (isPromiseLike(value)) {
      throw new Error(
        "select() selector must return a synchronous value, not a Promise. " +
          "For async data, create an async atom with atom(Promise) and use read() to read it."
      );
    }

    result = {
      value,
      error: undefined,
      promise: undefined,
      dependencies: atomDeps, // Backward compatibility
      _atomDeps: atomDeps,
      _poolDeps: poolDeps,
    };
  } catch (thrown) {
    if (isPromiseLike(thrown)) {
      result = {
        value: undefined,
        error: undefined,
        promise: thrown,
        dependencies: atomDeps,
        _atomDeps: atomDeps,
        _poolDeps: poolDeps,
      };
    } else {
      result = {
        value: undefined,
        error: thrown,
        promise: undefined,
        dependencies: atomDeps,
        _atomDeps: atomDeps,
        _poolDeps: poolDeps,
      };
    }
  } finally {
    // Mark execution as complete
    isSelecting = false;

    // Dispose all ScopedAtoms
    for (const virtual of virtualAtoms.values()) {
      virtual._dispose();
    }
    virtualAtoms.clear();
  }

  /**
   * Start tracking dependencies.
   * Sets up subscriptions to all atom and pool dependencies.
   *
   * Note: This subscribes to ALL current dependencies.
   * Diff-based optimization (unsubscribing removed deps) should be handled
   * by the consumer (e.g., derived.ts) if needed.
   */
  const startTracking = (onNotify: VoidFunction): VoidFunction => {
    const subscriptions: VoidFunction[] = [];

    // Subscribe to all atom changes
    for (const atom of atomDeps) {
      subscriptions.push(atom.on(onNotify));
    }

    // Subscribe to pool entry removals
    for (const [pool, paramsSet] of poolDeps) {
      for (const params of paramsSet) {
        subscriptions.push(pool._onRemove(params, onNotify));
      }
    }

    // Return cleanup function
    return () => {
      for (const unsub of subscriptions) {
        unsub();
      }
    };
  };

  return { result, startTracking };
}
