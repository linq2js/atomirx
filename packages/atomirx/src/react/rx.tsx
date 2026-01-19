import {
  Component,
  memo,
  ReactElement,
  ReactNode,
  Suspense,
  ErrorInfo,
  useCallback,
  useRef,
} from "react";
import { Atom, Equality } from "../core/types";
import { useSelector } from "./useSelector";
import { shallowEqual } from "../core/equality";
import { isAtom } from "../core/isAtom";
import { ReactiveSelector, SelectContext } from "../core/select";

/**
 * Options for rx() with inline loading/error handling and memoization control.
 */
export interface RxOptions<T> {
  /** Equality function for value comparison */
  equals?: Equality<T>;
  /** Render function for loading state */
  loading?: () => ReactNode;
  /** Render function for error state */
  error?: (props: { error: unknown }) => ReactNode;

  /**
   * Dependencies array for selector memoization.
   *
   * Controls when the selector callback is recreated:
   * - **Atom shorthand** (`rx(atom$)`): Always memoized by atom reference (deps ignored)
   * - **Function selector without deps**: No memoization (recreated every render)
   * - **Function selector with `deps: []`**: Stable forever (never recreated)
   * - **Function selector with `deps: [a, b]`**: Recreated when deps change
   *
   * @example
   * ```tsx
   * // No memoization (default for functions) - selector recreated every render
   * rx(({ read }) => read(count$) * 2)
   *
   * // Stable selector - never recreated
   * rx(({ read }) => read(count$) * 2, { deps: [] })
   *
   * // Recreate when multiplier changes
   * rx(({ read }) => read(count$) * multiplier, { deps: [multiplier] })
   * ```
   */
  deps?: unknown[];
}

/**
 * Reactive inline component that renders atom values directly in JSX.
 *
 * `rx` is a convenience wrapper around `useSelector` that returns a memoized
 * React component instead of a value. This enables fine-grained reactivity
 * without creating separate components for each reactive value.
 *
 * ## IMPORTANT: Selector Must Return Synchronous Value
 *
 * **The selector function MUST NOT be async or return a Promise.**
 *
 * ```tsx
 * // ❌ WRONG - Don't use async function
 * rx(async ({ read }) => {
 *   const data = await fetch('/api');
 *   return data.name;
 * });
 *
 * // ❌ WRONG - Don't return a Promise
 * rx(({ read }) => fetch('/api').then(r => r.json()));
 *
 * // ✅ CORRECT - Create async atom and read with read()
 * const data$ = atom(fetch('/api').then(r => r.json()));
 * rx(({ read }) => read(data$).name); // Suspends until resolved
 * ```
 *
 * ## IMPORTANT: Do NOT Use try/catch - Use safe() Instead
 *
 * **Never wrap `read()` calls in try/catch blocks.** The `read()` function throws
 * Promises when atoms are loading (Suspense pattern). A try/catch will catch
 * these Promises and break the Suspense mechanism.
 *
 * ```tsx
 * // ❌ WRONG - Catches Suspense Promise, breaks loading state
 * rx(({ read }) => {
 *   try {
 *     return <span>{read(user$).name}</span>;
 *   } catch (e) {
 *     return <span>Error</span>; // Catches BOTH errors AND loading promises!
 *   }
 * });
 *
 * // ✅ CORRECT - Use safe() to catch errors but preserve Suspense
 * rx(({ read, safe }) => {
 *   const [err, user] = safe(() => read(user$));
 *   if (err) return <span>Error: {err.message}</span>;
 *   return <span>{user.name}</span>;
 * });
 * ```
 *
 * The `safe()` utility:
 * - **Catches errors** and returns `[error, undefined]`
 * - **Re-throws Promises** to preserve Suspense behavior
 * - Returns `[undefined, result]` on success
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
 *       {rx(({ read }) =>
 *         read(postsAtom).map((post) => <Post post={post} />)
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
 *         {rx(({ read }) => read(userAtom).name)}
 *       </Suspense>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * Or catch errors in the selector to handle loading/error inline:
 * ```tsx
 * {rx(({ read }) => {
 *   try {
 *     return read(userAtom).name;
 *   } catch {
 *     return "Loading...";
 *   }
 * })}
 * ```
 *
 * @template T - The type of the selected/derived value
 * @param selector - Context-based selector function with `{ read, all, any, race, settled }`.
 *                   Must return sync value, not a Promise.
 * @param equals - Equality function or shorthand ("strict", "shallow", "deep").
 *                 Defaults to "shallow".
 * @returns A React element that renders the selected value
 * @throws Error if selector returns a Promise or PromiseLike
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
 *   return <div>Doubled: {rx(({ read }) => read(count) * 2)}</div>;
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
 *       {rx(({ read }) => `${read(firstName)} ${read(lastName)}`)}
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
 *         <Suspense fallback="...">{rx(({ read }) => read(userAtom).name)}</Suspense>
 *       </header>
 *       <main>
 *         <Suspense fallback="...">
 *           {rx(({ read }) => read(postsAtom).length)} posts
 *         </Suspense>
 *         <Suspense fallback="...">
 *           {rx(({ read }) => read(notificationsAtom).length)} notifications
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
 *       {rx(({ read }) =>
 *         read(showDetails) ? read(details) : read(summary)
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
 *         ({ read }) => read(user).name,
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
 *         const [user, posts] = all([user$, posts$]);
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
export function rx<T extends ReactNode | PromiseLike<ReactNode>>(
  atom: Atom<T>,
  options?: Equality<T> | RxOptions<T>
): ReactElement;

// Overload: Context-based selector function
export function rx<T extends ReactNode | PromiseLike<ReactNode>>(
  selector: ReactiveSelector<T>,
  options?: Equality<T> | RxOptions<T>
): ReactElement;

export function rx<T>(
  selectorOrAtom: ReactiveSelector<T> | Atom<T>,
  options?: Equality<unknown> | RxOptions<unknown>
): ReactElement {
  // Normalize options
  const normalizedOptions: RxOptions<unknown> | undefined =
    options === undefined
      ? undefined
      : typeof options === "object" &&
          options !== null &&
          !Array.isArray(options) &&
          ("equals" in options || "loading" in options || "error" in options)
        ? (options as RxOptions<unknown>)
        : { equals: options as Equality<unknown> };

  return (
    <Rx
      selectorOrAtom={
        selectorOrAtom as ReactiveSelector<unknown> | Atom<unknown>
      }
      options={normalizedOptions}
    />
  );
}

/**
 * Internal ErrorBoundary for rx with error handler.
 */
interface RxErrorBoundaryProps {
  children: ReactNode;
  onError?: (props: { error: unknown }) => ReactNode;
}

interface RxErrorBoundaryState {
  error: unknown | null;
}

class RxErrorBoundary extends Component<
  RxErrorBoundaryProps,
  RxErrorBoundaryState
> {
  state: RxErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): RxErrorBoundaryState {
    return { error };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error already captured in state
  }

  render() {
    if (this.state.error !== null && this.props.onError) {
      return <>{this.props.onError({ error: this.state.error })}</>;
    }

    if (this.state.error !== null) {
      // No handler - re-throw to parent ErrorBoundary
      throw this.state.error;
    }

    return this.props.children;
  }
}

/**
 * Internal component that renders the selector value.
 */
function RxInner(props: {
  selector: ReactiveSelector<unknown>;
  equals?: Equality<unknown>;
}) {
  const selected = useSelector(props.selector, props.equals);
  return <>{selected ?? null}</>;
}

/**
 * Wrapper component to defer loading() call until actually needed.
 */
function RxLoadingFallback(props: { render: () => ReactNode }) {
  return <>{props.render()}</>;
}

/**
 * Optional Suspense wrapper - only wraps if fallback is provided.
 */
function RxSuspenseWrapper(props: {
  fallback?: () => ReactNode;
  children: ReactNode;
}) {
  if (props.fallback) {
    return (
      <Suspense fallback={<RxLoadingFallback render={props.fallback} />}>
        {props.children}
      </Suspense>
    );
  }
  return <>{props.children}</>;
}

/**
 * Optional ErrorBoundary wrapper - only wraps if onError is provided.
 */
function RxErrorWrapper(props: {
  onError?: (props: { error: unknown }) => ReactNode;
  children: ReactNode;
}) {
  if (props.onError) {
    return (
      <RxErrorBoundary onError={props.onError}>
        {props.children}
      </RxErrorBoundary>
    );
  }
  return <>{props.children}</>;
}

/**
 * Internal memoized component that handles the actual subscription and rendering.
 *
 * Memoized with React.memo to ensure:
 * 1. Parent components don't cause unnecessary re-renders
 * 2. Only atom changes trigger re-renders
 * 3. Props comparison is shallow (selectorOrAtom, options references)
 *
 * Renders `selected ?? null` to handle null/undefined values gracefully in JSX.
 */
const Rx = memo(
  function Rx(props: {
    selectorOrAtom: ReactiveSelector<unknown> | Atom<unknown>;
    options?: RxOptions<unknown>;
  }) {
    // Store latest selector/atom in ref to avoid stale closures
    const selectorRef = useRef(props.selectorOrAtom);
    selectorRef.current = props.selectorOrAtom;

    // Compute memoization dependencies:
    // - Atom: always include atom reference for stability
    // - Function + no deps: new object each render (no memoization)
    // - Function + deps: use provided deps for controlled memoization
    const isAtomInput = isAtom(props.selectorOrAtom);
    const userDeps = props.options?.deps;
    const deps = isAtomInput
      ? [props.selectorOrAtom, ...(userDeps ?? [])] // Atom: stable + optional user deps
      : (userDeps ?? [{}]); // Function: user deps or no memoization

    // Memoized selector that reads from ref to always get latest value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const selector = useCallback(
      (context: SelectContext) =>
        isAtom(selectorRef.current)
          ? context.read(selectorRef.current as Atom<unknown>)
          : (selectorRef.current as ReactiveSelector<unknown>)(context),
      deps
    );

    return (
      <RxErrorWrapper onError={props.options?.error}>
        <RxSuspenseWrapper fallback={props.options?.loading}>
          <RxInner selector={selector} equals={props.options?.equals} />
        </RxSuspenseWrapper>
      </RxErrorWrapper>
    );
  },
  (prev, next) =>
    shallowEqual(prev.selectorOrAtom, next.selectorOrAtom) &&
    shallowEqual(prev.options, next.options)
);
