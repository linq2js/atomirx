# React Integration

## Overview

| Hook          | Purpose                                 | Creates Subscription |
| ------------- | --------------------------------------- | -------------------- |
| `useSelector` | Read atoms with automatic re-rendering  | Yes                  |
| `rx`          | Inline reactive components              | Yes                  |
| `useAction`   | Async operations with state management  | No (manual)          |
| `useStable`   | Stable references for objects/callbacks | No                   |

## useSelector Hook

Subscribe to atom values with automatic re-rendering.

### CRITICAL: MUST Group Multiple Selectors

**MUST** group multiple atom reads into a single `useSelector` call. Each `useSelector` creates a separate subscription - grouping reduces re-renders and improves performance. **NEVER** use multiple separate `useSelector` calls for atoms that are used together.

```tsx
// ✅ REQUIRED: Group multiple reads into single useSelector
const { count, user, settings } = useSelector(({ read }) => ({
  count: read(count$),
  user: read(user$),
  settings: read(settings$),
}));

// ❌ FORBIDDEN: Multiple separate useSelector calls
const count = useSelector(count$);
const user = useSelector(user$);
const settings = useSelector(settings$);
```

**Why grouping matters:**

- Each `useSelector` creates an independent subscription
- Multiple subscriptions = multiple re-render checks per state change
- Grouped selector computes all values in single subscription
- Easier to add custom equality check for the entire result

### Basic Usage

```tsx
import { useSelector } from "atomirx/react";

// Single atom shorthand (OK when only one atom needed)
const count = useSelector(count$);

// Selector: compute derived value
const doubled = useSelector(({ read }) => read(count$) * 2);

// Multiple atoms - ALWAYS use grouped form
const display = useSelector(({ read }) => {
  const count = read(count$);
  const user = read(user$);
  return user ? `${user.name}: ${count}` : `Anonymous: ${count}`;
});
```

### With Pool (from())

```tsx
// Access pool entries reactively
const user = useSelector(({ read, from }) => {
  const user$ = from(userPool, userId);
  return read(user$);
});
```

### All Context Methods Available

```tsx
// all() - Wait for multiple atoms
const [user, posts] = useSelector(({ all }) => all([user$, posts$]));

// state() - Manual loading handling (no Suspense)
const userState = useSelector(({ state }) => state(user$));
// { status: "loading" | "ready" | "error", value, error }

// safe() - Error handling preserving Suspense
const result = useSelector(({ read, safe }) => {
  const [err, data] = safe(() => JSON.parse(read(rawJson$)));
  return err ? { error: err.message } : { data };
});

// any() - First ready
const fastest = useSelector(({ any }) => any({ cache: cache$, api: api$ }));

// settled() - All results
const results = useSelector(({ settled }) => settled([a$, b$, c$]));

// and()/or() - Boolean logic
const canEdit = useSelector(({ and }) => and([isLoggedIn$, hasEditRole$]));
```

### Custom Equality

```tsx
// Default equality is "shallow"
const user = useSelector(({ read }) => read(user$));

// Custom equality function
const userName = useSelector(
  ({ read }) => read(user$)?.name,
  (prev, next) => prev === next // Only re-render when name changes
);

// Equality shorthands
const data = useSelector(({ read }) => read(data$), "deep"); // Deep comparison
```

## rx() - Inline Reactive Components

For inline reactive rendering without separate components:

```tsx
function Stats() {
  return (
    <footer>
      {rx(({ read }) => {
        const { total, completed } = read(stats$);
        return (
          <span>
            {completed} of {total} done
          </span>
        );
      })}
    </footer>
  );
}
```

### With Loading and Error Handlers

```tsx
{
  rx(({ read }) => <UserCard user={read(user$)} />, {
    loading: <Skeleton />,
    error: (err) => <ErrorMessage error={err} />,
  });
}
```

### With deps for Memoization

```tsx
{
  rx(
    ({ read }) => {
      const user = read(user$);
      return <ExpensiveComponent user={user} filter={filter} />;
    },
    { deps: [filter] } // Re-create when filter changes
  );
}
```

## useAction Hook

Handle async operations with loading/error states. Returns a callable function with state properties attached.

### Basic Usage

```tsx
import { useAction } from "atomirx/react";

function SaveButton() {
  const save = useAction(async ({ signal }) => {
    await saveData(data$.get(), { signal });
  });

  return (
    <button onClick={save} disabled={save.status === "loading"}>
      {save.status === "loading" ? "Saving..." : "Save"}
    </button>
  );
}
```

### Action API

```tsx
const action = useAction(async ({ signal }) => fetchData({ signal }));

// Call like a function - returns AbortablePromise
const promise = action();
await promise;
promise.abort(); // Abort this specific request

// Access state via properties
action.status; // "idle" | "loading" | "success" | "error"
action.result; // TResult | undefined
action.error; // unknown

// Control methods
action.abort(); // Abort current request
action.reset(); // Reset to idle state
```

### State Machine

```
┌──────┐  dispatch()  ┌─────────┐  success  ┌─────────┐
│ idle │ ───────────► │ loading │ ────────► │ success │
└──────┘              └─────────┘           └─────────┘
                           │
                           │ error
                           ▼
                      ┌─────────┐
                      │  error  │
                      └─────────┘
```

### Options

```tsx
interface UseActionOptions {
  /**
   * If true (default), waits for manual call.
   * If false, executes on mount and when deps change.
   */
  lazy?: boolean;

  /**
   * If true (default), aborts previous request on re-call/unmount.
   * If false, allows concurrent requests.
   */
  exclusive?: boolean;

  /**
   * Dependencies. When lazy: false, re-executes when deps change.
   * Atoms are automatically tracked via useSelector.
   */
  deps?: unknown[];
}
```

### Auto-execute on Mount (lazy: false)

```tsx
const fetchUser = useAction(
  async ({ signal }) => {
    const res = await fetch(`/api/users/${userId}`, { signal });
    return res.json();
  },
  { lazy: false, deps: [userId] }
);
// Executes immediately, re-fetches when userId changes
// Previous request is aborted when userId changes
```

### Auto Re-dispatch with Atom Dependencies (IMPORTANT)

When using `lazy: false` and you want the action to re-dispatch when atoms change, **MUST** pass atoms directly to `deps` and use `.get()` inside the action.

```tsx
// ✅ REQUIRED: Pass atoms to deps, use .get() inside action
const loadData = useAction(
  async ({ signal }) => {
    const filter = filterAtom$.get();
    const config = await configAtom$.get();
    return fetchData(filter, config, { signal });
  },
  { deps: [filterAtom$, configAtom$], lazy: false }
);
// Action auto re-dispatches when filterAtom$ or configAtom$ changes

// ❌ FORBIDDEN: Use useSelector + pass values to deps
const { filter, config } = useSelector(({ read }) => ({
  filter: read(filterAtom$),
  config: read(configAtom$), // BREAKS - Suspends HERE before useAction runs
}));
const loadData = useAction(async () => fetchData(filter, config), {
  deps: [filter, config],
  lazy: false,
});
```

**Why pass atoms to deps:**

| Approach                | Behavior                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| Atoms in deps           | Action reads latest values, no extra Suspense                    |
| Values from useSelector | Component suspends first, extra subscription, stale closure risk |

### Exclusive Mode (default: true)

```tsx
// Default: exclusive mode - only one request at a time
const search = useAction(async ({ signal }) => searchAPI(query, { signal }));
// Calling search() again aborts previous request

// Non-exclusive: allow concurrent
const search = useAction(async ({ signal }) => searchAPI(query, { signal }), {
  exclusive: false,
});
// Manual abort via search.abort() or promise.abort()
```

### Error Handling

```tsx
const submit = useAction(async ({ signal }) => {
  const res = await fetch("/api/submit", { method: "POST", signal });
  if (!res.ok) throw new Error("Failed");
  return res.json();
});

// In JSX
{
  submit.status === "error" && (
    <div className="error">
      {submit.error instanceof Error ? submit.error.message : "Unknown error"}
    </div>
  );
}
```

### Pattern: Form Submission

```tsx
function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const submit = useAction(async ({ signal }) => {
    if (!formData.name) throw new Error('Name required');

    const response = await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify(formData),
      signal,
    });

    if (!response.ok) throw new Error('Submission failed');
    return response.json();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input value={formData.name} onChange={...} />
      <input value={formData.email} onChange={...} />
      <button disabled={submit.status === 'loading'}>
        {submit.status === 'loading' ? 'Submitting...' : 'Submit'}
      </button>
      {submit.status === 'error' && <p className="error">{submit.error.message}</p>}
      {submit.status === 'success' && <p className="success">Submitted!</p>}
    </form>
  );
}
```

## useStable Hook (CRITICAL)

Provides stable references for objects, arrays, and callbacks. **MUST use instead of React's useCallback/useMemo. NEVER use React's useCallback/useMemo for callbacks or objects.**

### Why useStable?

In React, inline objects, arrays, and callbacks create new references every render:

```tsx
// ❌ Problem: new references every render
function Parent() {
  const config = { theme: "dark" }; // New object every render!
  const onClick = () => doSomething(); // New function every render!
  return <Child config={config} onClick={onClick} />;
}

// ✅ Solution: stable references
function Parent() {
  const stable = useStable({
    config: { theme: "dark" },
    onClick: () => doSomething(),
  });
  return <Child config={stable.config} onClick={stable.onClick} />;
}
```

### How It Works

Each property is independently stabilized based on type:

| Type           | Default Equality | Behavior                                   |
| -------------- | ---------------- | ------------------------------------------ |
| **Functions**  | N/A (wrapped)    | Reference never changes, calls latest impl |
| **Arrays**     | shallow          | Stable if items are reference-equal        |
| **Dates**      | timestamp        | Stable if same time value                  |
| **Objects**    | shallow          | Stable if keys have reference-equal values |
| **Primitives** | strict           | Stable if same value                       |

### Basic Usage

```tsx
const stable = useStable({
  // Callbacks - stable reference, always fresh closure
  onSubmit: () => auth.register(username),
  onLogin: () => auth.login(),
  onCancel: () => setView("idle"),

  // Config objects - stable if shallow equal
  config: {
    timeout: 5000,
    retries: 3,
  },

  // Arrays - stable if items are reference-equal
  columns: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ],

  // Dates - stable if same timestamp
  startDate: new Date(),
});

// Usage
stable.onSubmit();
<Table columns={stable.columns} />
<Settings config={stable.config} />
```

### Custom Equality per Property

```tsx
const stable = useStable(
  {
    user: { id: 1, profile: { name: "John", avatar: "..." } },
    tags: ["react", "typescript"],
    settings: { theme: "dark" },
  },
  {
    user: "deep", // Deep compare nested objects
    tags: "strict", // Override default shallow for arrays
    settings: "shallow", // Explicit (same as default)
  }
);
```

### Custom Equality Function

```tsx
const stable = useStable(
  { user: { id: 1, name: "John", updatedAt: new Date() } },
  {
    // Only compare by id - ignore name and updatedAt changes
    user: (a, b) => a?.id === b?.id,
  }
);
// stable.user reference only changes when id changes
```

### Pattern: Logic Hook

```tsx
export function useAuthPageLogic() {
  const auth = authStore();
  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");

  const stable = useStable({
    // Callbacks
    onRegister: async () => {
      if (!username.trim()) return;
      await auth.register(username.trim());
    },
    onLogin: async () => {
      await auth.login();
    },
    onSwitchToRegister: () => {
      auth.clearError();
      setView("register");
    },
    onSwitchToLogin: () => {
      auth.clearError();
      setView("login");
    },

    // Config
    formOptions: {
      validateOnBlur: true,
      validateOnChange: false,
    },
  });

  return {
    view,
    username,
    setUsername,
    ...stable,
  };
}
```

### useStable vs useCallback/useMemo (CRITICAL)

| Use Case                       | Use                                 |
| ------------------------------ | ----------------------------------- |
| Callbacks/handlers             | `useStable` (**ALWAYS**)            |
| Config objects passed as props | `useStable` (**REQUIRED**)          |
| Arrays passed as props         | `useStable` (**REQUIRED**)          |
| Expensive computed values      | `useMemo` (computation > stability) |
| Derived data from state        | `useMemo` or compute inline         |

```tsx
// ❌ FORBIDDEN: React useCallback/useMemo for callbacks/objects
const handleSubmit = useCallback(() => {
  auth.register(username);
}, [auth, username]);

const config = useMemo(() => ({ timeout: 5000 }), []);

// ✅ REQUIRED: useStable - MUST use for ALL callbacks and objects
const stable = useStable({
  handleSubmit: () => auth.register(username),
  config: { timeout: 5000 },
});
```

## Suspense Integration (RECOMMENDED)

atomirx is designed for React Suspense. **MUST** wrap components using async atoms with `Suspense` and `ErrorBoundary`:

```tsx
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  );
}

function Dashboard() {
  // Suspends automatically when user$ is loading
  const user = useSelector(user$);
  return <h1>Welcome, {user.name}</h1>;
}
```

### Nested Suspense Boundaries

```tsx
function ArticlePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticleHeader />

      <Suspense fallback={<CommentsSkeleton />}>
        <ArticleComments />
      </Suspense>
    </Suspense>
  );
}
```

### Non-Suspense Mode with state()

```tsx
function UserCard() {
  const userState = useSelector(({ state }) => state(user$));

  if (userState.status === "loading") return <Skeleton />;
  if (userState.status === "error") return <Error error={userState.error} />;
  return <div>{userState.value.name}</div>;
}
```

## Comparison with Other Libraries

| Use Case       | atomirx                                    | Jotai                          | Recoil                          |
| -------------- | ------------------------------------------ | ------------------------------ | ------------------------------- |
| Single atom    | `useSelector(atom$)`                       | `useAtomValue(atom)`           | `useRecoilValue(atom)`          |
| Derived value  | `useSelector(({ read }) => ...)`           | `useAtomValue(derivedAtom)`    | `useRecoilValue(selector)`      |
| Multiple atoms | `useSelector(({ all }) => all([a$, b$]))`  | Multiple `useAtomValue` calls  | Multiple `useRecoilValue` calls |
| Loadable mode  | `useSelector(({ state }) => state(atom$))` | `useAtomValue(loadable(atom))` | `useRecoilValueLoadable(atom)`  |

### Key Advantages

1. **Single unified hook** - No need to choose between different hooks
2. **Composable selectors** - Combine atoms, derive values, handle errors in one selector
3. **Flexible async modes** - Switch between Suspense and loadable without changing atoms
4. **Built-in utilities** - `all()`, `any()`, `race()`, `settled()`, `safe()`, `state()`, `and()`, `or()`
5. **Type-safe** - Full TypeScript inference
6. **useStable** - Stable references without dependency array footguns
