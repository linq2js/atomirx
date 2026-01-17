import { useSyncExternalStore, useCallback, useRef } from "react";
import { select } from "../core/select";
import { resolveEquality } from "../core/equality";
import { AnyFunc, Atom, Equality, Getter } from "../core/types";

/**
 * React hook that selects/derives a value from atom(s) with automatic subscriptions.
 *
 * Uses `useSyncExternalStore` for proper React 18+ concurrent mode support.
 * Only subscribes to atoms that are actually accessed during selection (conditional dependencies).
 *
 * ## IMPORTANT: Suspense-Style API
 *
 * This hook uses a **Suspense-style API** for async atoms:
 * - When an atom is **loading**, the getter throws a Promise (suspends)
 * - When an atom has an **error**, the getter throws the error
 * - When an atom is **resolved**, the getter returns the value
 *
 * This means:
 * - **You MUST wrap components using async atoms with `<Suspense>`** to handle loading states
 * - **You MUST wrap components using async atoms with `<ErrorBoundary>`** to handle errors
 * - Without these boundaries, thrown promises/errors will propagate up and crash your app
 *
 * ## When to Use useSelector
 *
 * ✅ **Good for:**
 * - Synchronous atoms (no async initial value)
 * - Async atoms when you want Suspense-style loading/error handling
 * - Derived values from multiple atoms
 * - Fine-grained subscriptions (only re-render when selected value changes)
 * - Computations that need component state (e.g., filter by local search term)
 *
 * ❌ **Not suitable for:**
 * - Displaying loading/error states inline (without Suspense boundaries)
 * - Accessing `atom.loading`, `atom.error`, `atom.stale()` directly
 * - Cases where you need to show loading spinners within the same component
 *
 * ## Alternative: Manual Subscription for Inline Loading States
 *
 * If you need to display loading/error states inline without Suspense, use manual subscription:
 *
 * ```tsx
 * function useAtomState<T>(atom: Atom<T>) {
 *   const [, forceUpdate] = useState({});
 *   useEffect(() => atom.on(() => forceUpdate({})), [atom]);
 *   return { value: atom.value, loading: atom.loading, error: atom.error };
 * }
 *
 * function MyComponent() {
 *   const { value, loading, error } = useAtomState(myAsyncAtom);
 *   if (loading) return <Spinner />;
 *   if (error) return <Error error={error} />;
 *   return <div>{value}</div>;
 * }
 * ```
 *
 * @template T - The type of the selected value
 * @param source - Single atom or array of atoms
 * @param selector - Function that computes the selected value from atom getters
 * @param equals - Equality function or shorthand ("strict", "shallow", "deep"). Defaults to "shallow"
 * @returns The selected value (throws Promise if loading, throws Error if errored)
 *
 * @example Single atom (with selector)
 * ```tsx
 * const count = atom(5);
 *
 * function Counter() {
 *   const doubled = useSelector(count, (get) => get() * 2);
 *   return <div>{doubled}</div>;
 * }
 * ```
 *
 * @example Single atom (without selector - returns atom value directly)
 * ```tsx
 * const count = atom(5);
 *
 * function Counter() {
 *   const value = useSelector(count); // equivalent to useSelector(count, (get) => get())
 *   return <div>{value}</div>;
 * }
 * ```
 *
 * @example Multiple atoms (array form)
 * ```tsx
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * function FullName() {
 *   const fullName = useSelector(
 *     [firstName, lastName],
 *     (first, last) => `${first()} ${last()}`
 *   );
 *   return <div>{fullName}</div>;
 * }
 * ```
 *
 * @example With equals option
 * ```tsx
 * const user = atom({ name: "John", age: 30 });
 *
 * function UserName() {
 *   // Only re-render when name actually changes (shallow comparison)
 *   const name = useSelector(user, (get) => get()?.name, "shallow");
 *   return <div>{name}</div>;
 * }
 * ```
 *
 * @example Conditional dependencies
 * ```tsx
 * const showDetails = atom(false);
 * const basicInfo = atom({ name: "John" });
 * const detailedInfo = atom({ name: "John", email: "john@example.com" });
 *
 * function UserInfo() {
 *   // Only subscribes to showDetails + the accessed info atom
 *   const info = useSelector(
 *     [showDetails, basicInfo, detailedInfo],
 *     (getShowDetails, getBasicInfo, getDetailedInfo) =>
 *       getShowDetails() ? getDetailedInfo() : getBasicInfo()
 *   );
 *   return <div>{info.name}</div>;
 * }
 * ```
 *
 * @example Async atom with Suspense (REQUIRED for async atoms)
 * ```tsx
 * const userAtom = atom(fetchUser());
 *
 * function UserProfile() {
 *   // This will suspend until the atom resolves
 *   const user = useSelector(userAtom);
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
 * @example Combining multiple async atoms with async utilities
 * ```tsx
 * import { all, settled } from "atomirx";
 *
 * const userAtom = atom(fetchUser());
 * const postsAtom = atom(fetchPosts());
 *
 * function Dashboard() {
 *   const data = useSelector([userAtom, postsAtom], (getUser, getPosts) => {
 *     // Use all() to wait for multiple atoms
 *     const [user, posts] = all([getUser, getPosts]);
 *     return { user, posts };
 *
 *     // Or use settled() to handle partial failures
 *     // const results = settled({ user: getUser, posts: getPosts });
 *   });
 *
 *   return <DashboardContent user={data.user} posts={data.posts} />;
 * }
 * ```
 * @see all, race, any, settled in core/async.ts for more async utilities
 */
export function useSelector<D, T = D>(
  source: Atom<D, any>,
  selector?: (source: Getter<D>) => T,
  equals?: Equality<T>
): T;

export function useSelector<const D extends readonly Atom<any, any>[], T>(
  source: D,
  selector: (
    ...values: {
      [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
    }
  ) => T,
  equals?: Equality<T>
): T;

export function useSelector(
  source: any,
  selector?: AnyFunc,
  equals?: Equality<any>
): any {
  // Default to shallow equality to handle object-returning selectors properly
  const eq = resolveEquality(equals ?? "shallow");
  // Default identity selector for single atom case
  const identitySelector = (get: Getter<any>) => get();

  // Use identity selector if none provided (single atom case)
  const selectorFn = selector ?? identitySelector;

  // Store source and selectorFn in refs to avoid recreating callbacks
  const sourceRef = useRef(source);
  const selectorFnRef = useRef(selectorFn);
  const eqRef = useRef(eq);

  // Update refs on each render
  sourceRef.current = source;
  selectorFnRef.current = selectorFn;
  eqRef.current = eq;

  // Track current dependencies and their unsubscribe functions
  const subscriptionsRef = useRef<Map<Atom<any>, VoidFunction>>(new Map());
  const dependenciesRef = useRef<Set<Atom<any>>>(new Set());

  // Cache the last snapshot to avoid unnecessary re-renders
  const snapshotRef = useRef<{ value: any; initialized: boolean }>({
    value: undefined,
    initialized: false,
  });

  /**
   * Get the current snapshot by running the selector.
   * This is called by React during render to get the current value.
   * We collect dependencies here but don't subscribe yet.
   */
  const getSnapshot = useCallback(() => {
    const result = select(sourceRef.current, selectorFnRef.current);

    // Update dependencies
    dependenciesRef.current = result.dependencies;

    // Handle different result states (Suspense-style)
    // NOTE: This is where the Suspense behavior comes from:
    // - Loading atoms cause the getter to throw a Promise
    // - Errored atoms cause the getter to throw the error
    // The `select()` function captures these thrown values in result.promise/result.error

    if (result.promise !== undefined) {
      // Loading state - the selector threw a Promise (atom is loading)
      // Throw the promise to trigger React Suspense
      throw result.promise;
    }

    if (result.error !== undefined) {
      // Error state - throw the error to be caught by ErrorBoundary
      // This propagates the error up to the nearest ErrorBoundary
      throw result.error;
    }

    // Success - check equality and update cache
    const newValue = result.value;

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
   * Called by React after commit to set up subscriptions.
   * We subscribe to the dependencies collected during getSnapshot.
   */
  const subscribe = useCallback((onStoreChange: () => void) => {
    const subscriptions = subscriptionsRef.current;

    /**
     * Updates subscriptions based on current dependencies.
     * Called initially and after each re-render to sync subscriptions.
     */
    const updateSubscriptions = () => {
      const currentDeps = dependenciesRef.current;

      // Unsubscribe from atoms that are no longer dependencies
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
            // Re-run selector to update dependencies and check equality
            const result = select(sourceRef.current, selectorFnRef.current);
            dependenciesRef.current = result.dependencies;

            // Update subscriptions if dependencies changed
            updateSubscriptions();

            // Notify React of potential change
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

  // Use React's useSyncExternalStore for concurrent mode support
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
