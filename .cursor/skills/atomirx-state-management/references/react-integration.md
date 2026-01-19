# React Integration

## useSelector Hook

Subscribe to atom values with automatic re-rendering.

### Basic Usage

```tsx
import { useSelector } from "atomirx/react";

// Shorthand: pass atom directly
const count = useSelector(count$);

// Selector: compute derived value
const doubled = useSelector(({ read }) => read(count$) * 2);

// Multiple atoms
const display = useSelector(({ read }) => {
  const count = read(count$);
  const user = read(user$);
  return user ? `${user.name}: ${count}` : `Anonymous: ${count}`;
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
```

### Custom Equality

```tsx
const userName = useSelector(
  ({ read }) => read(user$)?.name,
  (prev, next) => prev === next // Only re-render when name changes
);
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

Handle async operations with loading/error states:

```tsx
import { useAction } from "atomirx/react";

function SaveButton() {
  const [save, { loading, error }] = useAction(async () => {
    await saveData(data$.get());
  });

  return (
    <button onClick={save} disabled={loading}>
      {loading ? "Saving..." : "Save"}
    </button>
  );
}
```

### Eager Execution

```tsx
// Execute immediately on mount
const [_, { loading, data }] = useAction(async () => fetchInitialData(), {
  eager: true,
});
```

## Suspense Integration

atomirx is designed for React Suspense:

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
4. **Built-in utilities** - `all()`, `any()`, `race()`, `settled()`, `safe()`, `state()`
5. **Type-safe** - Full TypeScript inference

## useStable Hook

Stabilize object/array/callback references:

```tsx
const callbacks = useStable({
  onSave: () => saveData(),
  onCancel: () => resetForm(),
});

// callbacks.onSave and callbacks.onCancel have stable references
```
