# Derived Patterns

## IMPORTANT: .get() Returns Promise

`.get()` **ALWAYS returns `Promise<T>`**, even for sync computations:

```typescript
const count$ = atom(5);
const user$ = atom(fetchUser());

const summary$ = derived(({ read }) => {
  const count = read(count$);
  const user = read(user$);
  return `${user.name} has ${count} items`;
});

const value = await summary$.get(); // "John has 5 items"
```

## When to Use

**Use `derived()` for:**
- Combining/transforming atoms
- Computed values that auto-update
- Handling sync + async atoms uniformly

**NEVER use for:**
- **Updating atoms** — use `effect()`
- Side effects — use `effect()`
- User actions — use plain functions

## Core API

| Property/Method | Signature           | Description              |
| --------------- | ------------------- | ------------------------ |
| `get()`         | `() => Promise<T>`  | Get computed value       |
| `staleValue`    | `T \| undefined`    | Last resolved / fallback |
| `state()`       | `() => AtomState`   | State without throwing   |
| `refresh()`     | `() => void`        | Force recomputation      |
| `on()`          | `(listener) => sub` | Subscribe                |

## Selector Rules (CRITICAL)

### NEVER Update Atoms

```typescript
// ❌ FORBIDDEN
derived(({ read }) => {
  const items = read(cartItems$);
  cartTotal$.set(items.reduce((s, i) => s + i.price, 0)); // NEVER
  return total;
});

// ✅ Use effect()
effect(({ read }) => {
  const items = read(cartItems$);
  cartTotal$.set(items.reduce((s, i) => s + i.price, 0));
}, { meta: { key: "compute.cartTotal" } });

// ✅ Or compute in derived
const cartTotal$ = derived(({ read }) =>
  read(cartItems$).reduce((s, i) => s + i.price, 0)
);
```

### MUST Return Sync Value

```typescript
// ❌ FORBIDDEN
derived(async ({ read }) => await fetch("/api"));
derived(({ read }) => fetch("/api").then((r) => r.json()));

// ✅ REQUIRED
const data$ = atom(fetch("/api").then((r) => r.json()));
derived(({ read }) => read(data$));
```

### NEVER try/catch — Use safe()

```typescript
// ❌ FORBIDDEN — catches Promise
derived(({ read }) => {
  try { return read(asyncAtom$); }
  catch (e) { return "fallback"; } // Breaks Suspense
});

// ✅ REQUIRED
derived(({ read, safe }) => {
  const [err, data] = safe(() => read(asyncAtom$));
  if (err) return "error fallback";
  return data;
});
```

## staleValue

Last resolved value or fallback:

```typescript
// Without fallback
const doubled$ = derived(({ read }) => read(count$) * 2);
doubled$.staleValue; // undefined (before resolve)
await doubled$.get();
doubled$.staleValue; // 10

// With fallback
const posts$ = derived(({ read }) => read(postsData$).length, { fallback: 0 });
posts$.staleValue; // 0 (during loading)
```

### Show Cached While Loading

```tsx
function PostCount() {
  const state = useSelector(({ state }) => state(postCount$));
  const stale = postCount$.staleValue;

  if (state.status === "loading") return <div className="loading">{stale ?? "..."}</div>;
  return <div>{state.value}</div>;
}
```

## state()

Get state without Suspense:

```typescript
data$.state();
// { status: "ready", value: T }
// { status: "error", error: unknown }
// { status: "loading", promise: Promise<T> }
```

## refresh()

Force recomputation:

```tsx
function DataList() {
  const stable = useStable({ onRefresh: () => data$.refresh() });
  return <PullToRefresh onRefresh={stable.onRefresh}><List /></PullToRefresh>;
}
```

## Options

```typescript
interface DerivedOptions<T> {
  meta?: { key?: string };
  equals?: Equality<T>;
  fallback?: T;
  onError?: (error: unknown) => void;
}

// Shallow equality
const user$ = derived(({ read }) => ({ ...read(userData$) }), { equals: "shallow" });

// Custom equality
const data$ = derived(({ read }) => read(source$), {
  equals: (a, b) => a.id === b.id,
});

// Error callback
const risky$ = derived(({ read }) => JSON.parse(read(raw$)), {
  onError: (err) => Sentry.captureException(err),
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
    case "active": return todos.filter((t) => !t.completed);
    case "completed": return todos.filter((t) => t.completed);
    default: return todos;
  }
});
```

### Combined Async

```typescript
const dashboard$ = derived(({ all }) => {
  const [user, posts, notifications] = all([user$, posts$, notifications$]);
  return { user, posts, notifications };
});
```

### Conditional Dependencies

```typescript
const data$ = derived(({ read, and }) => {
  if (!and([isLoggedIn$, hasPermission$])) return null;
  return read(expensiveData$);
});
```

### Error-Resilient

```typescript
const dashboard$ = derived(({ settled }) => {
  const [userR, postsR, statsR] = settled([user$, posts$, stats$]);
  return {
    user: userR.status === "ready" ? userR.value : null,
    posts: postsR.status === "ready" ? postsR.value : [],
    errors: [userR, postsR, statsR].filter((r) => r.status === "error").map((r) => r.error),
  };
});
```

### Race Cache vs API

```typescript
const article$ = derived(({ race }) => {
  const result = race({ cache: cachedArticle$, network: fetchedArticle$ });
  console.log(`From: ${result.key}`);
  return result.value;
});
```

### From Pool

```typescript
const currentUser$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$);
  const user$ = from(userPool, userId);
  return read(user$);
});
```

## Effect vs Derived

| Aspect         | derived()              | effect()               |
| -------------- | ---------------------- | ---------------------- |
| Returns        | `Promise<T>`           | void                   |
| Execution      | Lazy (on access)       | Eager (immediately)    |
| Purpose        | Transform/combine      | Sync, persist, log     |
| **Can set**    | **❌ NEVER**           | **✅ Yes**             |
| Subscription   | When accessed          | Always active          |

## When to Use What

| Scenario                            | Solution              |
| ----------------------------------- | --------------------- |
| User clicks → modify atoms          | Plain function        |
| React to changes → compute value    | `derived()`           |
| React to changes → side effects     | `effect()`            |
| Combine multiple atoms              | `derived()`           |
| Persist/log/sync on changes         | `effect()`            |
