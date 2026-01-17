import { Atom, DerivedOptions, Getter } from './types';
/**
 * Creates a derived (computed) atom from source atom(s).
 *
 * Derived atoms are **read-only** and automatically recompute when their
 * source atoms change. They provide a way to compute values from other atoms
 * without manual subscription management.
 *
 * ## Two Forms
 *
 * 1. **Single source**: `derived(atom, (get) => get() * 2)`
 * 2. **Array of atoms**: `derived([a, b], (getA, getB) => getA() + getB())`
 *
 * ## Key Features
 *
 * 1. **Lazy computation**: Value is computed on first access, not at creation
 * 2. **Automatic updates**: Recomputes when any source atom changes
 * 3. **Equality checking**: Only notifies subscribers if derived value actually changed
 * 4. **Suspense-like async**: Getters throw promise if loading, throw error if errored
 * 5. **Race condition safe**: Stale promise resolutions are ignored
 * 6. **Conditional dependencies**: Only subscribes to atoms actually accessed
 *
 * ## Suspense-Style Getters
 *
 * The getter functions passed to your derivation function behave like Suspense:
 * - If source atom is **loading**: getter throws the promise
 * - If source atom has **error**: getter throws the error
 * - If source atom has **value**: getter returns the value
 *
 * This means derived atoms automatically propagate loading/error states.
 *
 * ## Conditional Dependencies
 *
 * Only atoms that are actually accessed during computation become dependencies:
 *
 * ```ts
 * const flag = atom(true);
 * const a = atom(1);
 * const b = atom(2);
 *
 * const result = derived([flag, a, b], (getFlag, getA, getB) =>
 *   getFlag() ? getA() : getB()
 * );
 * // When flag is true: only subscribes to flag and a
 * // When flag is false: only subscribes to flag and b
 * ```
 *
 * ## Important: No Async Return Values
 *
 * The derivation function must return a **synchronous** value, not a Promise.
 * For async derived values, use an async source atom instead.
 *
 * @template D - Source atom value type (single) or tuple of source atoms (array)
 * @template T - Derived value type
 * @param source - Single atom or array of atoms to derive from
 * @param fn - Derivation function receiving getter(s) and returning the derived value
 * @param options - Optional configuration (meta for devtools)
 * @returns A read-only derived atom
 *
 * @example Single source - simple derivation
 * ```ts
 * const count = atom(5);
 * const doubled = derived(count, (get) => get() * 2);
 *
 * console.log(doubled.value); // 10
 *
 * count.set(10);
 * console.log(doubled.value); // 20
 * ```
 *
 * @example Multiple sources - combining atoms
 * ```ts
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * const fullName = derived(
 *   [firstName, lastName],
 *   (getFirst, getLast) => `${getFirst()} ${getLast()}`
 * );
 *
 * console.log(fullName.value); // "John Doe"
 * ```
 *
 * @example Filtering and transforming
 * ```ts
 * const todos = atom([
 *   { id: 1, text: "Learn React", done: true },
 *   { id: 2, text: "Learn atomirx", done: false },
 * ]);
 *
 * const activeTodos = derived(todos, (get) =>
 *   get().filter(todo => !todo.done)
 * );
 *
 * const todoCount = derived(todos, (get) => ({
 *   total: get().length,
 *   active: get().filter(t => !t.done).length,
 *   completed: get().filter(t => t.done).length,
 * }));
 * ```
 *
 * @example Conditional dependencies
 * ```ts
 * const showDetails = atom(false);
 * const basicInfo = atom({ name: "John" });
 * const detailedInfo = atom({ name: "John", email: "john@example.com", phone: "..." });
 *
 * const userInfo = derived(
 *   [showDetails, basicInfo, detailedInfo],
 *   (getShowDetails, getBasicInfo, getDetailedInfo) =>
 *     getShowDetails() ? getDetailedInfo() : getBasicInfo()
 * );
 * // Only subscribes to accessed atoms - efficient!
 * ```
 *
 * @example With async source atoms
 * ```ts
 * const userAtom = atom(fetchUser()); // Async atom
 * const postsAtom = atom(fetchPosts()); // Async atom
 *
 * const userWithPosts = derived(
 *   [userAtom, postsAtom],
 *   (getUser, getPosts) => ({
 *     user: getUser(),    // Throws promise if loading
 *     posts: getPosts(),  // Throws promise if loading
 *   })
 * );
 *
 * // userWithPosts.loading is true while either source is loading
 * // userWithPosts.error is set if either source has error
 * ```
 *
 * @example Subscribing to changes
 * ```ts
 * const count = atom(0);
 * const doubled = derived(count, (get) => get() * 2);
 *
 * // Subscribe to derived value changes
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
 * const processed = derived(asyncAtom, (get) => processData(get()));
 *
 * // Wait for the derived value to be ready
 * const result = await processed;
 * console.log(result);
 * ```
 *
 * @example Combining multiple async atoms with async utilities
 * ```ts
 * import { all, settled } from "atomirx";
 *
 * const userAtom = atom(fetchUser());
 * const postsAtom = atom(fetchPosts());
 *
 * const dashboard = derived(
 *   [userAtom, postsAtom],
 *   (getUser, getPosts) => {
 *     // Use all() to wait for multiple atoms
 *     const [user, posts] = all([getUser, getPosts]);
 *     return { user, posts };
 *
 *     // Or use settled() to handle partial failures
 *     // const results = settled({ user: getUser, posts: getPosts });
 *   }
 * );
 *
 * // dashboard.loading is true until all sources resolve
 * // dashboard.value contains { user, posts } when ready
 * ```
 * @see all, race, any, settled in core/async.ts for more async utilities
 */
export declare function derived<D, T>(source: Atom<D, any>, fn: (source: Getter<D>) => T, options?: DerivedOptions): T extends PromiseLike<any> ? never : Atom<T>;
export declare function derived<const D extends readonly Atom<any, any>[], T>(source: D, fn: (...values: {
    [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
}) => T, options?: DerivedOptions): T extends PromiseLike<any> ? never : Atom<T>;
