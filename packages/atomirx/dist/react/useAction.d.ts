/**
 * State for an action that hasn't been dispatched yet.
 */
export type ActionIdleState = {
    readonly status: "idle";
    readonly result: undefined;
    readonly error: undefined;
};
/**
 * State for an action that is currently executing.
 */
export type ActionLoadingState = {
    readonly status: "loading";
    readonly result: undefined;
    readonly error: undefined;
};
/**
 * State for an action that completed successfully.
 */
export type ActionSuccessState<T> = {
    readonly status: "success";
    readonly result: T;
    readonly error: undefined;
};
/**
 * State for an action that failed with an error.
 */
export type ActionErrorState = {
    readonly status: "error";
    readonly result: undefined;
    readonly error: unknown;
};
/**
 * Union of all possible action states.
 */
export type ActionState<T> = ActionIdleState | ActionLoadingState | ActionSuccessState<T> | ActionErrorState;
/**
 * Action state without idle (used when lazy is false).
 */
export type ActionStateWithoutIdle<T> = Exclude<ActionState<T>, ActionIdleState>;
/**
 * A promise with an abort method for manual cancellation.
 */
export type AbortablePromise<T> = PromiseLike<T> & {
    abort: () => void;
};
/**
 * Options for useAction hook.
 */
export interface UseActionOptions {
    /**
     * If true, waits for manual call to execute. If false, executes on mount and when deps change.
     * - `lazy: true` (default) - Action starts in "idle" state, waits for you to call it
     * - `lazy: false` - Action executes immediately on mount and re-executes when deps change
     * @default true
     */
    lazy?: boolean;
    /**
     * If true, only one request runs at a time - previous requests are aborted.
     * Also aborts on unmount and reset().
     * - `exclusive: true` (default) - Aborts previous request on re-call, unmount, deps change, reset()
     * - `exclusive: false` - Allows concurrent requests, manual abort only via abort() or promise.abort()
     * @default true
     */
    exclusive?: boolean;
    /**
     * Dependencies array. When lazy is false, re-executes when deps change.
     * - Regular values: compared by reference (like useEffect deps)
     * - Atoms: automatically tracked via useSelector, re-executes when atom values change
     * @default []
     */
    deps?: unknown[];
}
/**
 * Context passed to the action function.
 */
export interface ActionContext {
    /** AbortSignal for cancellation. New signal per dispatch. */
    signal: AbortSignal;
}
/**
 * API methods for controlling the action.
 */
export type ActionApi = {
    /** Abort the current in-flight request. */
    abort: () => void;
    /** Reset state back to idle. Respects exclusive setting. */
    reset: () => void;
};
/**
 * Dispatch function type - callable and returns AbortablePromise.
 */
export type ActionDispatch<T> = () => AbortablePromise<T extends PromiseLike<infer U> ? U : T>;
/**
 * Return type for useAction - a callable dispatch function with state and API attached.
 *
 * @example
 * ```ts
 * const fetchPosts = useAction(async () => api.getPosts());
 *
 * // Call it like a function
 * const posts = await fetchPosts();
 *
 * // Access state via properties
 * fetchPosts.loading   // boolean
 * fetchPosts.status    // "idle" | "loading" | "success" | "error"
 * fetchPosts.result    // Post[] | undefined
 * fetchPosts.error     // unknown
 * fetchPosts.abort()   // cancel current request
 * fetchPosts.reset()   // reset state to idle
 * ```
 */
export type Action<T> = ActionDispatch<T> & ActionState<T extends PromiseLike<infer U> ? U : T> & ActionApi;
/**
 * React hook for handling async actions with loading/error states and abort support.
 *
 * `useAction` provides a complete solution for managing async operations in React,
 * with automatic state tracking, cancellation support, and race condition handling.
 *
 * Returns a callable function with state properties attached, making it easy to
 * manage multiple actions in a single component:
 *
 * ```tsx
 * const fetchUser = useAction(() => api.getUser(id));
 * const updateUser = useAction(() => api.updateUser(id, data));
 * const deleteUser = useAction(() => api.deleteUser(id));
 *
 * // Call directly - no need to destructure
 * await fetchUser();
 *
 * // Access state via properties
 * fetchUser.loading    // boolean
 * fetchUser.result     // User | undefined
 * fetchUser.error      // unknown
 * fetchUser.status     // "idle" | "loading" | "success" | "error"
 * fetchUser.abort()    // cancel request
 * fetchUser.reset()    // reset to idle state
 * ```
 *
 * ## Key Features
 *
 * 1. **Automatic state management**: Tracks idle → loading → success/error transitions
 * 2. **AbortSignal support**: Built-in cancellation via AbortController
 * 3. **Exclusive mode**: Only one request at a time - previous aborted automatically (configurable)
 * 4. **Lazy/eager execution**: Wait for manual call or execute on mount (configurable)
 * 5. **Stale closure prevention**: Ignores outdated results from cancelled requests
 * 6. **Atom deps support**: Atoms in deps array are reactively tracked
 *
 * ## State Machine
 *
 * ```
 * ┌──────┐  dispatch()  ┌─────────┐  success  ┌─────────┐
 * │ idle │ ───────────► │ loading │ ────────► │ success │
 * └──────┘              └─────────┘           └─────────┘
 *                            │
 *                            │ error
 *                            ▼
 *                       ┌─────────┐
 *                       │  error  │
 *                       └─────────┘
 * ```
 *
 * ## Exclusive Mode (exclusive option)
 *
 * The `exclusive` option controls whether only one request can run at a time:
 *
 * | Trigger | exclusive: true (default) | exclusive: false |
 * |---------|---------------------------|------------------|
 * | Call action again | ✅ Aborts previous | ❌ No abort |
 * | Component unmounts | ✅ Aborts current | ❌ No abort |
 * | Deps change (lazy: false) | ✅ Aborts previous | ❌ No abort |
 * | `reset()` called | ✅ Aborts current | ❌ No abort |
 * | `abort()` called | ✅ Always aborts | ✅ Always aborts |
 * | `promise.abort()` called | ✅ Always aborts | ✅ Always aborts |
 *
 * ## Reset Behavior
 *
 * `reset()` clears the state back to idle and respects `exclusive`:
 * - **exclusive: true**: Aborts any in-flight request, then resets to idle
 * - **exclusive: false**: Only resets state (request continues in background)
 *
 * ## Race Condition Handling
 *
 * When a new dispatch starts before the previous completes:
 * - Previous request's result is ignored (even if it resolves)
 * - Only the latest request's result updates state
 * - This prevents stale data from overwriting fresh data
 *
 * @template T - The return type of the action function
 * @param fn - Action function receiving `{ signal: AbortSignal }`. Can be sync or async.
 * @param options - Configuration options
 * @param options.lazy - If true (default), waits for manual call. If false, executes on mount.
 * @param options.exclusive - If true (default), aborts previous request on re-call/unmount.
 * @param options.deps - Dependencies for lazy: false mode. Atoms are reactively tracked.
 * @returns A callable dispatch function with state and API properties attached
 *
 * @example Basic usage - manual dispatch
 * ```tsx
 * function UserProfile({ userId }) {
 *   const fetchUser = useAction(async ({ signal }) => {
 *     const response = await fetch(`/api/users/${userId}`, { signal });
 *     if (!response.ok) throw new Error('Failed to fetch');
 *     return response.json();
 *   });
 *
 *   return (
 *     <div>
 *       {fetchUser.status === 'idle' && <button onClick={fetchUser}>Load User</button>}
 *       {fetchUser.status === 'loading' && <Spinner />}
 *       {fetchUser.status === 'success' && <div>{fetchUser.result.name}</div>}
 *       {fetchUser.status === 'error' && <div>Error: {fetchUser.error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Eager execution on mount and deps change
 * ```tsx
 * function UserProfile({ userId }) {
 *   const fetchUser = useAction(
 *     async ({ signal }) => {
 *       const response = await fetch(`/api/users/${userId}`, { signal });
 *       return response.json();
 *     },
 *     { lazy: false, deps: [userId] }
 *   );
 *   // Fetches automatically on mount
 *   // Re-fetches when userId changes
 *   // Previous request is aborted when userId changes
 * }
 * ```
 *
 * @example Eager execution with atom deps
 * ```tsx
 * const userIdAtom = atom(1);
 *
 * function UserProfile() {
 *   const fetchUser = useAction(
 *     async ({ signal }) => fetchUserApi(userIdAtom.value, { signal }),
 *     { lazy: false, deps: [userIdAtom] }
 *   );
 *   // Automatically re-fetches when userIdAtom changes
 *   // Atoms in deps are tracked reactively via useSelector
 * }
 * ```
 *
 * @example Allow concurrent requests (non-exclusive)
 * ```tsx
 * function SearchResults() {
 *   const search = useAction(
 *     async ({ signal }) => searchAPI(query, { signal }),
 *     { exclusive: false }
 *   );
 *
 *   return (
 *     <div>
 *       <button onClick={search}>Search</button>
 *       <button onClick={search.abort} disabled={search.status !== 'loading'}>
 *         Cancel
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Abort via returned promise
 * ```tsx
 * const longTask = useAction(async ({ signal }) => longRunningTask({ signal }));
 *
 * const handleClick = () => {
 *   const promise = longTask();
 *
 *   // Abort after 5 seconds
 *   setTimeout(() => promise.abort(), 5000);
 *
 *   // Or await the result
 *   try {
 *     const result = await promise;
 *   } catch (error) {
 *     if (error.name === 'AbortError') {
 *       console.log('Request was cancelled');
 *     }
 *   }
 * };
 * ```
 *
 * @example Chaining multiple actions
 * ```tsx
 * function CreateUserForm() {
 *   const createUser = useAction(({ signal }) => api.createUser(data, { signal }));
 *   const sendWelcomeEmail = useAction(({ signal }) => api.sendEmail(email, { signal }));
 *
 *   const handleSubmit = async () => {
 *     try {
 *       const user = await createUser();
 *       await sendWelcomeEmail();
 *       toast.success('User created and email sent!');
 *     } catch (error) {
 *       toast.error('Operation failed');
 *     }
 *   };
 *
 *   const isLoading = createUser.status === 'loading' || sendWelcomeEmail.status === 'loading';
 *
 *   return <button onClick={handleSubmit} disabled={isLoading}>Create User</button>;
 * }
 * ```
 *
 * @example Sync action (non-async function)
 * ```tsx
 * const compute = useAction(({ signal }) => {
 *   // Sync computation - still works!
 *   return computeExpensiveValue(data);
 * });
 * // compute() returns a promise that resolves immediately
 * ```
 *
 * @example Form submission with validation
 * ```tsx
 * function ContactForm() {
 *   const [formData, setFormData] = useState({ name: '', email: '' });
 *
 *   const submit = useAction(async ({ signal }) => {
 *     // Validate
 *     if (!formData.name) throw new Error('Name required');
 *
 *     // Submit
 *     const response = await fetch('/api/contact', {
 *       method: 'POST',
 *       body: JSON.stringify(formData),
 *       signal,
 *     });
 *
 *     if (!response.ok) throw new Error('Submission failed');
 *     return response.json();
 *   });
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
 *       <input value={formData.name} onChange={...} />
 *       <input value={formData.email} onChange={...} />
 *       <button disabled={submit.status === 'loading'}>
 *         {submit.status === 'loading' ? 'Submitting...' : 'Submit'}
 *       </button>
 *       {submit.status === 'error' && <p className="error">{submit.error.message}</p>}
 *       {submit.status === 'success' && <p className="success">Submitted!</p>}
 *     </form>
 *   );
 * }
 * ```
 *
 * @example Reset after success or error
 * ```tsx
 * function SubmitForm() {
 *   const submit = useAction(async () => api.submit(data));
 *
 *   if (submit.status === 'success') {
 *     return (
 *       <div>
 *         <p>Success!</p>
 *         <button onClick={submit.reset}>Submit Another</button>
 *       </div>
 *     );
 *   }
 *
 *   if (submit.status === 'error') {
 *     return (
 *       <div>
 *         <p>Error: {submit.error.message}</p>
 *         <button onClick={submit.reset}>Dismiss</button>
 *         <button onClick={submit}>Retry</button>
 *       </div>
 *     );
 *   }
 *
 *   return <button onClick={submit} disabled={submit.status === 'loading'}>Submit</button>;
 * }
 * ```
 */
export declare function useAction<T>(fn: (context: ActionContext) => T, options?: UseActionOptions): Action<T>;
