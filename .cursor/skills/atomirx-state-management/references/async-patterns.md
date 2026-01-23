# Async Patterns

## Summary

| Utility     | Input           | Output                 | Behavior                   |
| ----------- | --------------- | ---------------------- | -------------------------- |
| `all()`     | Array of atoms  | Array of values        | Waits for all              |
| `any()`     | Record of atoms | `{ key, value }`       | First to resolve           |
| `race()`    | Record of atoms | `{ key, value }`       | First to settle            |
| `settled()` | Array of atoms  | Array of SettledResult | Waits for all settled      |
| `and()`     | Array of conds  | boolean                | AND with short-circuit     |
| `or()`      | Array of conds  | boolean                | OR with short-circuit      |

## all() — Promise.all

Waits for ALL atoms. Returns array.

```typescript
const dashboard$ = derived(({ all }) => {
  const [user, posts, comments] = all([user$, posts$, comments$]);
  return { user, posts, comments };
});
```

**Use when:** Need all data before rendering.

## any() — Promise.any

Returns first resolved. Uses object for key identification.

```typescript
const data$ = derived(({ any }) => {
  const result = any({ primary: primaryApi$, fallback: fallbackApi$ });
  // result: { key: "primary" | "fallback", value: T }
  return result.value;
});
```

**Use when:** Multiple redundant sources, want fastest.

## race() — Promise.race

Returns first settled (ready OR error). Uses object.

```typescript
const data$ = derived(({ race }) => {
  const result = race({ cache: cache$, api: api$ });
  return result.value;
});
```

**Use when:** Show whatever resolves first.

## settled() — Promise.allSettled

Returns status for each. Waits until all settled.

```typescript
const results$ = derived(({ settled }) => {
  const [userResult, postsResult] = settled([user$, posts$]);
  return {
    user: userResult.status === "ready" ? userResult.value : null,
    posts: postsResult.status === "ready" ? postsResult.value : [],
    hasErrors: userResult.status === "error" || postsResult.status === "error",
  };
});
```

**Use when:** Handle partial failures gracefully.

### SettledResult Type

```typescript
type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };
```

## state() — No Throwing

Get state without Suspense.

```typescript
const data$ = derived(({ state }) => {
  const userState = state(user$);
  if (userState.status === "loading") return { loading: true };
  if (userState.status === "error") return { error: userState.error };
  return { user: userState.value };
});
```

### AtomState Type

```typescript
type AtomState<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown }
  | { status: "loading"; promise: Promise<T> };
```

## Combining Patterns

### Graceful Degradation

```typescript
const dashboard$ = derived(({ read, settled }) => {
  const user = read(user$); // Required

  const [analyticsResult, notificationsResult] = settled([analytics$, notifications$]);

  return {
    user,
    analytics: analyticsResult.status === "ready" ? analyticsResult.value : null,
    notifications: notificationsResult.status === "ready" ? notificationsResult.value : [],
    warnings: [analyticsResult, notificationsResult]
      .filter((r) => r.status === "error")
      .map((r) => r.error),
  };
});
```

### Cache-First

```typescript
const article$ = derived(({ race }) => {
  const result = race({ cache: cachedArticle$, network: fetchedArticle$ });
  console.log(`From: ${result.key}`);
  return result.value;
});
```

### Parallel Loading

```typescript
const [user, posts, comments] = useSelector(({ all }) =>
  all([user$, posts$, comments$])
);
```

## and() — Logical AND

Short-circuit. Returns true if ALL truthy.

```typescript
const canEdit$ = derived(({ and }) => and([isLoggedIn$, hasPermission$]));

// Lazy evaluation
const canDelete$ = derived(({ and }) => and([
  isLoggedIn$,
  () => hasDeletePermission$, // Only if logged in
]));
```

### Condition Types

```typescript
type Condition =
  | boolean              // Static
  | Atom<unknown>        // Always read
  | (() => boolean | Atom<unknown>); // Lazy
```

## or() — Logical OR

Short-circuit. Returns true if ANY truthy.

```typescript
const hasData$ = derived(({ or }) => or([cacheData$, apiData$]));

// Lazy fallback
const data$ = derived(({ or }) => or([
  () => primaryData$,
  () => fallbackData$,
]));
```

## Boolean + Async

```typescript
// (A && B) || C
const result$ = derived(({ or, and }) => or([and([a$, b$]), c$]));

// Guard expensive ops
const data$ = derived(({ and, read }) => {
  if (!and([isLoggedIn$, hasPermission$])) return null;
  return read(expensiveData$);
});
```
