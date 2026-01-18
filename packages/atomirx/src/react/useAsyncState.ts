import { useSyncExternalStore, useCallback, useRef } from "react";
import { select, ReactiveSelector, promisesEqual } from "../core/select";
import { resolveEquality } from "../core/equality";
import { getAtomState } from "../core/getAtomState";
import { Atom, AtomState, Equality } from "../core/types";
import { isAtom } from "../core/isAtom";

/**
 * Async state returned by useAsyncState hook.
 * Type alias for AtomState with more semantic naming for React context.
 */
export type AsyncState<T> = AtomState<T>;

/**
 * React hook that returns the current state of a reactive selector as an AsyncState.
 *
 * Unlike `useValue`, this hook does NOT suspend or throw errors. Instead, it returns
 * a discriminated union (`AsyncState<T>`) that you can handle imperatively:
 *
 * - `{ status: "ready", value: T }` - Value is available
 * - `{ status: "loading", promise: Promise<T> }` - Value is loading
 * - `{ status: "error", error: unknown }` - An error occurred
 *
 * This is useful when you want to:
 * - Handle loading/error states without Suspense/ErrorBoundary
 * - Show loading indicators inline
 * - Implement custom error handling UI
 *
 * @template T - The type of the selected value
 * @param selectorOrAtom - Atom or context-based selector function
 * @param equals - Equality function or shorthand. Defaults to "shallow"
 * @returns AsyncState<T> discriminated union
 *
 * @example Basic usage with loading state
 * ```tsx
 * const userData$ = atom(fetchUser());
 *
 * function UserProfile() {
 *   const state = useAsyncState(userData$);
 *
 *   if (state.status === "loading") {
 *     return <Spinner />;
 *   }
 *
 *   if (state.status === "error") {
 *     return <ErrorMessage error={state.error} />;
 *   }
 *
 *   return <div>{state.value.name}</div>;
 * }
 * ```
 *
 * @example With selector
 * ```tsx
 * const user$ = atom(fetchUser());
 * const posts$ = atom(fetchPosts());
 *
 * function Dashboard() {
 *   const state = useAsyncState(({ all }) => {
 *     const [user, posts] = all(user$, posts$);
 *     return { user, posts };
 *   });
 *
 *   switch (state.status) {
 *     case "loading":
 *       return <LoadingDashboard />;
 *     case "error":
 *       return <ErrorDashboard error={state.error} />;
 *     case "ready":
 *       return <Dashboard user={state.value.user} posts={state.value.posts} />;
 *   }
 * }
 * ```
 */
// Overload: Pass atom directly
export function useAsyncState<T>(
  atom: Atom<T>,
  equals?: Equality<Awaited<T>>
): AsyncState<Awaited<T>>;

// Overload: Context-based selector function
export function useAsyncState<T>(
  selector: ReactiveSelector<T>,
  equals?: Equality<T>
): AsyncState<T>;

export function useAsyncState<T>(
  selectorOrAtom: ReactiveSelector<T> | Atom<T>,
  equals?: Equality<T>
): AsyncState<T> {
  // Convert atom shorthand to context selector
  const selector: ReactiveSelector<T> = isAtom(selectorOrAtom)
    ? ({ read }) => read(selectorOrAtom as Atom<T>) as T
    : (selectorOrAtom as ReactiveSelector<T>);

  // Default to shallow equality
  const eq = resolveEquality((equals as Equality<unknown>) ?? "shallow");

  // Store selector in ref to avoid recreating callbacks
  const selectorRef = useRef(selector);
  const eqRef = useRef(eq);

  // Update refs on each render
  selectorRef.current = selector;
  eqRef.current = eq;

  // Track current dependencies and their unsubscribe functions
  const subscriptionsRef = useRef<Map<Atom<unknown>, VoidFunction>>(new Map());
  const dependenciesRef = useRef<Set<Atom<unknown>>>(new Set());

  // Cache the last snapshot for referential stability
  const snapshotRef = useRef<AsyncState<T>>({
    status: "loading",
    promise: Promise.resolve() as Promise<T>,
  });

  /**
   * Get the current snapshot by running the selector.
   * Returns AsyncState without throwing.
   */
  const getSnapshot = useCallback((): AsyncState<T> => {
    const result = select(selectorRef.current);

    // Update dependencies
    dependenciesRef.current = result.dependencies;

    // Determine new state
    let newState: AsyncState<T>;

    if (result.promise !== undefined) {
      // Loading state
      newState = { status: "loading", promise: result.promise as Promise<T> };
    } else if (result.error !== undefined) {
      // Error state
      newState = { status: "error", error: result.error };
    } else {
      // Ready state
      newState = { status: "ready", value: result.value as T };
    }

    // Check if state changed (for referential stability)
    const prev = snapshotRef.current;

    if (prev.status !== newState.status) {
      snapshotRef.current = newState;
    } else if (newState.status === "ready" && prev.status === "ready") {
      // For ready state, check value equality
      if (!eqRef.current(newState.value, prev.value)) {
        snapshotRef.current = newState;
      }
    } else if (newState.status === "loading" && prev.status === "loading") {
      // For loading state, compare promises (including combined promise metadata)
      if (!promisesEqual(newState.promise, prev.promise)) {
        snapshotRef.current = newState;
      }
    } else if (newState.status === "error" && prev.status === "error") {
      // For error state, check error identity
      if (newState.error !== prev.error) {
        snapshotRef.current = newState;
      }
    }

    return snapshotRef.current;
  }, []);

  // Track promises to detect when they settle
  const trackedPromisesRef = useRef<Set<Promise<unknown>>>(new Set());

  /**
   * Subscribe to atom changes.
   */
  const subscribe = useCallback((onStoreChange: () => void) => {
    const subscriptions = subscriptionsRef.current;
    const trackedPromises = trackedPromisesRef.current;

    // Track a promise and trigger re-render when it settles
    const trackPromise = (promise: Promise<unknown>) => {
      if (trackedPromises.has(promise)) return;
      trackedPromises.add(promise);

      promise.then(
        () => {
          if (trackedPromises.has(promise)) {
            onStoreChange();
          }
        },
        () => {
          if (trackedPromises.has(promise)) {
            onStoreChange();
          }
        }
      );
    };

    // Track all loading dependencies' promises
    const trackDependencyPromises = () => {
      for (const atom of dependenciesRef.current) {
        const state = getAtomState(atom);
        if (state.status === "loading" && state.promise) {
          trackPromise(state.promise);
        }
      }
    };

    const updateSubscriptions = () => {
      const currentDeps = dependenciesRef.current;

      // Unsubscribe from atoms no longer dependencies
      for (const [atom, unsubscribe] of subscriptions) {
        if (!currentDeps.has(atom)) {
          unsubscribe();
          subscriptions.delete(atom);
        }
      }

      // Subscribe to new dependencies
      for (const atom of currentDeps) {
        if (!subscriptions.has(atom)) {
          const unsubscribe = atom.on(() => {
            // Re-run selector to update dependencies
            const result = select(selectorRef.current);
            dependenciesRef.current = result.dependencies;

            // Update subscriptions if dependencies changed
            updateSubscriptions();

            // Track any new promises from dependencies
            trackDependencyPromises();

            // Notify React
            onStoreChange();
          });
          subscriptions.set(atom, unsubscribe);
        }
      }
    };

    // Initial subscription setup
    updateSubscriptions();

    // Track initial promises from all dependencies
    trackDependencyPromises();

    // Cleanup function
    return () => {
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe();
      }
      subscriptions.clear();
      trackedPromises.clear();
    };
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
