import { CreateInfo, DerivedInfo, onCreateHook } from "./onCreateHook";
import { emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { onErrorHook } from "./onErrorHook";
import { scheduleNotifyHook } from "./scheduleNotifyHook";
import {
  ReactiveSelector,
  select,
  SelectContext,
  SelectResult,
} from "./select";
import {
  Atom,
  AtomState,
  DerivedAtom,
  DerivedOptions,
  Equality,
  SYMBOL_ATOM,
  SYMBOL_DERIVED,
} from "./types";
import { withReady, WithReadySelectContext } from "./withReady";

/**
 * Internal options for derived atoms.
 * These are not part of the public API.
 * @internal
 */
export interface DerivedInternalOptions {
  /**
   * Override the error source for onErrorHook.
   * Used by effect() to attribute errors to the effect instead of the internal derived.
   */
  _errorSource?: CreateInfo;
}

/**
 * Context object passed to derived atom selector functions.
 * Provides utilities for reading atoms: `{ read, all, any, race, settled }`.
 *
 * Currently identical to `SelectContext`, but defined separately to allow
 * future derived-specific extensions without breaking changes.
 */
export interface DerivedContext extends SelectContext, WithReadySelectContext {}

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
  options?: DerivedOptions<T> & DerivedInternalOptions
): DerivedAtom<T, false>;

// Overload: With fallback - staleValue is guaranteed T
export function derived<T>(
  fn: ReactiveSelector<T, DerivedContext>,
  options: DerivedOptions<T> & { fallback: T } & DerivedInternalOptions
): DerivedAtom<T, true>;

// Implementation
export function derived<T>(
  fn: ReactiveSelector<T, DerivedContext>,
  options: DerivedOptions<T> & { fallback?: T } & DerivedInternalOptions = {}
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

  // Store resolve/reject to allow reusing the same promise across recomputations
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((error: unknown) => void) | null = null;

  // Track current subscriptions (atom -> unsubscribe function)
  const subscriptions = new Map<Atom<unknown>, VoidFunction>();
  // Pool removal subscriptions
  let poolCleanups: VoidFunction[] = [];

  // CreateInfo for this derived - stored for onErrorHook
  // Will be set after derivedAtom is created
  let createInfo: DerivedInfo;

  /**
   * Handles errors by calling both the user's onError callback and the global onErrorHook.
   */
  const handleError = (error: unknown) => {
    // Invoke user's error callback if provided
    options.onError?.(error);

    // Invoke global error hook
    // Use _errorSource if provided (for effect), otherwise use this derived's createInfo
    const source = options._errorSource ?? createInfo;
    onErrorHook.current?.({ source, error });
  };

  /**
   * Schedules notification to all subscribers.
   */
  const notify = () => {
    changeEmitter.forEach((listener) => {
      scheduleNotifyHook.current(listener);
    });
  };

  /**
   * Updates subscriptions based on new dependencies from SelectResult.
   */
  const updateSubscriptions = (result: SelectResult<T>) => {
    const newDeps = result._atomDeps;
    const newPoolDeps = result._poolDeps;

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

    // Clean up old pool removal subscriptions
    for (const cleanup of poolCleanups) {
      cleanup();
    }
    poolCleanups = [];

    // Subscribe to pool entry removals
    for (const [pool, paramsSet] of newPoolDeps) {
      for (const params of paramsSet) {
        const cleanup = pool._onRemove(params, () => {
          compute();
        });
        poolCleanups.push(cleanup);
      }
    }
  };

  /**
   * Computes the derived value.
   * Reuses the existing Promise if loading (to prevent orphaned promises
   * that React Suspense might be waiting on).
   */
  const compute = (silent = false) => {
    const computeVersion = ++version;
    isLoading = true;
    lastError = undefined; // Clear error when starting new computation

    // Create a new promise if:
    // 1. We don't have one yet, OR
    // 2. The previous computation completed (resolved/rejected) and we need a new one
    // This ensures we reuse promises while loading (for Suspense) but create fresh
    // promises for new computations after completion
    if (!resolvePromise) {
      currentPromise = new Promise<T>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      // Prevent unhandled rejection warnings - errors are accessible via:
      // 1. onError callback (if provided)
      // 2. state() returning { status: "error", error }
      // 3. .get().catch() by consumers
      currentPromise.catch(() => {});
    }

    // Async computation loop - simpler than recursive attemptCompute
    (async () => {
      while (true) {
        // Check if superseded by newer computation
        if (version !== computeVersion) return;

        const { result } = select((context) => fn(context.use(withReady())));
        updateSubscriptions(result);

        if (result.promise) {
          if (!silent) notify();
          try {
            await result.promise;
            if (version !== computeVersion) return;
            continue;
          } catch (error) {
            if (version !== computeVersion) return;
            isLoading = false;
            lastError = error;
            rejectPromise?.(error);
            resolvePromise = null;
            rejectPromise = null;
            handleError(error);
            notify();
            return;
          }
        }

        if (result.error !== undefined) {
          isLoading = false;
          lastError = result.error;
          rejectPromise?.(result.error);
          resolvePromise = null;
          rejectPromise = null;
          handleError(result.error);
          if (!silent) notify();
          return;
        }

        // Success
        const newValue = result.value as T;
        const wasFirstResolve = !lastResolved;
        isLoading = false;
        lastError = undefined;

        if (!lastResolved || !eq(newValue, lastResolved.value)) {
          lastResolved = { value: newValue };
          if (wasFirstResolve || !silent) notify();
        }

        resolvePromise?.(newValue);
        resolvePromise = null;
        rejectPromise = null;
        return;
      }
    })();

    return currentPromise!;
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

  // Store createInfo for use in onErrorHook
  createInfo = {
    type: "derived",
    key: options.meta?.key,
    meta: options.meta,
    instance: derivedAtom,
  };

  // Notify devtools/plugins of derived atom creation
  onCreateHook.current?.(createInfo);

  return derivedAtom;
}
