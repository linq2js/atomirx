import { ReactiveSelector } from "../core/select";
import { Atom, Equality } from "../core/types";
import { useAsyncState } from "./useAsyncState";

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
 * useValue(async ({ read }) => {
 *   const data = await fetch('/api');
 *   return data;
 * });
 *
 * // ❌ WRONG - Don't return a Promise
 * useValue(({ read }) => fetch('/api').then(r => r.json()));
 *
 * // ✅ CORRECT - Create async atom and read with read()
 * const data$ = atom(fetch('/api').then(r => r.json()));
 * useValue(({ read }) => read(data$)); // Suspends until resolved
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
 * const data = useValue(({ read }) => {
 *   try {
 *     return read(asyncAtom$);
 *   } catch (e) {
 *     return null; // This catches BOTH errors AND loading promises!
 *   }
 * });
 *
 * // ✅ CORRECT - Use safe() to catch errors but preserve Suspense
 * const result = useValue(({ read, safe }) => {
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
 * ## Alternative: useAsyncState for Non-Suspense
 *
 * If you want to handle loading/error states imperatively without Suspense:
 *
 * ```tsx
 * import { useAsyncState } from 'atomirx/react';
 *
 * function MyComponent() {
 *   const state = useAsyncState(myAtom$);
 *
 *   if (state.status === "loading") return <Spinner />;
 *   if (state.status === "error") return <Error error={state.error} />;
 *   return <div>{state.value}</div>;
 * }
 * ```
 *
 * @template T - The type of the selected value
 * @param selectorOrAtom - Atom or context-based selector function (must return sync value)
 * @param equals - Equality function or shorthand. Defaults to "shallow"
 * @returns The selected value (Awaited<T>)
 * @throws Promise when loading (caught by Suspense)
 * @throws Error when failed (caught by ErrorBoundary)
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
 *   const doubled = useValue(({ read }) => read(count) * 2);
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
 *   const fullName = useValue(({ read }) =>
 *     `${read(firstName)} ${read(lastName)}`
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
 *   const user = useValue(({ read }) => read(userAtom));
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
  // Use useAsyncState as the base implementation
  const state = useAsyncState(selectorOrAtom as Atom<T>, equals);

  // Handle Suspense-style states by throwing
  if (state.status === "loading") {
    throw state.promise;
  }

  if (state.status === "error") {
    throw state.error;
  }

  return state.value as T;
}
