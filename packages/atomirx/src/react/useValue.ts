import { useSyncExternalStore, useCallback, useRef } from "react";
import { select, ReactiveSelector } from "../core/select";
import { resolveEquality } from "../core/equality";
import { Atom, Equality } from "../core/types";
import { isAtom } from "../core/isAtom";

/**
 * React hook that selects/derives a value from atom(s) with automatic subscriptions.
 *
 * Uses `useSyncExternalStore` for proper React 18+ concurrent mode support.
 * Only subscribes to atoms that are actually accessed during selection.
 *
 * ## IMPORTANT: Selector Must Return Synchronous Value
 *
 * **The selector function MUST NOT be async or return a Promise.**
 *
 * ```tsx
 * // ❌ WRONG - Don't use async function
 * useValue(async ({ get }) => {
 *   const data = await fetch('/api');
 *   return data;
 * });
 *
 * // ❌ WRONG - Don't return a Promise
 * useValue(({ get }) => fetch('/api').then(r => r.json()));
 *
 * // ✅ CORRECT - Create async atom and read with get()
 * const data$ = atom(fetch('/api').then(r => r.json()));
 * useValue(({ get }) => get(data$)); // Suspends until resolved
 * ```
 *
 * ## IMPORTANT: Do NOT Use try/catch - Use safe() Instead
 *
 * **Never wrap `get()` calls in try/catch blocks.** The `get()` function throws
 * Promises when atoms are loading (Suspense pattern). A try/catch will catch
 * these Promises and break the Suspense mechanism.
 *
 * ```tsx
 * // ❌ WRONG - Catches Suspense Promise, breaks loading state
 * const data = useValue(({ get }) => {
 *   try {
 *     return get(asyncAtom$);
 *   } catch (e) {
 *     return null; // This catches BOTH errors AND loading promises!
 *   }
 * });
 *
 * // ✅ CORRECT - Use safe() to catch errors but preserve Suspense
 * const result = useValue(({ get, safe }) => {
 *   const [err, data] = safe(() => {
 *     const raw = get(asyncAtom$);    // Can throw Promise (Suspense)
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
 * ## IMPORTANT: Suspense-Style API
 *
 * This hook uses a **Suspense-style API** for async atoms:
 * - When an atom is **loading**, the getter throws a Promise (suspends)
 * - When an atom has an **error**, the getter throws the error
 * - When an atom is **resolved**, the getter returns the value
 *
 * This means:
 * - **You MUST wrap components with `<Suspense>`** to handle loading states
 * - **You MUST wrap components with `<ErrorBoundary>`** to handle errors
 *
 * ## Alternative: Using staleValue for Non-Suspense
 *
 * If you want to show loading states without Suspense:
 *
 * ```tsx
 * function MyComponent() {
 *   // Access staleValue directly - always has a value (with fallback)
 *   const count = myDerivedAtom$.staleValue;
 *   const isLoading = isPending(myDerivedAtom$.get());
 *
 *   return (
 *     <div>
 *       {isLoading && <Spinner />}
 *       Count: {count}
 *     </div>
 *   );
 * }
 * ```
 *
 * @template T - The type of the selected value
 * @param selectorOrAtom - Atom or context-based selector function (must return sync value)
 * @param equals - Equality function or shorthand. Defaults to "shallow"
 * @returns The selected value (Awaited<T>)
 * @throws Error if selector returns a Promise or PromiseLike
 *
 * @example Single atom (shorthand)
 * ```tsx
 * const count = atom(5);
 *
 * function Counter() {
 *   const value = useValue(count);
 *   return <div>{value}</div>;
 * }
 * ```
 *
 * @example With selector
 * ```tsx
 * const count = atom(5);
 *
 * function Counter() {
 *   const doubled = useValue(({ get }) => get(count) * 2);
 *   return <div>{doubled}</div>;
 * }
 * ```
 *
 * @example Multiple atoms
 * ```tsx
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * function FullName() {
 *   const fullName = useValue(({ get }) =>
 *     `${get(firstName)} ${get(lastName)}`
 *   );
 *   return <div>{fullName}</div>;
 * }
 * ```
 *
 * @example Async atom with Suspense
 * ```tsx
 * const userAtom = atom(fetchUser());
 *
 * function UserProfile() {
 *   const user = useValue(({ get }) => get(userAtom));
 *   return <div>{user.name}</div>;
 * }
 *
 * // MUST wrap with Suspense and ErrorBoundary
 * function App() {
 *   return (
 *     <ErrorBoundary fallback={<div>Error!</div>}>
 *       <Suspense fallback={<div>Loading...</div>}>
 *         <UserProfile />
 *       </Suspense>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * @example Using all() for multiple async atoms
 * ```tsx
 * const userAtom = atom(fetchUser());
 * const postsAtom = atom(fetchPosts());
 *
 * function Dashboard() {
 *   const data = useValue(({ all }) => {
 *     const [user, posts] = all(userAtom, postsAtom);
 *     return { user, posts };
 *   });
 *
 *   return <DashboardContent user={data.user} posts={data.posts} />;
 * }
 * ```
 */
// Overload: Pass atom directly
export function useValue<T>(
  atom: Atom<T>,
  equals?: Equality<Awaited<T>>
): Awaited<T>;

// Overload: Context-based selector function
export function useValue<T>(
  selector: ReactiveSelector<T>,
  equals?: Equality<T>
): T;

export function useValue<T>(
  selectorOrAtom: ReactiveSelector<T> | Atom<T>,
  equals?: Equality<T>
): T {
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

  // Cache the last snapshot
  const snapshotRef = useRef<{ value: T; initialized: boolean }>({
    value: undefined as T,
    initialized: false,
  });

  /**
   * Get the current snapshot by running the selector.
   */
  const getSnapshot = useCallback(() => {
    const result = select(selectorRef.current);

    // Update dependencies
    dependenciesRef.current = result.dependencies;

    // Handle Suspense-style states
    if (result.promise !== undefined) {
      // Loading state - throw Promise
      throw result.promise;
    }

    if (result.error !== undefined) {
      // Error state - throw error
      throw result.error;
    }

    // Success - check equality and update cache
    const newValue = result.value as T;

    if (
      !snapshotRef.current.initialized ||
      !eqRef.current(newValue, snapshotRef.current.value)
    ) {
      snapshotRef.current = { value: newValue, initialized: true };
    }

    return snapshotRef.current.value;
  }, []);

  /**
   * Subscribe to atom changes.
   */
  const subscribe = useCallback((onStoreChange: () => void) => {
    const subscriptions = subscriptionsRef.current;

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

            // Notify React
            onStoreChange();
          });
          subscriptions.set(atom, unsubscribe);
        }
      }
    };

    // Initial subscription setup
    updateSubscriptions();

    // Cleanup function
    return () => {
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe();
      }
      subscriptions.clear();
    };
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
