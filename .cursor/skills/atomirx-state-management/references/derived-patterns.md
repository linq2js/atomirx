# Derived Patterns - DerivedAtom Features

The `derived()` function creates a computed atom that automatically recomputes when dependencies change.

## Overview

```typescript
const doubled$ = derived(({ read }) => read(count$) * 2);
const user$ = derived(({ read }) => read(userData$), { meta: { key: "user" } });
```

## Core API

| Property/Method | Signature             | Description                         |
| --------------- | --------------------- | ----------------------------------- |
| `get()`         | `() => Promise<T>`    | Get computed value (always Promise) |
| `staleValue`    | `T \| undefined`      | Last resolved value or fallback     |
| `state()`       | `() => AtomState<T>`  | Get current state without throwing  |
| `refresh()`     | `() => void`          | Force recomputation                 |
| `on()`          | `(listener) => unsub` | Subscribe to changes                |
| `_dispose()`    | `() => void`          | Internal: cleanup subscriptions     |

## Key Behaviors

1. **Always returns Promise** - `.get()` returns `Promise<T>` even for sync computations
2. **Lazy computation** - Value computed on first access
3. **Automatic updates** - Recomputes when dependencies change
4. **Equality checking** - Only notifies if derived value changed
5. **Suspense-like async** - `read()` throws Promise if loading

## Selector Rules (CRITICAL)

### MUST Return Synchronous Value - NEVER Return Promise

```typescript
// ❌ FORBIDDEN - Don't use async function
derived(async ({ read }) => {
  const data = await fetch("/api");
  return data;
});

// ❌ FORBIDDEN - Don't return a Promise
derived(({ read }) => fetch("/api").then((r) => r.json()));

// ✅ REQUIRED - Create async atom and use read()
const data$ = atom(fetch("/api").then((r) => r.json()));
derived(({ read }) => read(data$)); // Suspends until resolved
```

### NEVER Use try/catch with read() - ALWAYS Use safe()

```typescript
// ❌ FORBIDDEN - Catches Suspense Promise, BREAKS loading state
derived(({ read }) => {
  try {
    return read(asyncAtom$);
  } catch (e) {
    return "fallback"; // BREAKS Suspense - catches BOTH errors AND promises!
  }
});

// ✅ REQUIRED - Use safe() to preserve Suspense
derived(({ read, safe }) => {
  const [err, data] = safe(() => read(asyncAtom$));
  if (err) return "error fallback";
  return data;
});
```

## staleValue - Cached/Fallback Value

The `staleValue` property provides the last resolved value or fallback:

### Without Fallback

```typescript
const doubled$ = derived(({ read }) => read(count$) * 2);

doubled$.staleValue; // undefined (before first resolve)
await doubled$.get();
doubled$.staleValue; // 10 (last resolved value)
```

### With Fallback

```typescript
const posts$ = derived(({ read }) => read(postsData$).length, { fallback: 0 });

posts$.staleValue; // 0 (during loading) - fallback provided
await posts$.get();
posts$.staleValue; // 42 (after resolve)
```

### Use Case: Show Cached While Loading

```tsx
function PostCount() {
  const state = useSelector(({ state }) => state(postCount$));
  const staleValue = postCount$.staleValue;

  if (state.status === "loading") {
    return <div className="loading">{staleValue ?? "..."}</div>;
  }
  return <div>{state.value}</div>;
}
```

## state() - Get Async State

Get the current state without triggering Suspense:

```typescript
const data$ = derived(({ read }) => read(source$));

data$.state();
// Returns one of:
// { status: "ready", value: T }
// { status: "error", error: unknown }
// { status: "loading", promise: Promise<T> }
```

### AtomState Type

```typescript
type AtomState<T> =
  | { status: "ready"; value: T; error?: undefined; promise?: undefined }
  | { status: "error"; error: unknown; value?: undefined; promise?: undefined }
  | {
      status: "loading";
      promise: Promise<T>;
      value?: undefined;
      error?: undefined;
    };
```

### Use Case: Manual State Handling

```typescript
const dashboard$ = derived(({ read }) => {
  const dataState = dataSource$.state();

  if (dataState.status === "loading") {
    return { loading: true, data: null };
  }
  if (dataState.status === "error") {
    return { loading: false, error: dataState.error };
  }
  return { loading: false, data: dataState.value };
});
```

## refresh() - Force Recomputation

Manually trigger recomputation:

```typescript
const data$ = derived(({ read }) => {
  const url = read(apiUrl$);
  return fetchData(url);
});

// Force refetch
data$.refresh();
```

### Use Case: Pull-to-Refresh

```tsx
function DataList() {
  const stable = useStable({
    onRefresh: () => data$.refresh(),
  });

  return (
    <PullToRefresh onRefresh={stable.onRefresh}>
      <List data={useSelector(data$)} />
    </PullToRefresh>
  );
}
```

## DerivedOptions

```typescript
interface DerivedOptions<T> {
  /** Metadata for debugging */
  meta?: { key?: string };

  /** Equality strategy (default: "strict") */
  equals?: Equality<T>;

  /** Fallback value during loading */
  fallback?: T;

  /** Error callback */
  onError?: (error: unknown) => void;
}
```

### Equality Options

```typescript
// Shallow equality - avoid re-notify on equivalent objects
const user$ = derived(
  ({ read }) => ({ ...read(userData$), computed: Date.now() }),
  { equals: "shallow" }
);

// Custom equality
const data$ = derived(({ read }) => read(source$), {
  equals: (a, b) => a.id === b.id,
});
```

### onError Callback

```typescript
const risky$ = derived(
  ({ read }) => {
    const raw = read(rawData$);
    return JSON.parse(raw); // May throw
  },
  {
    onError: (error) => {
      console.error("Derived computation failed:", error);
      Sentry.captureException(error);
    },
  }
);
```

**Note:** `onError` is for actual errors, NOT for Promise throws (Suspense).

## DerivedContext Methods

Derived atoms receive a `DerivedContext` with all `SelectContext` methods plus `ready()`:

```typescript
derived(
  ({ read, ready, from, all, any, race, settled, safe, state, and, or }) => {
    // All methods available
  }
);
```

See [SelectContext Reference](select-context.md) for method details.

### ready() in Derived

Wait for non-null values before computing:

```typescript
const userPosts$ = derived(({ ready, read }) => {
  const userId = ready(currentUserId$); // Suspends if null
  const posts = read(postsCache$);
  return posts.filter((p) => p.userId === userId);
});
```

## Common Patterns

### Computed Property

```typescript
const fullName$ = derived(({ read }) => {
  const { firstName, lastName } = read(user$);
  return `${firstName} ${lastName}`;
});
```

### Filtered List

```typescript
const filteredTodos$ = derived(({ read }) => {
  const todos = read(todos$);
  const filter = read(filter$);

  switch (filter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
});
```

### Combined Async Sources

```typescript
const dashboard$ = derived(({ all }) => {
  const [user, posts, notifications] = all([user$, posts$, notifications$]);
  return { user, posts, notifications };
});
```

### Conditional Dependencies

```typescript
const data$ = derived(({ read, and }) => {
  // Only read expensive atom if conditions met
  if (!and([isLoggedIn$, hasPermission$])) {
    return null;
  }
  return read(expensiveData$);
});
```

### Error-Resilient Aggregation

```typescript
const dashboard$ = derived(({ settled }) => {
  const [userResult, postsResult, statsResult] = settled([
    user$,
    posts$,
    stats$,
  ]);

  return {
    user: userResult.status === "ready" ? userResult.value : null,
    posts: postsResult.status === "ready" ? postsResult.value : [],
    stats: statsResult.status === "ready" ? statsResult.value : null,
    errors: [userResult, postsResult, statsResult]
      .filter((r) => r.status === "error")
      .map((r) => r.error),
  };
});
```

### Race Between Cache and API

```typescript
const article$ = derived(({ race }) => {
  const result = race({
    cache: cachedArticle$,
    network: fetchedArticle$,
  });

  console.log(`Data from: ${result.key}`); // "cache" or "network"
  return result.value;
});
```

### Derived from Pool

```typescript
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000 });
const currentUserId$ = atom<string | null>(null);

const currentUser$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$);
  const user$ = from(userPool, userId);
  return read(user$);
});
```

## Effect vs Derived

| Aspect        | derived()                | effect()                 |
| ------------- | ------------------------ | ------------------------ |
| Returns       | Computed value           | void (side effects only) |
| Lazy          | Yes (computed on access) | No (runs immediately)    |
| Subscription  | When accessed            | Always active            |
| Use case      | Transform data           | Sync, persist, log       |
| Can set atoms | No                       | Yes (use batch)          |

```typescript
// Derived: compute value
const doubled$ = derived(({ read }) => read(count$) * 2);

// Effect: side effect
effect(({ read }) => {
  localStorage.setItem("count", String(read(count$)));
});
```
