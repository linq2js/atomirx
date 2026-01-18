import { onCreateHook } from "./onCreateHook";
import { emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { scheduleNotifyHook } from "./scheduleNotifyHook";
import { ReactiveSelector, select, SelectContext } from "./select";
import {
  Atom,
  AtomState,
  DerivedAtom,
  DerivedOptions,
  Equality,
  SYMBOL_ATOM,
  SYMBOL_DERIVED,
} from "./types";

/**
 * Context object passed to derived atom selector functions.
 * Provides utilities for reading atoms: `{ read, all, any, race, settled }`.
 *
 * Currently identical to `SelectContext`, but defined separately to allow
 * future derived-specific extensions without breaking changes.
 */
export interface DerivedContext extends SelectContext {}

/**
 * Creates a derived (computed) atom from source atom(s).
 *
 * Derived atoms are **read-only** and automatically recompute when their
 * source atoms change. The `.get()` method always returns a `Promise<T>`,
 * even for synchronous computations.
 *
 * ## IMPORTANT: Selector Must Return Synchronous Value
 *
 * **The selector function MUST NOT be async or return a Promise.**
 *
 * ```ts
 * // ❌ WRONG - Don't use async function
 * derived(async ({ read }) => {
 *   const data = await fetch('/api');
 *   return data;
 * });
 *
 * // ❌ WRONG - Don't return a Promise
 * derived(({ read }) => fetch('/api').then(r => r.json()));
 *
 * // ✅ CORRECT - Create async atom and read with read()
 * const data$ = atom(fetch('/api').then(r => r.json()));
 * derived(({ read }) => read(data$)); // Suspends until resolved
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
 * derived(({ read }) => {
 *   try {
 *     return read(asyncAtom$);
 *   } catch (e) {
 *     return 'fallback'; // This catches BOTH errors AND loading promises!
 *   }
 * });
 *
 * // ✅ CORRECT - Use safe() to catch errors but preserve Suspense
 * derived(({ read, safe }) => {
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
 * ## Key Features
 *
 * 1. **Always async**: `.get()` returns `Promise<T>`
 * 2. **Lazy computation**: Value is computed on first access
 * 3. **Automatic updates**: Recomputes when any source atom changes
 * 4. **Equality checking**: Only notifies if derived value changed
 * 5. **Fallback support**: Optional fallback for loading/error states
 * 6. **Suspense-like async**: `read()` throws promise if loading
 * 7. **Conditional dependencies**: Only subscribes to atoms accessed
 *
 * ## Suspense-Style read()
 *
 * The `read()` function behaves like React Suspense:
 * - If source atom is **loading**: `read()` throws the promise
 * - If source atom has **error**: `read()` throws the error
 * - If source atom has **value**: `read()` returns the value
 *
 * @template T - Derived value type
 * @template F - Whether fallback is provided
 * @param fn - Context-based derivation function (must return sync value, not Promise)
 * @param options - Optional configuration (meta, equals, fallback)
 * @returns A read-only derived atom
 * @throws Error if selector returns a Promise or PromiseLike
 *
 * @example Basic derived (no fallback)
 * ```ts
 * const count$ = atom(5);
 * const doubled$ = derived(({ read }) => read(count$) * 2);
 *
 * await doubled$.get(); // 10
 * doubled$.staleValue;  // undefined (until first resolve) -> 10
 * doubled$.state();     // { status: "ready", value: 10 }
 * ```
 *
 * @example With fallback
 * ```ts
 * const posts$ = atom(fetchPosts());
 * const count$ = derived(({ read }) => read(posts$).length, { fallback: 0 });
 *
 * count$.staleValue; // 0 (during loading) -> 42 (after resolve)
 * count$.state();    // { status: "loading", promise } during loading
 *                    // { status: "ready", value: 42 } after resolve
 * ```
 *
 * @example Async dependencies
 * ```ts
 * const user$ = atom(fetchUser());
 * const posts$ = atom(fetchPosts());
 *
 * const dashboard$ = derived(({ all }) => {
 *   const [user, posts] = all(user$, posts$);
 *   return { user, posts };
 * });
 * ```
 *
 * @example Refresh
 * ```ts
 * const data$ = derived(({ read }) => read(source$));
 * data$.refresh(); // Re-run computation
 * ```
 */

// Overload: Without fallback - staleValue is T | undefined
export function derived<T>(
  fn: ReactiveSelector<T, DerivedContext>,
  options?: DerivedOptions<T>
): DerivedAtom<T, false>;

// Overload: With fallback - staleValue is guaranteed T
export function derived<T>(
  fn: ReactiveSelector<T, DerivedContext>,
  options: DerivedOptions<T> & { fallback: T }
): DerivedAtom<T, true>;

// Implementation
export function derived<T>(
  fn: ReactiveSelector<T, DerivedContext>,
  options: DerivedOptions<T> & { fallback?: T } = {}
): DerivedAtom<T, boolean> {
  const changeEmitter = emitter();
  const eq = resolveEquality(options.equals as Equality<unknown>);

  // Fallback configuration
  const hasFallback = "fallback" in options;
  const fallbackValue = options.fallback as T;

  // State
  let lastResolved: { value: T } | undefined;
  let lastError: unknown = undefined;
  let currentPromise: Promise<T> | null = null;
  let isInitialized = false;
  let isLoading = false;
  let version = 0;

  // Track current subscriptions (atom -> unsubscribe function)
  const subscriptions = new Map<Atom<unknown>, VoidFunction>();

  /**
   * Schedules notification to all subscribers.
   */
  const notify = () => {
    changeEmitter.forEach((listener) => {
      scheduleNotifyHook.current(listener);
    });
  };

  /**
   * Updates subscriptions based on new dependencies.
   */
  const updateSubscriptions = (newDeps: Set<Atom<unknown>>) => {
    // Unsubscribe from atoms that are no longer accessed
    for (const [atom, unsubscribe] of subscriptions) {
      if (!newDeps.has(atom)) {
        unsubscribe();
        subscriptions.delete(atom);
      }
    }

    // Subscribe to newly accessed atoms
    for (const atom of newDeps) {
      if (!subscriptions.has(atom)) {
        const unsubscribe = atom.on(() => {
          compute();
        });
        subscriptions.set(atom, unsubscribe);
      }
    }
  };

  /**
   * Computes the derived value.
   * Creates a new Promise that resolves when the computation completes.
   */
  const compute = (silent = false) => {
    const computeVersion = ++version;
    isLoading = true;
    lastError = undefined; // Clear error when starting new computation

    // Create a new promise for this computation
    currentPromise = new Promise<T>((resolve, reject) => {
      // Run select to compute value and track dependencies
      const attemptCompute = () => {
        const result = select(fn);

        // Update subscriptions based on accessed deps
        updateSubscriptions(result.dependencies);

        if (result.promise) {
          // Promise thrown - wait for it and retry
          result.promise.then(
            () => {
              // Check if we're still the current computation
              if (version !== computeVersion) return;
              attemptCompute();
            },
            (error) => {
              // Check if we're still the current computation
              if (version !== computeVersion) return;
              isLoading = false;
              lastError = error;
              reject(error);
              if (!silent) notify();
            }
          );
        } else if (result.error !== undefined) {
          // Error thrown
          isLoading = false;
          lastError = result.error;
          reject(result.error);
          if (!silent) notify();
        } else {
          // Success - update lastResolved and resolve
          const newValue = result.value as T;
          isLoading = false;
          lastError = undefined;

          // Only update and notify if value changed
          if (!lastResolved || !eq(newValue, lastResolved.value)) {
            lastResolved = { value: newValue };
            if (!silent) notify();
          }

          resolve(newValue);
        }
      };

      attemptCompute();
    });

    return currentPromise;
  };

  /**
   * Initializes the derived atom.
   * Called lazily on first access.
   */
  const init = () => {
    if (isInitialized) return;
    isInitialized = true;

    // Initial computation (silent - don't notify on init)
    compute(true);
  };

  const derivedAtom: DerivedAtom<T, boolean> = {
    [SYMBOL_ATOM]: true as const,
    [SYMBOL_DERIVED]: true as const,
    meta: options.meta,

    /**
     * Get the computed value as a Promise.
     * Always returns Promise<T>, even for sync computations.
     */
    get(): Promise<T> {
      init();
      return currentPromise!;
    },

    /**
     * The stale value - fallback or last resolved value.
     * - Without fallback: T | undefined
     * - With fallback: T (guaranteed)
     */
    get staleValue(): T | undefined {
      init();
      // Return lastResolvedValue if available, otherwise fallback (if configured)
      if (lastResolved) {
        return lastResolved.value;
      }
      if (hasFallback) {
        return fallbackValue;
      }
      return undefined;
    },

    /**
     * Get the current state of the derived atom.
     * Returns the actual underlying state (loading/ready/error).
     * Use staleValue if you need fallback/cached value during loading.
     */
    state(): AtomState<T> {
      init();

      if (isLoading) {
        return { status: "loading", promise: currentPromise! };
      }

      if (lastError !== undefined) {
        return { status: "error", error: lastError };
      }

      if (lastResolved) {
        return { status: "ready", value: lastResolved.value };
      }

      // Initial state before first computation completes
      return { status: "loading", promise: currentPromise! };
    },

    /**
     * Re-run the computation.
     */
    refresh(): void {
      if (!isInitialized) {
        init();
      } else {
        compute();
      }
    },

    /**
     * Subscribe to value changes.
     */
    on(listener: VoidFunction): VoidFunction {
      init();
      return changeEmitter.on(listener);
    },
  };

  // Notify devtools/plugins of derived atom creation
  onCreateHook.current?.({
    type: "derived",
    key: options.meta?.key,
    meta: options.meta,
    atom: derivedAtom,
  });

  return derivedAtom;
}
