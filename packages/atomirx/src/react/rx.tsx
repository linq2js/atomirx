import { memo } from "react";
import { Atom, Equality } from "../core/types";
import { useSelector } from "./useSelector";
import { shallowEqual } from "../core/equality";
import { isAtom } from "../core/isAtom";
import { ContextSelectorFn } from "../core/select";

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
 *       {rx(({ get }) =>
 *         get(postsAtom).map((post) => <Post post={post} />)
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
 *         {rx(({ get }) => get(userAtom).name)}
 *       </Suspense>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * Or catch errors in the selector to handle loading/error inline:
 * ```tsx
 * {rx(({ get }) => {
 *   try {
 *     return get(userAtom).name;
 *   } catch {
 *     return "Loading...";
 *   }
 * })}
 * ```
 *
 * @template T - The type of the selected/derived value
 * @param selector - Context-based selector function with `{ get, all, any, race, settled }`
 * @param equals - Equality function or shorthand ("strict", "shallow", "deep").
 *                 Defaults to "shallow".
 * @returns A React element that renders the selected value
 *
 * @example Shorthand - render atom value directly
 * ```tsx
 * const count = atom(5);
 *
 * function Counter() {
 *   return <div>Count: {rx(count)}</div>;
 * }
 * ```
 *
 * @example Context selector - derive a value
 * ```tsx
 * const count = atom(5);
 *
 * function DoubledCounter() {
 *   return <div>Doubled: {rx(({ get }) => get(count) * 2)}</div>;
 * }
 * ```
 *
 * @example Multiple atoms
 * ```tsx
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * function FullName() {
 *   return (
 *     <div>
 *       {rx(({ get }) => `${get(firstName)} ${get(lastName)}`)}
 *     </div>
 *   );
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
 *
 * @example Multiple subscriptions in one component
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <div>
 *       <header>
 *         <Suspense fallback="...">{rx(({ get }) => get(userAtom).name)}</Suspense>
 *       </header>
 *       <main>
 *         <Suspense fallback="...">
 *           {rx(({ get }) => get(postsAtom).length)} posts
 *         </Suspense>
 *         <Suspense fallback="...">
 *           {rx(({ get }) => get(notificationsAtom).length)} notifications
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
 *       {rx(({ get }) =>
 *         get(showDetails) ? get(details) : get(summary)
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
 *         ({ get }) => get(user).name,
 *         (a, b) => a === b // Only re-render if name string changes
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Combining multiple async atoms with async utilities
 * ```tsx
 * const userAtom = atom(fetchUser());
 * const postsAtom = atom(fetchPosts());
 *
 * function Dashboard() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       {rx(({ all }) => {
 *         // Use all() to wait for multiple atoms
 *         const [user, posts] = all([userAtom, postsAtom]);
 *         return <DashboardContent user={user} posts={posts} />;
 *       })}
 *     </Suspense>
 *   );
 * }
 * ```
 *
 * @example Using settled for partial failures
 * ```tsx
 * const userAtom = atom(fetchUser());
 * const postsAtom = atom(fetchPosts());
 *
 * function Dashboard() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       {rx(({ settled }) => {
 *         const [userResult, postsResult] = settled([userAtom, postsAtom]);
 *         return (
 *           <DashboardContent
 *             user={userResult.status === 'resolved' ? userResult.value : null}
 *             posts={postsResult.status === 'resolved' ? postsResult.value : []}
 *           />
 *         );
 *       })}
 *     </Suspense>
 *   );
 * }
 * ```
 */
// Overload: Pass atom directly to get its value (shorthand)
export function rx<T>(atom: Atom<T, any>, equals?: Equality<T>): T;

// Overload: Context-based selector function
export function rx<T>(selector: ContextSelectorFn<T>, equals?: Equality<T>): T;

export function rx<T>(
  selectorOrAtom: ContextSelectorFn<T> | Atom<T, any>,
  equals?: Equality<T>
): T {
  return (
    <Rx selectorOrAtom={selectorOrAtom} equals={equals} />
  ) as unknown as T;
}

/**
 * Internal memoized component that handles the actual subscription and rendering.
 *
 * Memoized with React.memo to ensure:
 * 1. Parent components don't cause unnecessary re-renders
 * 2. Only atom changes trigger re-renders
 * 3. Props comparison is shallow (selectorOrAtom, equals references)
 *
 * Renders `selected ?? null` to handle null/undefined values gracefully in JSX.
 */
const Rx = memo(
  function Rx(props: {
    selectorOrAtom: ContextSelectorFn<any> | Atom<any, any>;
    equals?: Equality<any>;
  }) {
    // Convert atom shorthand to context selector
    const selector: ContextSelectorFn<any> = isAtom(props.selectorOrAtom)
      ? ({ get }) => get(props.selectorOrAtom as Atom<any, any>)
      : (props.selectorOrAtom as ContextSelectorFn<any>);

    const selected = useSelector(selector, props.equals);
    return <>{selected ?? null}</>;
  },
  (prev, next) =>
    shallowEqual(prev.selectorOrAtom, next.selectorOrAtom) &&
    prev.equals === next.equals
);
