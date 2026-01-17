import { onCreateHook } from "./onCreateHook";
import { atomState } from "./atomState";
import { select, ContextSelectorFn } from "./select";
import { AnyFunc, Atom, DerivedOptions, Getter, SYMBOL_ATOM } from "./types";

/**
 * Helper to check if a value is a function.
 */
const isFunction = (value: unknown): value is AnyFunc =>
  typeof value === "function";

/**
 * Creates a derived (computed) atom from source atom(s).
 *
 * Derived atoms are **read-only** and automatically recompute when their
 * source atoms change. They provide a way to compute values from other atoms
 * without manual subscription management.
 *
 * ## Context API (Recommended)
 *
 * The context API provides `get()` and async utilities directly:
 *
 * ```ts
 * const doubled = derived(({ get }) => get(count) * 2);
 *
 * const fullName = derived(({ get }) =>
 *   `${get(firstName)} ${get(lastName)}`
 * );
 * ```
 *
 * ## Legacy Array API
 *
 * The array-based API is still supported:
 *
 * 1. **Single source**: `derived(atom, (get) => get() * 2)`
 * 2. **Array of atoms**: `derived([a, b], (getA, getB) => getA() + getB())`
 *
 * ## Key Features
 *
 * 1. **Lazy computation**: Value is computed on first access, not at creation
 * 2. **Automatic updates**: Recomputes when any source atom changes
 * 3. **Equality checking**: Only notifies subscribers if derived value actually changed
 * 4. **Suspense-like async**: `get()` throws promise if loading, throws error if errored
 * 5. **Race condition safe**: Stale promise resolutions are ignored
 * 6. **Conditional dependencies**: Only subscribes to atoms actually accessed
 *
 * ## Suspense-Style get()
 *
 * The `get()` function behaves like React Suspense:
 * - If source atom is **loading**: `get()` throws the promise
 * - If source atom has **error**: `get()` throws the error
 * - If source atom has **value**: `get()` returns the value
 *
 * This means derived atoms automatically propagate loading/error states.
 *
 * ## Conditional Dependencies
 *
 * Only atoms that are actually accessed during computation become dependencies:
 *
 * ```ts
 * const content = derived(({ get }) =>
 *   get(showDetails) ? get(details) : get(summary)
 * );
 * // When showDetails is false, changes to details don't trigger recomputation
 * ```
 *
 * ## Context Utilities
 *
 * | Utility | Form | Description |
 * |---------|------|-------------|
 * | `get(atom)` | - | Read atom value with dependency tracking |
 * | `all(atoms)` | Array | Wait for all atoms (like Promise.all) |
 * | `any(atoms)` | Object | First resolved atom (like Promise.any) |
 * | `race(atoms)` | Object | First settled atom (like Promise.race) |
 * | `settled(atoms)` | Array | All results regardless of success/failure |
 *
 * ## Important: No Async Return Values
 *
 * The derivation function must return a **synchronous** value, not a Promise.
 * For async derived values, use an async source atom instead.
 *
 * @template T - Derived value type
 * @param fn - Context-based derivation function
 * @param options - Optional configuration (meta for devtools)
 * @returns A read-only derived atom
 *
 * @example Context API - simple derivation (recommended)
 * ```ts
 * const count = atom(5);
 * const doubled = derived(({ get }) => get(count) * 2);
 *
 * console.log(doubled.value); // 10
 *
 * count.set(10);
 * console.log(doubled.value); // 20
 * ```
 *
 * @example Context API - multiple atoms
 * ```ts
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * const fullName = derived(({ get }) =>
 *   `${get(firstName)} ${get(lastName)}`
 * );
 *
 * console.log(fullName.value); // "John Doe"
 * ```
 *
 * @example Context API - conditional dependencies
 * ```ts
 * const showDetails = atom(false);
 * const summary = atom("Brief");
 * const details = atom("Detailed");
 *
 * const content = derived(({ get }) =>
 *   get(showDetails) ? get(details) : get(summary)
 * );
 * // Only subscribes to accessed atoms - efficient!
 * ```
 *
 * @example Context API - async utilities
 * ```ts
 * const user$ = atom(fetchUser());
 * const posts$ = atom(fetchPosts());
 *
 * // all() - array form for custom variable names
 * const dashboard = derived(({ all }) => {
 *   const [user, posts] = all([user$, posts$]);
 *   return { user, posts };
 * });
 *
 * // any() - object form to get winner key
 * const data = derived(({ any }) => {
 *   const [source, value] = any({ cache: cache$, api: api$ });
 *   return { source, value };
 * });
 *
 * // settled() - array form for custom variable names
 * const results = derived(({ settled }) => {
 *   const [userResult, postsResult] = settled([user$, posts$]);
 *   return {
 *     user: userResult.status === 'resolved' ? userResult.value : null,
 *     posts: postsResult.status === 'resolved' ? postsResult.value : [],
 *   };
 * });
 * ```
 *
 * @example Legacy API - single source
 * ```ts
 * const count = atom(5);
 * const doubled = derived(count, (get) => get() * 2);
 * ```
 *
 * @example Legacy API - multiple sources
 * ```ts
 * const fullName = derived(
 *   [firstName, lastName],
 *   (getFirst, getLast) => `${getFirst()} ${getLast()}`
 * );
 * ```
 *
 * @example Subscribing to changes
 * ```ts
 * const count = atom(0);
 * const doubled = derived(({ get }) => get(count) * 2);
 *
 * const unsubscribe = doubled.on(() => {
 *   console.log("Doubled changed:", doubled.value);
 * });
 *
 * count.set(5); // Logs: "Doubled changed: 10"
 * ```
 *
 * @example Awaiting derived atoms
 * ```ts
 * const asyncAtom = atom(fetchData());
 * const processed = derived(({ get }) => processData(get(asyncAtom)));
 *
 * const result = await processed;
 * console.log(result);
 * ```
 */
/**
 * Context API: Create a derived atom with inline atom access.
 */
export function derived<T>(
  fn: ContextSelectorFn<T>,
  options?: DerivedOptions
): T extends PromiseLike<any> ? never : Atom<T>;

/**
 * Legacy API: Single atom source with getter.
 */
export function derived<D, T>(
  source: Atom<D, any>,
  fn: (source: Getter<D>) => T,
  options?: DerivedOptions
): T extends PromiseLike<any> ? never : Atom<T>;

/**
 * Legacy API: Array of atoms with positional getters.
 */
export function derived<const D extends readonly Atom<any, any>[], T>(
  source: D,
  fn: (
    ...values: {
      [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
    }
  ) => T,
  options?: DerivedOptions
): T extends PromiseLike<any> ? never : Atom<T>;

export function derived(
  sourceOrFn: any,
  fnOrOptions?: AnyFunc | DerivedOptions,
  options?: DerivedOptions
): Atom<any> {
  // Detect which API is being used
  let computeFn: () => ReturnType<typeof select>;
  let derivedOptions: DerivedOptions | undefined;

  if (typeof sourceOrFn === "function" && (fnOrOptions === undefined || !isFunction(fnOrOptions))) {
    // Context API: derived(fn, options?)
    const fn = sourceOrFn as ContextSelectorFn<any>;
    derivedOptions = fnOrOptions as DerivedOptions | undefined;
    computeFn = () => select(fn);
  } else {
    // Legacy API: derived(source, fn, options?)
    const source = sourceOrFn;
    const fn = fnOrOptions as AnyFunc;
    derivedOptions = options;
    computeFn = () => select(source, fn);
  }

  // Create state container for the derived value
  const state = atomState<any>();

  // Track pending promise for loading state
  let pendingPromise: PromiseLike<any> | null = null;

  // Track if initialized
  let isInitialized = false;

  // Track current subscriptions (atom -> unsubscribe function)
  const subscriptions = new Map<Atom<any>, VoidFunction>();

  /**
   * Updates subscriptions based on new dependencies.
   * Unsubscribes from atoms that are no longer accessed,
   * subscribes to newly accessed atoms.
   */
  const updateSubscriptions = (newDeps: Set<Atom<any>>) => {
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
   * Computes the derived value using the selector utility.
   * Handles thrown promises (suspense) and errors.
   * Tracks dependencies and updates subscriptions.
   */
  const compute = (silent = false) => {
    const version = state.getVersion();

    // Run select to compute value and track dependencies
    const result = computeFn();

    // Update subscriptions based on accessed deps
    updateSubscriptions(result.dependencies);

    if (result.promise !== undefined) {
      // Promise thrown - enter loading state
      pendingPromise = result.promise;

      // Wait for promise and recompute
      result.promise.then(
        () => {
          // Race condition check: ignore if a newer compute started
          if (state.isVersionStale(version)) return;
          compute();
        },
        (error) => {
          // Race condition check
          if (state.isVersionStale(version)) return;
          pendingPromise = null;
          state.setError(error);
        }
      );

      // Notify if transitioning to loading (only if not silent)
      if (!silent) {
        state.setLoading(result.promise, silent);
      }
    } else if (result.error !== undefined) {
      // Error thrown - enter error state
      pendingPromise = null;
      state.setError(result.error, silent);
    } else {
      // Success - clear pending and update value
      pendingPromise = null;
      state.setValue(result.value, silent);
    }
  };

  /**
   * Initializes the derived atom.
   * Called lazily on first access.
   */
  const init = () => {
    if (isInitialized) return;
    isInitialized = true;

    // Initial computation (silent - don't notify on init)
    // Subscriptions are set up automatically based on accessed deps
    compute(true);
  };

  const derivedAtom: Atom<any, any> = {
    [SYMBOL_ATOM]: true,
    key: undefined,
    meta: options?.meta,

    get value() {
      init();
      return state.getValue();
    },

    get loading() {
      init();
      return pendingPromise !== null;
    },

    get error() {
      init();
      return state.getError();
    },

    /**
     * Derived atoms don't have fallback mode, so stale() always returns false.
     * This method exists for API consistency with mutable atoms.
     */
    stale() {
      return false;
    },

    then(onfulfilled?: any, onrejected?: any) {
      init();

      // If loading, wait for pending promise then recompute
      if (pendingPromise !== null) {
        const currentVersion = state.getVersion();
        return pendingPromise.then(
          () => {
            // If version changed, someone else already recomputed
            if (state.isVersionStale(currentVersion)) {
              compute();
            }
            // Now check final state
            const error = state.getError();
            if (error !== undefined) {
              return onrejected ? onrejected(error) : Promise.reject(error);
            }
            const value = state.getValue();
            return onfulfilled ? onfulfilled(value) : value;
          },
          (error) => {
            return onrejected ? onrejected(error) : Promise.reject(error);
          }
        );
      }

      // If error, reject
      const error = state.getError();
      if (error !== undefined) {
        return onrejected
          ? Promise.resolve(onrejected(error))
          : Promise.reject(error);
      }

      // Otherwise resolve with current value
      const value = state.getValue();
      return onfulfilled
        ? Promise.resolve(onfulfilled(value))
        : Promise.resolve(value);
    },

    on(listener: VoidFunction) {
      init();
      return state.on(listener);
    },
  };

  // Notify devtools/plugins of derived atom creation
  onCreateHook.current?.({
    type: "derived",
    key: undefined,
    meta: derivedOptions?.meta,
    atom: derivedAtom,
  });

  return derivedAtom;
}
