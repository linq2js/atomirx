import { Atom, Equality, Getter } from '../core/types';
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
export declare function useSelector<D, T = D>(source: Atom<D, any>, selector?: (source: Getter<D>) => T, equals?: Equality<T>): T;
export declare function useSelector<const D extends readonly Atom<any, any>[], T>(source: D, selector: (...values: {
    [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
}) => T, equals?: Equality<T>): T;
