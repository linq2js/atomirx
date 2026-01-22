# SelectContext - Complete Reference

The `SelectContext` provides utilities for reading atoms and handling async operations. **The same patterns apply across ALL reactive contexts.**

## Unified Context (CRITICAL)

**MUST** understand that `SelectContext` methods work identically in:

| Context         | Usage                   | Additional Methods                 |
| --------------- | ----------------------- | ---------------------------------- |
| `derived()`     | Computed values         | `ready()` (via DerivedContext)     |
| `effect()`      | Side effects            | `ready()`, `onCleanup()`, `signal` |
| `useSelector()` | React subscriptions     | `ready()` (via DerivedContext)     |
| `rx()`          | Inline React components | `ready()` (via DerivedContext)     |

### Same Pattern, Different Contexts

```typescript
// ✅ SAME pattern works in ALL contexts

// In derived()
const doubled$ = derived(({ read }) => read(count$) * 2);

// In effect()
effect(({ read }) => console.log("Count:", read(count$)));

// In useSelector()
const doubled = useSelector(({ read }) => read(count$) * 2);

// In rx()
{rx(({ read }) => <span>{read(count$) * 2}</span>)}
```

### Complex Patterns Work Everywhere

```typescript
// all() - works in derived, effect, useSelector, rx
const [user, posts] = all([user$, posts$]);

// safe() - works in derived, effect, useSelector, rx
const [err, data] = safe(() => JSON.parse(read(raw$)));

// state() - works in derived, effect, useSelector, rx
const userState = state(user$);
if (userState.status === "loading") return { loading: true };

// from() - works in derived, effect, useSelector, rx
const user$ = from(userPool, userId);
return read(user$);

// and()/or() - works in derived, effect, useSelector, rx
const canEdit = and([isLoggedIn$, hasPermission$]);
```

## Context Methods Overview

| Method      | Input           | Output                 | Suspends | Use Case              |
| ----------- | --------------- | ---------------------- | -------- | --------------------- |
| `read()`    | Atom            | Value                  | Yes      | Read atom value       |
| `ready()`   | Atom or fn      | Non-null value         | Yes      | Wait for data         |
| `from()`    | Pool + params   | ScopedAtom             | No       | Get pool entry        |
| `track()`   | Atom            | void                   | No       | Track without reading |
| `state()`   | Atom or fn      | SelectStateResult      | No       | Manual state handling |
| `safe()`    | Function        | `[error, result]`      | Partial  | Error handling        |
| `all()`     | Array of atoms  | Array of values        | Yes      | Wait for all          |
| `any()`     | Record of atoms | `{ key, value }`       | Yes      | First ready           |
| `race()`    | Record of atoms | `{ key, value }`       | Yes      | First settled         |
| `settled()` | Array of atoms  | Array of SettledResult | Yes      | All results           |
| `and()`     | Array of conds  | boolean                | Depends  | Logical AND           |
| `or()`      | Array of conds  | boolean                | Depends  | Logical OR            |

## read() - Read Atom Value

Reads an atom and tracks it as a dependency. Suspends on loading, throws on error.

```typescript
const double$ = derived(({ read }) => {
  const count = read(count$);
  return count * 2;
});
```

**Behavior:**

- If atom is ready → returns value
- If atom has error → throws error
- If atom is loading → throws Promise (Suspense)

## ready() - Wait for Non-null Value

Waits for a value to be non-null/non-undefined before proceeding.

### ready(atom$) - Wait for atom

```typescript
const userPosts$ = derived(({ ready, read }) => {
  const user = ready(user$); // Suspends if user is null
  return read(posts$).filter((p) => p.userId === user.id);
});
```

### ready(atom$, selector) - With selector

```typescript
const emailDerived$ = derived(({ ready }) => {
  const email = ready(user$, (u) => u.email); // Wait for email property
  return `Contact: ${email}`;
});
```

### ready(() => value) - With function

```typescript
const combined$ = derived(({ ready, all }) => {
  const [user, posts] = ready(() => all([user$, posts$]));
  return { user, posts };
});
```

**Note:** Function overload does NOT support async callbacks. Use `ready(atom$, selector?)` for async.

## from() - Get ScopedAtom from Pool (CRITICAL)

Gets a temporary ScopedAtom from a pool for the given params.

```typescript
const userPosts$ = derived(({ read, from }) => {
  const user$ = from(userPool, "user-1"); // ScopedAtom<User>
  return read(user$).posts;
});
```

**CRITICAL Rules:**

- ScopedAtom is **ONLY** valid during computation
- **MUST** use `read(scopedAtom)`, **NEVER** use `scopedAtom.get()`
- **NEVER** store ScopedAtom in variables outside the computation
- Automatically re-computes when pool entry is removed

## track() - Track Without Reading

Tracks an atom as a dependency without reading its value.

```typescript
const derived$ = derived(({ read, track }) => {
  track(someAtom$); // Re-compute when this changes
  return read(otherAtom$);
});
```

**Use case:** When you already have the value but need subscription.

## state() - Get State Without Throwing

Returns atom state without triggering Suspense.

### state(atom$) - Single atom

```typescript
const dashboard$ = derived(({ state }) => {
  const userState = state(user$);

  if (userState.status === "loading") return { loading: true };
  if (userState.status === "error") return { error: userState.error };
  return { user: userState.value };
});
```

### state(() => expr) - With selector

```typescript
const combined$ = derived(({ state, all }) => {
  const result = state(() => all([user$, posts$]));

  if (result.status === "loading") return { loading: true };
  if (result.status === "error") return { error: result.error };
  return { data: result.value };
});
```

### SelectStateResult Type

```typescript
type SelectStateResult<T> =
  | { status: "ready"; value: T; error: undefined }
  | { status: "error"; value: undefined; error: unknown }
  | { status: "loading"; value: undefined; error: undefined };
```

All properties are always present for easy destructuring:

```typescript
const { status, value, error } = state(atom$);
```

## safe() - Error Handling

Catches errors but preserves Suspense (re-throws Promises).

```typescript
const parsed$ = derived(({ read, safe }) => {
  const [err, data] = safe(() => {
    const raw = read(rawData$); // May throw Promise
    return JSON.parse(raw); // May throw Error
  });

  if (err) return { error: err.message };
  return { data };
});
```

**Behavior:**

- Function succeeds → returns `[undefined, result]`
- Function throws Error → returns `[error, undefined]`
- Function throws Promise → re-throws (preserves Suspense)

**NEVER use try/catch with read() - ALWAYS use safe():**

```typescript
// ❌ FORBIDDEN: Catches Suspense Promise, breaks loading state
derived(({ read }) => {
  try {
    return read(asyncAtom$);
  } catch (e) {
    return "fallback"; // BREAKS Suspense - catches BOTH errors AND Promises!
  }
});

// ✅ REQUIRED: safe() preserves Suspense
derived(({ read, safe }) => {
  const [err, data] = safe(() => read(asyncAtom$));
  if (err) return "error fallback";
  return data;
});
```

## all() - Wait for All (Promise.all)

Waits for all atoms to resolve. Returns array of values.

```typescript
const dashboard$ = derived(({ all }) => {
  const [user, posts, comments] = all([user$, posts$, comments$]);
  return { user, posts, comments };
});
```

**Behavior:**

- All ready → returns array of values
- Any error → throws first error
- Any loading → throws combined Promise

## any() - First Ready (Promise.any)

Returns first successfully resolved value. Uses object input for key identification.

```typescript
const data$ = derived(({ any }) => {
  const result = any({ primary: primaryApi$, fallback: fallbackApi$ });
  console.log(`Data from: ${result.key}`); // "primary" or "fallback"
  return result.value;
});
```

**Behavior:**

- Any ready → returns `{ key, value }` for first ready
- All error → throws AggregateError
- Any loading (not all errored) → throws Promise

**Note:** `any()` does NOT use fallback values - it waits for a real ready value.

## race() - First Settled (Promise.race)

Returns first to settle (ready OR error). Uses object input for key identification.

```typescript
const data$ = derived(({ race }) => {
  const result = race({ cache: cache$, api: api$ });
  console.log(`Data from: ${result.key}`); // "cache" or "api"
  return result.value;
});
```

**Behavior:**

- Any ready → returns `{ key, value }` for first ready
- Any error → throws first error
- All loading → throws first Promise

**Note:** `race()` does NOT use fallback values - it waits for first "real" settled value.

## settled() - All Results (Promise.allSettled)

Returns status for each atom. Waits until all are settled.

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

### SettledResult Type

```typescript
type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };
```

## and() - Logical AND

Short-circuit AND evaluation. Returns true if ALL conditions are truthy.

### Condition Types

```typescript
type Condition =
  | boolean // Static value, no subscription
  | Atom<unknown> // Always read and subscribed
  | (() => boolean | Atom<unknown>); // Lazy, only called if needed
```

### Usage

```typescript
// Simple: all atoms must be truthy
const canAccess$ = derived(({ and }) => and([isLoggedIn$, hasPermission$]));

// With static value
const canEdit$ = derived(({ and }) =>
  and([FEATURE_ENABLED, isLoggedIn$, hasEditRole$])
);

// With lazy evaluation (only check if logged in)
const canDelete$ = derived(({ and }) =>
  and([
    isLoggedIn$,
    () => hasDeletePermission$, // Only read if logged in
  ])
);

// Nested: (A && B) || C
const result$ = derived(({ or, and }) => or([and([a$, b$]), c$]));
```

### Evaluation Flow

```
and([a, b, () => c])
     │
     ▼
  a truthy? ─No──→ return false
     │Yes
     ▼
  b truthy? ─No──→ return false
     │Yes
     ▼
  call () => c
  c truthy? ─No──→ return false
     │Yes
     ▼
  return true
```

## or() - Logical OR

Short-circuit OR evaluation. Returns true if ANY condition is truthy.

### Usage

```typescript
// Simple: any atom truthy
const hasData$ = derived(({ or }) => or([cacheData$, apiData$]));

// With lazy fallback chain
const data$ = derived(({ or }) =>
  or([
    () => primaryData$, // Try primary first
    () => fallbackData$, // Only if primary is falsy
  ])
);

// Nested: A || (B && C)
const result$ = derived(({ or, and }) => or([a$, and([b$, c$])]));
```

### Evaluation Flow

```
or([a, b, () => c])
    │
    ▼
 a truthy? ─Yes─→ return true
    │No
    ▼
 b truthy? ─Yes─→ return true
    │No
    ▼
 call () => c
 c truthy? ─Yes─→ return true
    │No
    ▼
 return false
```

## Context Rules (CRITICAL)

### MUST Be Synchronous - NEVER in Async Callbacks

Context methods can **ONLY** be called synchronously during computation:

```typescript
// ❌ FORBIDDEN: read() in async callback
derived(({ read }) => {
  setTimeout(() => {
    read(atom$); // THROWS error!
  }, 100);
  return "value";
});

// ❌ FORBIDDEN: read() in Promise.then
derived(({ read }) => {
  somePromise.then(() => {
    read(atom$); // THROWS error!
  });
  return "value";
});

// ✅ REQUIRED: All reads during sync execution
derived(({ read }) => {
  const value = read(atom$); // OK
  return value * 2;
});
```

### For Async Access MUST Use .get()

For accessing atom values in callbacks, **MUST** use `.get()` directly:

```typescript
const handler$ = derived(({ read }) => {
  const initialValue = read(config$);

  return () => {
    const currentValue = config$.get(); // Direct access in callback
    console.log(currentValue);
  };
});
```

## Plugin System (.use())

Context implements `Pipeable` for plugin composition:

```typescript
// Internal usage by derived/effect
const { result } = select((context) => fn(context.use(withReady())));
```

Custom plugins can extend the context:

```typescript
function withLogger<TContext extends SelectContext>(context: TContext) {
  return {
    ...context,
    log: (msg: string) => console.log(`[select] ${msg}`),
  };
}

derived(({ read, log }) => {
  log("Computing...");
  return read(atom$);
});
```

## Unified Patterns Reference (MUST Use Same Patterns)

### Pattern: Read Multiple Atoms

```typescript
// ✅ SAME pattern in ALL contexts
const pattern = ({ read }) => ({
  user: read(user$),
  posts: read(posts$),
  settings: read(settings$),
});

// derived()
const combined$ = derived(pattern);

// effect()
effect(({ read }) => {
  const { user, posts } = pattern({ read });
  console.log(user, posts);
});

// useSelector()
const { user, posts, settings } = useSelector(pattern);

// rx()
{rx(({ read }) => <div>{pattern({ read }).user.name}</div>)}
```

### Pattern: Wait for All with all()

```typescript
// ✅ SAME in ALL contexts
const waitForAll = ({ all }) => {
  const [user, posts, comments] = all([user$, posts$, comments$]);
  return { user, posts, comments };
};

// derived()
const dashboard$ = derived(waitForAll);

// useSelector()
const { user, posts } = useSelector(waitForAll);

// effect()
effect(({ all }) => {
  const [user, posts] = all([user$, posts$]);
  analytics.track("loaded", { userId: user.id, postCount: posts.length });
});
```

### Pattern: Error Handling with safe()

```typescript
// ✅ SAME in ALL contexts
const safeRead = ({ read, safe }) => {
  const [err, data] = safe(() => {
    const raw = read(rawJson$);
    return JSON.parse(raw);
  });
  return err ? { error: err.message } : { data };
};

// derived()
const parsed$ = derived(safeRead);

// useSelector()
const result = useSelector(safeRead);

// effect()
effect(({ read, safe }) => {
  const [err, data] = safe(() => JSON.parse(read(rawJson$)));
  if (!err) localStorage.setItem("data", JSON.stringify(data));
});
```

### Pattern: Pool Access with from()

```typescript
// ✅ SAME in ALL contexts
const readFromPool = ({ read, from }) => {
  const user$ = from(userPool, userId);
  return read(user$);
};

// derived()
const currentUser$ = derived(readFromPool);

// useSelector()
const user = useSelector(readFromPool);

// effect()
effect(({ read, from }) => {
  const user$ = from(userPool, userId);
  console.log("User:", read(user$).name);
});
```

### Pattern: Boolean Logic with and()/or()

```typescript
// ✅ SAME in ALL contexts
const checkPermissions = ({ and }) =>
  and([isLoggedIn$, hasPermission$, isActive$]);

// derived()
const canAccess$ = derived(checkPermissions);

// useSelector()
const canAccess = useSelector(checkPermissions);

// effect()
effect(({ and }) => {
  if (and([isLoggedIn$, hasPermission$])) {
    enableFeature();
  }
});
```

### Pattern: Manual Loading State with state()

```typescript
// ✅ SAME in ALL contexts
const handleLoadingState = ({ state }) => {
  const userState = state(user$);

  switch (userState.status) {
    case "loading": return { loading: true, data: null, error: null };
    case "error": return { loading: false, data: null, error: userState.error };
    case "ready": return { loading: false, data: userState.value, error: null };
  }
};

// derived()
const userStatus$ = derived(handleLoadingState);

// useSelector() - Non-Suspense mode
const { loading, data, error } = useSelector(handleLoadingState);

// In component
if (loading) return <Spinner />;
if (error) return <Error error={error} />;
return <UserCard user={data} />;
```

### Pattern: Race Between Sources with race()

```typescript
// ✅ SAME in ALL contexts
const racePattern = ({ race }) => {
  const { key, value } = race({ cache: cache$, api: api$ });
  return { source: key, data: value };
};

// derived()
const data$ = derived(racePattern);

// useSelector()
const { source, data } = useSelector(racePattern);
```

## Context Availability Summary

| Method        | derived() | effect() | useSelector() | rx() |
| ------------- | --------- | -------- | ------------- | ---- |
| `read()`      | ✅        | ✅       | ✅            | ✅   |
| `ready()`     | ✅        | ✅       | ✅            | ✅   |
| `from()`      | ✅        | ✅       | ✅            | ✅   |
| `track()`     | ✅        | ✅       | ✅            | ✅   |
| `state()`     | ✅        | ✅       | ✅            | ✅   |
| `safe()`      | ✅        | ✅       | ✅            | ✅   |
| `all()`       | ✅        | ✅       | ✅            | ✅   |
| `any()`       | ✅        | ✅       | ✅            | ✅   |
| `race()`      | ✅        | ✅       | ✅            | ✅   |
| `settled()`   | ✅        | ✅       | ✅            | ✅   |
| `and()`       | ✅        | ✅       | ✅            | ✅   |
| `or()`        | ✅        | ✅       | ✅            | ✅   |
| `onCleanup()` | ❌        | ✅       | ❌            | ❌   |
| `signal`      | ❌        | ✅       | ❌            | ❌   |
