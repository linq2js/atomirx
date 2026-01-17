import { Atom, Equality, Getter } from '../core/types';
/**
 * Reactive inline component that renders atom values directly in JSX.
 *
 * `rx` is a convenience wrapper around `useSelector` that returns a memoized
 * React component instead of a value. This enables fine-grained reactivity
 * without creating separate components for each reactive value.
 *
 * ## Why Use `rx`?
 *
 * Without `rx`, you need a separate component to subscribe to an atom:
 * ```tsx
 * function PostsList() {
 *   const posts = useSelector(postsAtom);
 *   return posts.map((post) => <Post post={post} />);
 * }
 *
 * function Page() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       <PostsList />
 *     </Suspense>
 *   );
 * }
 * ```
 *
 * With `rx`, you can subscribe inline:
 * ```tsx
 * function Page() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       {rx(postsAtom, (getPosts) =>
 *         getPosts().map((post) => <Post post={post} />)
 *       )}
 *     </Suspense>
 *   );
 * }
 * ```
 *
 * ## Key Benefits
 *
 * 1. **Fine-grained updates**: Only the `rx` component re-renders when the atom changes,
 *    not the parent component
 * 2. **Less boilerplate**: No need to create single-purpose wrapper components
 * 3. **Colocation**: Keep reactive logic inline where it's used
 * 4. **Memoized**: Uses `React.memo` to prevent unnecessary re-renders
 * 5. **Type-safe**: Full TypeScript support with proper type inference
 *
 * ## Async Atoms (Suspense-Style API)
 *
 * `rx` inherits the Suspense-style API from `useSelector`:
 * - **Loading state**: The getter throws a Promise (triggers Suspense)
 * - **Error state**: The getter throws the error (triggers ErrorBoundary)
 * - **Resolved state**: The getter returns the value
 *
 * For async atoms, you MUST wrap with `<Suspense>` and `<ErrorBoundary>`:
 * ```tsx
 * function App() {
 *   return (
 *     <ErrorBoundary fallback={<div>Error!</div>}>
 *       <Suspense fallback={<div>Loading...</div>}>
 *         {rx(userAtom, (get) => get().name)}
 *       </Suspense>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * Or catch errors in the selector to handle loading/error inline:
 * ```tsx
 * {rx(userAtom, (get) => {
 *   try {
 *     return get().name;
 *   } catch {
 *     return "Loading...";
 *   }
 * })}
 * ```
 *
 * @template D - The type of the source atom's value
 * @template T - The type of the selected/derived value (defaults to D)
 * @param source - Single atom to select from
 * @param selector - Optional function to derive a value from the atom getter.
 *                   If omitted, returns the atom's value directly.
 * @param equals - Equality function or shorthand ("strict", "shallow", "deep").
 *                 Defaults to "shallow".
 * @returns A React element that renders the selected value
 *
 * @example Basic usage - render atom value directly
 * ```tsx
 * const count = atom(5);
 *
 * function Counter() {
 *   return <div>Count: {rx(count)}</div>;
 * }
 * ```
 *
 * @example With selector - derive a value
 * ```tsx
 * const count = atom(5);
 *
 * function DoubledCounter() {
 *   return <div>Doubled: {rx(count, (get) => get() * 2)}</div>;
 * }
 * ```
 *
 * @example Fine-grained updates - parent doesn't re-render
 * ```tsx
 * const count = atom(0);
 *
 * function Parent() {
 *   console.log("Parent renders once");
 *   return (
 *     <div>
 *       {rx(count)} {/* Only this re-renders when count changes *\/}
 *       <button onClick={() => count.set((n) => n + 1)}>+</button>
 *     </div>
 *   );
 * }
 * ```
 */
export declare function rx<D, T = D>(source: Atom<D, any>, selector?: (source: Getter<D>) => T, equals?: Equality<T>): T;
/**
 * Reactive inline component that derives a value from multiple atoms (array form).
 *
 * @template D - Tuple type of source atoms
 * @template T - The type of the derived value
 * @param source - Array of atoms to select from
 * @param selector - Function that receives getters for each atom and returns the derived value.
 *                   Required when using array form.
 * @param equals - Equality function or shorthand. Defaults to "shallow".
 * @returns A React element that renders the derived value
 *
 * @example Multiple atoms - derive combined value
 * ```tsx
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * function FullName() {
 *   return (
 *     <div>
 *       {rx([firstName, lastName], (first, last) => `${first()} ${last()}`)}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Multiple subscriptions in one component
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <div>
 *       <header>
 *         <Suspense fallback="...">{rx(userAtom, (get) => get().name)}</Suspense>
 *       </header>
 *       <main>
 *         <Suspense fallback="...">
 *           {rx(postsAtom, (get) => get().length)} posts
 *         </Suspense>
 *         <Suspense fallback="...">
 *           {rx(notificationsAtom, (get) => get().length)} notifications
 *         </Suspense>
 *       </main>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Conditional dependencies - only subscribes to accessed atoms
 * ```tsx
 * const showDetails = atom(false);
 * const summary = atom("Brief info");
 * const details = atom("Detailed info");
 *
 * function Info() {
 *   return (
 *     <div>
 *       {rx([showDetails, summary, details], (getShow, getSummary, getDetails) =>
 *         getShow() ? getDetails() : getSummary()
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With custom equality
 * ```tsx
 * const user = atom({ id: 1, name: "John" });
 *
 * function UserName() {
 *   return (
 *     <div>
 *       {rx(
 *         user,
 *         (get) => get().name,
 *         (a, b) => a === b // Only re-render if name string changes
 *       )}
 *     </div>
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
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       {rx([userAtom, postsAtom], (getUser, getPosts) => {
 *         // Use all() to wait for multiple atoms
 *         const [user, posts] = all([getUser, getPosts]);
 *         return <DashboardContent user={user} posts={posts} />;
 *
 *         // Or use settled() to handle partial failures
 *         // const results = settled({ user: getUser, posts: getPosts });
 *       })}
 *     </Suspense>
 *   );
 * }
 * ```
 * @see all, race, any, settled in core/async.ts for more async utilities
 */
export declare function rx<const D extends readonly Atom<any, any>[], T>(source: D, selector: (...values: {
    [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
}) => T, equals?: Equality<T>): T;
