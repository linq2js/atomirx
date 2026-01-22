# Derived Patterns - DerivedAtom Features

The `derived()` function creates a computed atom that automatically recomputes when dependencies change.

## IMPORTANT: Derived Value is Always a Promise

**The `.get()` method of a derived atom ALWAYS returns a `Promise<T>`**, even for synchronous computations. This is by design:

- **Unified async handling** - Derived atoms seamlessly handle both sync and async dependency atoms
- **Reactive composition** - Use `derived()` when you need to reactively combine multiple atoms regardless of whether they're sync or async
- **Suspense integration** - The Promise-based API enables React Suspense support

```typescript
const count$ = atom(5); // Sync atom
const user$ = atom(fetchUser()); // Async atom

// Both dependencies handled uniformly
const summary$ = derived(({ read }) => {
  const count = read(count$); // Works for sync
  const user = read(user$); // Works for async (suspends until resolved)
  return `${user.name} has ${count} items`;
});

// .get() ALWAYS returns Promise
const value = await summary$.get(); // "John has 5 items"
```

## When to Use Derived

**Use `derived()` for reactive computation with multiple atoms:**

- Combining/transforming values from multiple atoms
- Computing derived values that update automatically
- Handling both sync and async dependency atoms uniformly
- Creating computed properties that others can subscribe to

**Do NOT use `derived()` for:**

- **Updating/mutating atoms** - NEVER call `.set()` inside derived (use `effect()` instead)
- Side effects (use `effect()` instead)
- User-triggered actions (write plain functions that call `.set()`)
- Operations that need to mutate atoms (use `effect()` or plain functions)

See [When to Use What](#when-to-use-what) for detailed decision rules.

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

### NEVER Update Atoms Inside Derived

**Derived is for pure computation only.** Never call `.set()` on any atom inside a derived selector:

```typescript
// ❌ FORBIDDEN - Don't update atoms in derived
derived(({ read }) => {
  const items = read(cartItems$);
  const total = items.reduce((sum, i) => sum + i.price, 0);
  cartTotal$.set(total); // ❌ NEVER DO THIS
  return total;
});

// ❌ FORBIDDEN - Don't trigger side effects that modify state
derived(({ read }) => {
  const user = read(user$);
  lastAccessedUser$.set(user.id); // ❌ NEVER DO THIS
  return user.name;
});

// ✅ CORRECT - Use effect() when you need to update atoms reactively
effect(
  ({ read }) => {
    const items = read(cartItems$);
    const total = items.reduce((sum, i) => sum + i.price, 0);
    cartTotal$.set(total); // ✅ OK in effect
  },
  { meta: { key: "compute.cartTotal" } }
);

// ✅ CORRECT - Derived is pure computation only
const cartTotal$ = derived(({ read }) => {
  const items = read(cartItems$);
  return items.reduce((sum, i) => sum + i.price, 0);
});
```

**Why this matters:**

- Derived selectors may re-run multiple times during a single update cycle
- Updating atoms inside derived causes infinite loops and unpredictable behavior
- Derived is for **reading and transforming**, not for **writing**

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

## When to Use What

### Decision Rules (IMPORTANT)

| Scenario                                  | Solution                     | Why                        |
| ----------------------------------------- | ---------------------------- | -------------------------- |
| User clicks button → modify atoms         | Plain function with `.set()` | User-triggered, imperative |
| React to atom changes → compute new value | `derived()`                  | Reactive computation       |
| React to atom changes → side effects      | `effect()`                   | Reactive side effects      |
| Need to combine multiple sync/async atoms | `derived()`                  | Handles async uniformly    |
| Need to persist/log/sync on changes       | `effect()`                   | Side effect execution      |

### Plain Functions for User Actions

When a user action triggers atom modifications, write a plain function:

```typescript
// ✅ CORRECT - User action triggers atom updates
function addTodo(text: string) {
  todos$.set(prev => [...prev, { id: Date.now(), text, completed: false }]);
}

function toggleTodo(id: number) {
  todos$.set(prev => prev.map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  ));
}

// Usage in React
<button onClick={() => addTodo("New task")}>Add</button>
```

### Derived for Reactive Computation

When you need to compute values that update when dependencies change:

```typescript
// ✅ CORRECT - Reactive computation from multiple atoms
const filteredTodos$ = derived(({ read }) => {
  const todos = read(todos$); // May be sync or async
  const filter = read(filterType$); // May be sync or async
  return todos.filter(
    (t) => filter === "all" || t.completed === (filter === "completed")
  );
});

const todoStats$ = derived(({ read }) => {
  const todos = read(todos$);
  return {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    pending: todos.filter((t) => !t.completed).length,
  };
});
```

### Effect for Reactive Side Effects

When you need to perform side effects (sync execution) when atoms change:

```typescript
// ✅ CORRECT - React to changes, perform side effect
effect(
  ({ read }) => {
    const todos = read(todos$); // Handles sync/async
    localStorage.setItem("todos", JSON.stringify(todos));
  },
  { meta: { key: "persist.todos" } }
);

// ✅ CORRECT - Effect can also mutate atoms (use sparingly)
effect(
  ({ read }) => {
    const items = read(cartItems$);
    const total = items.reduce((sum, i) => sum + i.price, 0);
    cartTotal$.set(total); // Mutate another atom
  },
  { meta: { key: "compute.cartTotal" } }
);
```

## Effect vs Derived

| Aspect            | derived()                | effect()                   |
| ----------------- | ------------------------ | -------------------------- |
| Returns           | `Promise<T>` (computed)  | void (side effects only)   |
| Lazy              | Yes (computed on access) | No (runs immediately)      |
| Subscription      | When accessed            | Always active              |
| Use case          | Transform/combine data   | Sync, persist, log, mutate |
| **Can set atoms** | **❌ NEVER**             | **✅ Yes**                 |
| Async handling    | Suspends until resolved  | Suspends until resolved    |

```typescript
// Derived: compute value (returns Promise)
const doubled$ = derived(({ read }) => read(count$) * 2);
const value = await doubled$.get(); // Always Promise

// Effect: side effect (void return)
effect(({ read }) => {
  localStorage.setItem("count", String(read(count$)));
});
```
