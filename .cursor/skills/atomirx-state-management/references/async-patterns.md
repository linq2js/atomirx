# Async Patterns

atomirx provides powerful utilities for working with multiple async atoms.

## Summary

| Utility     | Input           | Output                   | Behavior                           |
| ----------- | --------------- | ------------------------ | ---------------------------------- |
| `all()`     | Array of atoms  | Array of values          | Suspends until all ready           |
| `any()`     | Record of atoms | `{ key, value }` (first) | First to resolve wins              |
| `race()`    | Record of atoms | `{ key, value }` (first) | First to settle (ready/error) wins |
| `settled()` | Array of atoms  | Array of SettledResult   | Suspends until all settled         |

## all() - Wait for All (like Promise.all)

Suspends until ALL atoms resolve. Returns array of values.

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());
const comments$ = atom(fetchComments());

const dashboard$ = derived(({ all }) => {
  const [user, posts, comments] = all([user$, posts$, comments$]);
  return { user, posts, comments };
});
```

**Use when:** You need all data before rendering.

## any() - First Ready (like Promise.any)

Returns first successfully resolved value. Uses object input for key identification.

```typescript
const primaryApi$ = atom(fetchFromPrimary());
const fallbackApi$ = atom(fetchFromFallback());

const data$ = derived(({ any }) => {
  const result = any({ primary: primaryApi$, fallback: fallbackApi$ });
  // result: { key: "primary" | "fallback", value: T }
  return result.value;
});
```

**Use when:** You have redundant data sources and want the fastest.

## race() - First Settled (like Promise.race)

Returns first to settle (ready OR error). Uses object input for key identification.

```typescript
const cache$ = atom(checkCache());
const api$ = atom(fetchFromApi());

const data$ = derived(({ race }) => {
  const result = race({ cache: cache$, api: api$ });
  // result: { key: "cache" | "api", value: T }
  return result.value;
});
```

**Use when:** You want to show whatever resolves first, including errors.

## settled() - All Results (like Promise.allSettled)

Returns status for each atom. Suspends until all are settled.

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());

const results$ = derived(({ settled }) => {
  const [userResult, postsResult] = settled([user$, posts$]);

  return {
    user: userResult.status === "ready" ? userResult.value : null,
    posts: postsResult.status === "ready" ? postsResult.value : [],
    hasErrors: userResult.status === "error" || postsResult.status === "error",
  };
});
```

**Use when:** You want to handle partial failures gracefully.

### SettledResult Type

```typescript
type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };
```

## state() - Get State Without Throwing

Get atom state without triggering Suspense. Returns state object directly.

```typescript
const data$ = derived(({ state }) => {
  const userState = state(user$);

  if (userState.status === "loading") {
    return { loading: true };
  }
  if (userState.status === "error") {
    return { error: userState.error };
  }
  return { user: userState.value };
});
```

**Use when:** You want to handle loading/error manually without Suspense.

### AtomState Type

```typescript
type AtomState<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown }
  | { status: "loading"; promise: Promise<T> };
```

## Combining Patterns

### Graceful Degradation with settled()

```typescript
const dashboard$ = derived(({ read, settled }) => {
  // Required data
  const user = read(user$);

  // Optional data with graceful degradation
  const [analyticsResult, notificationsResult] = settled([
    analytics$,
    notifications$,
  ]);

  return {
    user,
    analytics:
      analyticsResult.status === "ready" ? analyticsResult.value : null,
    notifications:
      notificationsResult.status === "ready" ? notificationsResult.value : [],
    warnings: [analyticsResult, notificationsResult]
      .filter((r) => r.status === "error")
      .map((r) => r.error),
  };
});
```

### Cache-First with race()

```typescript
const article$ = derived(({ race }) => {
  const result = race({
    cache: cachedArticle$,
    network: fetchedArticle$,
  });

  console.log(`Data from: ${result.key}`);
  return result.value;
});
```

### Parallel Loading with all()

```typescript
// In React
const [user, posts, comments] = useSelector(({ all }) =>
  all([user$, posts$, comments$])
);

// All three load in parallel, component renders when all ready
```
