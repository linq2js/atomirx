import { isPromiseLike } from "./isPromiseLike";
import { getAtomState } from "./getAtomState";
import { Atom, AtomValue, Pipeable, SettledResult } from "./types";
import { withUse } from "./withUse";

/**
 * Cache for combined promises (Promise.all, Promise.race results).
 * Uses WeakMap with first promise as key, then nested Map for remaining promises.
 * This ensures stable promise references across multiple selector invocations.
 */
const combinedPromiseCache = new WeakMap<
  Promise<unknown>,
  Map<string, Promise<unknown>>
>();

/**
 * Get or create a cached combined promise.
 * @param promises - Array of promises to combine
 * @param combiner - Function to combine promises (Promise.all or Promise.race)
 * @param cacheKey - Unique key for the combination type ('all' or 'race')
 */
function getCachedCombinedPromise(
  promises: Promise<unknown>[],
  combiner: (promises: Promise<unknown>[]) => Promise<unknown>,
  cacheKey: "all" | "race"
): Promise<unknown> {
  if (promises.length === 0) {
    return combiner(promises);
  }

  const firstPromise = promises[0];
  let innerCache = combinedPromiseCache.get(firstPromise);
  if (!innerCache) {
    innerCache = new Map();
    combinedPromiseCache.set(firstPromise, innerCache);
  }

  // Create a unique key based on the promises and combination type
  // We use object identity check by storing promises in order
  const fullKey = `${cacheKey}:${promises.length}`;

  let cachedPromise = innerCache.get(fullKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = combiner(promises);
  // Attach a no-op catch handler to prevent unhandled rejection warnings
  // The actual error handling happens in the derived atom's retry mechanism
  cachedPromise.catch(() => {});
  innerCache.set(fullKey, cachedPromise);
  return cachedPromise;
}

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
 * Result type for safe() - error-first tuple.
 * Either [undefined, T] for success or [unknown, undefined] for error.
 */
export type SafeResult<T> =
  | [error: undefined, result: T]
  | [error: unknown, result: undefined];

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
}

/**
 * Selector function type for context-based API.
 */
export type ReactiveSelector<T, C extends SelectContext = SelectContext> = (
  context: C
) => T;

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
 * 1. Creates a context with `read`, `all`, `any`, `race`, `settled`, `safe` utilities
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
 * - Use `read()` to read async atoms - it handles Suspense-style loading
 *
 * ```ts
 * // ❌ WRONG - Don't return a Promise from selector
 * select(({ get }) => fetch('/api/data'));
 *
 * // ✅ CORRECT - Create async atom and read with read()
 * const data$ = atom(fetch('/api/data').then(r => r.json()));
 * select(({ read }) => read(data$)); // Suspends until resolved
 * ```
 *
 * ## IMPORTANT: Do NOT Use try/catch - Use safe() Instead
 *
 * **Never wrap `read()` calls in try/catch blocks.** The `read()` function throws
 * Promises when atoms are loading (Suspense pattern). A try/catch will catch
 * these Promises and break the Suspense mechanism.
 *
 * ```ts
 * // ❌ WRONG - Catches Suspense Promise, breaks loading state
 * select(({ read }) => {
 *   try {
 *     return read(asyncAtom$);
 *   } catch (e) {
 *     return 'fallback'; // This catches BOTH errors AND loading promises!
 *   }
 * });
 *
 * // ✅ CORRECT - Use safe() to catch errors but preserve Suspense
 * select(({ read, safe }) => {
 *   const [err, data] = safe(() => {
 *     const raw = read(asyncAtom$);    // Can throw Promise (Suspense)
 *     return JSON.parse(raw);          // Can throw Error
 *   });
 *
 *   if (err) return { error: err.message };
 *   return { data };
 * });
 * ```
 *
 * The `safe()` utility:
 * - **Catches errors** and returns `[error, undefined]`
 * - **Re-throws Promises** to preserve Suspense behavior
 * - Returns `[undefined, result]` on success
 *
 * ## IMPORTANT: SelectContext Methods Are Synchronous Only
 *
 * **All context methods (`read`, `all`, `race`, `any`, `settled`, `safe`) must be
 * called synchronously during selector execution.** They cannot be used in async
 * callbacks like `setTimeout`, `Promise.then`, or event handlers.
 *
 * ```ts
 * // ❌ WRONG - Calling read() in async callback
 * select(({ read }) => {
 *   setTimeout(() => {
 *     read(atom$); // Error: called outside selection context
 *   }, 100);
 *   return 'value';
 * });
 *
 * // ❌ WRONG - Storing read() for later use
 * let savedRead;
 * select(({ read }) => {
 *   savedRead = read; // Don't do this!
 *   return read(atom$);
 * });
 * savedRead(atom$); // Error: called outside selection context
 *
 * // ✅ CORRECT - For async access, use atom.get() directly
 * effect(({ read }) => {
 *   const config = read(config$);
 *   setTimeout(async () => {
 *     // Use atom.get() for async access
 *     const data = await asyncAtom$.get();
 *     console.log(data);
 *   }, 100);
 * });
 * ```
 *
 * @template T - The type of the computed value
 * @param fn - Context-based selector function (must return sync value)
 * @returns SelectResult with value, error, promise, and dependencies
 * @throws Error if selector returns a Promise or PromiseLike
 * @throws Error if context methods are called outside selection context
 *
 * @example
 * ```ts
 * select(({ read, all }) => {
 *   const user = read(user$);
 *   const [posts, comments] = all(posts$, comments$);
 *   return { user, posts, comments };
 * });
 * ```
 */
export function select<T>(fn: ReactiveSelector<T>): SelectResult<T> {
  // Track accessed dependencies during computation
  const dependencies = new Set<Atom<unknown>>();

  // Flag to detect calls outside selection context (e.g., in async callbacks)
  let isExecuting = true;

  /**
   * Throws an error if called outside the synchronous selection context.
   * This catches common mistakes like using get() in async callbacks.
   */
  const assertExecuting = (methodName: string) => {
    if (!isExecuting) {
      throw new Error(
        `${methodName}() was called outside of the selection context. ` +
          "This usually happens when calling context methods in async callbacks (setTimeout, Promise.then, etc.). " +
          "All atom reads must happen synchronously during selector execution. " +
          "For async access, use atom.get() directly (e.g., myMutableAtom$.get() or await myDerivedAtom$.get())."
      );
    }
  };

  /**
   * Read atom value using getAtomState().
   * Implements Suspense-like behavior.
   */
  const read = <V>(atom: Atom<V>): Awaited<V> => {
    assertExecuting("read");

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
   * Waits for ALL loading atoms in parallel, not sequentially
   */
  const all = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): { [K in keyof A]: AtomValue<A[K]> } => {
    assertExecuting("all");

    const results: unknown[] = [];
    const loadingPromises: Promise<unknown>[] = [];

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
          // Collect ALL loading promises for parallel waiting
          loadingPromises.push(state.promise!);
          break;
      }
    }

    // If any loading → throw cached combined Promise.all for parallel waiting
    if (loadingPromises.length > 0) {
      throw getCachedCombinedPromise(
        loadingPromises,
        (p) => Promise.all(p),
        "all"
      );
    }

    return results as { [K in keyof A]: AtomValue<A[K]> };
  };

  /**
   * race() - like Promise.race
   * Races all loading atoms in parallel, first to settle wins
   */
  const race = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): AtomValue<A[number]> => {
    assertExecuting("race");

    const loadingPromises: Promise<unknown>[] = [];

    for (const atom of atoms) {
      dependencies.add(atom);

      // For race(), we need raw state without fallback handling
      const state = getAtomState(atom);

      switch (state.status) {
        case "ready":
          return state.value as AtomValue<A[number]>;

        case "error":
          throw state.error;

        case "loading":
          loadingPromises.push(state.promise!);
          break;
      }
    }

    // All loading → race them (first to settle wins)
    if (loadingPromises.length > 0) {
      throw getCachedCombinedPromise(
        loadingPromises,
        (p) => Promise.race(p),
        "race"
      );
    }

    throw new Error("race() called with no atoms");
  };

  /**
   * any() - like Promise.any
   * Races all loading atoms in parallel, returns first to fulfill
   */
  const any = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): AtomValue<A[number]> => {
    assertExecuting("any");

    const errors: unknown[] = [];
    const loadingPromises: Promise<unknown>[] = [];

    for (const atom of atoms) {
      dependencies.add(atom);

      // For any(), we need raw state without fallback handling
      const state = getAtomState(atom);

      switch (state.status) {
        case "ready":
          return state.value as AtomValue<A[number]>;

        case "error":
          errors.push(state.error);
          break;

        case "loading":
          loadingPromises.push(state.promise!);
          break;
      }
    }

    // If any loading → race them all (first to resolve wins)
    if (loadingPromises.length > 0) {
      throw getCachedCombinedPromise(
        loadingPromises,
        (p) => Promise.race(p),
        "race"
      );
    }

    // All errored → throw AggregateError
    throw new AggregateErrorClass(errors, "All atoms rejected");
  };

  /**
   * settled() - like Promise.allSettled
   * Waits for ALL loading atoms in parallel
   */
  const settled = <A extends Atom<unknown>[]>(
    ...atoms: A
  ): { [K in keyof A]: SettledResult<AtomValue<A[K]>> } => {
    assertExecuting("settled");

    const results: SettledResult<unknown>[] = [];
    const loadingPromises: Promise<unknown>[] = [];

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
          // Collect ALL loading promises for parallel waiting
          loadingPromises.push(state.promise!);
          break;
      }
    }

    // If any loading → throw cached combined Promise.all for parallel waiting
    if (loadingPromises.length > 0) {
      throw getCachedCombinedPromise(
        loadingPromises,
        (p) => Promise.all(p),
        "all"
      );
    }

    return results as { [K in keyof A]: SettledResult<AtomValue<A[K]>> };
  };

  /**
   * safe() - Execute function with error handling, preserving Suspense
   */
  const safe = <T>(fn: () => T): SafeResult<T> => {
    assertExecuting("safe");

    try {
      const result = fn();
      return [undefined, result];
    } catch (e) {
      // Re-throw Promises to preserve Suspense behavior
      if (isPromiseLike(e)) {
        throw e;
      }
      // Return errors as tuple instead of throwing
      return [e, undefined];
    }
  };

  // Create the context
  const context: SelectContext = withUse({
    read,
    all,
    any,
    race,
    settled,
    safe,
  });

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
  } finally {
    // Mark execution as complete to catch async misuse
    isExecuting = false;
  }
}
