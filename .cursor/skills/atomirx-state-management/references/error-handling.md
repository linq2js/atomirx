# Error Handling: safe() Not try/catch

## The Problem with try/catch

The `read()` function uses **Suspense-like pattern**: when an atom is loading, `read()` throws the Promise. If you wrap `read()` in try/catch, you catch the Promise along with actual errors:

```typescript
// ❌ WRONG - This breaks Suspense!
const data$ = derived(({ read }) => {
  try {
    const user = read(asyncUser$); // Throws Promise when loading!
    return processUser(user);
  } catch (e) {
    // This catches BOTH:
    // 1. The Promise (when loading) - breaks Suspense!
    // 2. Actual errors from processUser()
    return null;
  }
});
```

Problems:

1. **Loading state is lost** - Instead of suspending, returns `null` immediately
2. **No Suspense fallback** - React never sees the loading state
3. **Silent failures** - Can't distinguish "loading" from "error"

## The Solution: safe()

`safe()` catches actual errors but **re-throws Promises** to preserve Suspense:

```typescript
// ✅ CORRECT
const data$ = derived(({ read, safe }) => {
  const [err, user] = safe(() => {
    const raw = read(asyncUser$); // Can throw Promise (Suspense) ✓
    return processUser(raw); // Can throw Error ✓
  });

  if (err) {
    console.error("Processing failed:", err);
    return { error: err.message };
  }

  return { user };
});
```

## How safe() Works

| Scenario          | `try/catch`        | `safe()`                        |
| ----------------- | ------------------ | ------------------------------- |
| Loading (Promise) | ❌ Catches Promise | ✅ Re-throws → Suspense         |
| Error             | ✅ Catches error   | ✅ Returns `[error, undefined]` |
| Success           | ✅ Returns value   | ✅ Returns `[undefined, value]` |

## Use Cases

### 1. Parsing/Validation

```typescript
const parsedConfig$ = derived(({ read, safe }) => {
  const [err, config] = safe(() => {
    const raw = read(rawConfig$);
    return JSON.parse(raw); // Can throw SyntaxError
  });

  if (err) return { valid: false, error: "Invalid JSON" };
  return { valid: true, config };
});
```

### 2. Graceful Degradation

```typescript
const dashboard$ = derived(({ read, safe }) => {
  // Primary data - required
  const user = read(user$);

  // Optional data - graceful degradation
  const [err1, analytics] = safe(() => read(analytics$));
  const [err2, notifications] = safe(() => read(notifications$));

  return {
    user,
    analytics: err1 ? null : analytics,
    notifications: err2 ? [] : notifications,
    errors: [err1, err2].filter(Boolean),
  };
});
```

### 3. Effects with Error Handling

```typescript
effect(({ read, safe }) => {
  const [err, data] = safe(() => {
    const raw = read(asyncData$);
    return transformData(raw);
  });

  if (err) {
    console.error("Effect failed:", err);
    return; // Skip the rest
  }

  saveToLocalStorage(data);
});
```

### 4. React Components

```tsx
function UserProfile() {
  const result = useSelector(({ read, safe }) => {
    const [err, user] = safe(() => read(user$));
    return { err, user };
  });

  if (result.err) {
    return <ErrorMessage error={result.err} />;
  }

  return <Profile user={result.user} />;
}
```

### 5. With rx() Inline

```tsx
<Suspense fallback={<Loading />}>
  {rx(({ read, safe }) => {
    const [err, posts] = safe(() => read(posts$));
    if (err) return <ErrorBanner message="Failed to load posts" />;
    return posts.map((post) => <PostCard key={post.id} post={post} />);
  })}
</Suspense>
```

## Alternative: state() for Manual Handling

If you need to handle loading state manually (no Suspense):

```typescript
const result = useSelector(({ state }) => {
  const userState = state(user$);
  return userState;
});

// result: { status: "loading" | "ready" | "error", value?, error? }
if (result.status === "loading") return <Loading />;
if (result.status === "error") return <Error error={result.error} />;
return <User data={result.value} />;
```
