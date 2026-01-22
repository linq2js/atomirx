# SelectContext - Complete Reference

The `SelectContext` provides utilities for reading atoms and handling async operations. **The same patterns apply across ALL reactive contexts.**

## Architecture: SelectContext is the Core

`SelectContext` is the **foundation** that powers all reactive APIs in atomirx. Every reactive context (`derived`, `effect`, `useSelector`, `rx`) uses the same core selection engine.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR APPLICATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────┐   ┌───────────┐   ┌─────────────┐   ┌───────────┐          │
│   │ derived() │   │ effect()  │   │ useSelector │   │   rx()    │          │
│   │           │   │           │   │     ()      │   │           │          │
│   │ Computed  │   │   Side    │   │   React     │   │  Inline   │          │
│   │  values   │   │  effects  │   │   hooks     │   │   React   │          │
│   └─────┬─────┘   └─────┬─────┘   └──────┬──────┘   └─────┬─────┘          │
│         │               │                │                │                │
│         │   ┌───────────┴────────────────┴────────────────┘                │
│         │   │                                                              │
│         ▼   ▼                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │                      SelectContext (Core)                       │      │
│   │                                                                 │      │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │      │
│   │  │ read()  │ │ all()   │ │ safe()  │ │ state() │ │ from()  │   │      │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │      │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │      │
│   │  │ any()   │ │ race()  │ │settled()│ │ and()   │ │  or()   │   │      │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │      │
│   │                                                                 │      │
│   │         Dependency Tracking │ Suspense │ Re-evaluation          │      │
│   │                                                                 │      │
│   └─────────────────────────────┬───────────────────────────────────┘      │
│                                 │                                          │
│                                 ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                         Atom Layer                              │      │
│   │                                                                 │      │
│   │     atom()          derived()         pool()         effect()   │      │
│   │   (primitive)       (computed)      (parametric)    (reactive)  │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Context Extension Hierarchy

Each reactive API extends `SelectContext` with additional capabilities:

```
                    ┌──────────────────────┐
                    │    SelectContext     │
                    │                      │
                    │  read, all, any,     │
                    │  race, settled,      │
                    │  safe, state, from,  │
                    │  track, and, or      │
                    └──────────┬───────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
   │ DerivedContext│   │ EffectContext │   │ReactiveContext│
   │               │   │               │   │               │
   │ + ready()     │   │ + ready()     │   │  (no extra    │
   │               │   │ + onCleanup() │   │   methods)    │
   │               │   │ + signal      │   │               │
   └───────┬───────┘   └───────────────┘   └───────┬───────┘
           │                                       │
           │                               ┌───────┴───────┐
           ▼                               ▼               ▼
    ┌─────────────┐                 ┌───────────┐   ┌───────────┐
    │  derived()  │                 │useSelector│   │   rx()    │
    └─────────────┘                 └───────────┘   └───────────┘
```

### Why This Matters

1. **Learn once, use everywhere** - Same `read()`, `all()`, `safe()` patterns work in all contexts
2. **Consistent behavior** - Suspense, dependency tracking, re-evaluation work identically
3. **Composable** - Extract selector logic into reusable functions
4. **Predictable** - Same mental model across the entire codebase

```typescript
// ✅ Reusable selector function works in ANY context
const selectDashboard = ({ read, all }: SelectContext) => {
  const [user, posts] = all([user$, posts$]);
  return { user, posts, postCount: posts.length };
};

// Use in derived
const dashboard$ = derived(selectDashboard);

// Use in useSelector
const dashboard = useSelector(selectDashboard);

// Use in effect
effect((ctx) => {
  const { user, postCount } = selectDashboard(ctx);
  analytics.track("dashboard_loaded", { userId: user.id, postCount });
});
```

## Unified Context (CRITICAL)

**MUST** understand that `SelectContext` methods work identically in:

| Context         | Usage                   | Additional Methods                 |
| --------------- | ----------------------- | ---------------------------------- |
| `derived()`     | Computed values         | `ready()`                          |
| `effect()`      | Side effects            | `ready()`, `onCleanup()`, `signal` |
| `useSelector()` | React subscriptions     |                                    |
| `rx()`          | Inline React components |                                    |

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

## Suspense Mechanism (CRITICAL)

Understanding how the Suspense mechanism works is essential for writing correct selectors.

### How It Works: Throw Promise → Re-evaluate

When a selector reads an async atom that is still loading, it **throws a Promise** instead of returning a value. The system catches this Promise, waits for it to resolve, then **re-evaluates the entire selector from the beginning**.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SELECTOR EVALUATION                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Start selector  │
                    │ execution       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ read(atom$)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌───────────┐  ┌───────────┐
        │  READY   │  │  LOADING  │  │   ERROR   │
        │          │  │           │  │           │
        │ Return   │  │  Throw    │  │  Throw    │
        │ value    │  │  Promise  │  │  Error    │
        └────┬─────┘  └─────┬─────┘  └─────┬─────┘
             │              │              │
             ▼              ▼              ▼
      ┌────────────┐  ┌───────────┐  ┌───────────┐
      │ Continue   │  │  System   │  │  Error    │
      │ execution  │  │  catches  │  │  handler  │
      └────────────┘  │  Promise  │  └───────────┘
                      └─────┬─────┘
                            │
                            ▼
                      ┌───────────┐
                      │  Wait for │
                      │  Promise  │
                      │  resolve  │
                      └─────┬─────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ RE-EVALUATE SELECTOR    │
              │ from the beginning      │
              │ (start over)            │
              └─────────────────────────┘
```

### Re-evaluation Example

```typescript
const dashboard$ = derived(({ read }) => {
  console.log("1. Starting evaluation");

  const user = read(user$); // If loading → throws Promise, stops here
  console.log("2. Got user:", user.name);

  const posts = read(posts$); // If loading → throws Promise, stops here
  console.log("3. Got posts:", posts.length);

  return { user, posts };
});

// If user$ is loading:
// Console: "1. Starting evaluation"
// [Promise thrown, wait...]
// [user$ resolves]

// Re-evaluation starts:
// Console: "1. Starting evaluation"
// Console: "2. Got user: John"
// [If posts$ is loading → throws Promise, wait...]
// [posts$ resolves]

// Re-evaluation starts again:
// Console: "1. Starting evaluation"
// Console: "2. Got user: John"
// Console: "3. Got posts: 5"
// [Returns { user, posts }]
```

### CRITICAL: Promise Must Be Stable

**The thrown Promise MUST be the same reference across re-evaluations.** If the Promise changes on each evaluation, the system will create infinite loops.

```typescript
// ❌ FORBIDDEN - Creates new Promise each evaluation → infinite loop
const data$ = atom(null);
const computed$ = derived(({ read }) => {
  const value = read(data$);
  if (!value) {
    throw fetch("/api/data"); // NEW Promise each time!
  }
  return value;
});

// ❌ FORBIDDEN - Dynamic Promise in selector
derived(({ read }) => {
  // This creates a NEW Promise each evaluation!
  const asyncAtom$ = atom(fetch("/api/" + Date.now()));
  return read(asyncAtom$); // Different Promise each time → infinite loop
});

// ✅ CORRECT - Promise is stable (same reference)
const data$ = atom(fetch("/api/data")); // Promise created ONCE
const computed$ = derived(({ read }) => {
  return read(data$); // Same Promise reference on re-eval
});

// ✅ CORRECT - Stable Promise from pool
const dataPool = pool((id: string) => fetch(`/api/${id}`));
const computed$ = derived(({ read, from }) => {
  const data$ = from(dataPool, "user-1"); // Same entry, same Promise
  return read(data$);
});
```

### Promise Stability Rules

| Pattern                         | Safe? | Why                                   |
| ------------------------------- | ----- | ------------------------------------- |
| `atom(fetchPromise)`            | ✅    | Promise created once at atom creation |
| `atom(() => fetch())`           | ✅    | Promise created once per lazy init    |
| `pool((id) => fetch())`         | ✅    | Promise cached per params             |
| `throw fetch()` in selector     | ❌    | New Promise each evaluation           |
| `atom(fetch())` inside selector | ❌    | New atom/Promise each evaluation      |
| `read(atom(dynamicValue))`      | ❌    | New atom each evaluation              |

### Multiple Async Dependencies

When multiple atoms are loading, the selector may re-evaluate multiple times:

```
read(user$) → loading → throw Promise₁
[wait for Promise₁]
re-eval: read(user$) → ready ✓
         read(posts$) → loading → throw Promise₂
[wait for Promise₂]
re-eval: read(user$) → ready ✓
         read(posts$) → ready ✓
         → return result
```

### BEST PRACTICE: Use all() for Multiple Atoms

**When reading multiple atoms, ALWAYS prefer `all()` over sequential `read()` calls:**

```typescript
// ❌ INEFFICIENT - Sequential reads cause multiple re-evaluations
const dashboard$ = derived(({ read }) => {
  const user = read(user$); // Re-eval #1 if loading
  const posts = read(posts$); // Re-eval #2 if loading
  const comments = read(comments$); // Re-eval #3 if loading
  return { user, posts, comments };
});
// Worst case: 3 separate re-evaluations!

// ✅ OPTIMIZED - all() combines into single wait
const dashboard$ = derived(({ all }) => {
  const [user, posts, comments] = all([user$, posts$, comments$]);
  // Single combined Promise, waits for ALL at once
  // Only 1 re-evaluation after all resolve!
  return { user, posts, comments };
});
```

**Why `all()` is better:**

| Pattern             | Re-evaluations         | Wait Strategy    |
| ------------------- | ---------------------- | ---------------- |
| Sequential `read()` | Up to N (one per atom) | Waterfall (slow) |
| `all([...])`        | 1                      | Parallel (fast)  |

### Why Selectors Must Be Synchronous

Because selectors can be re-evaluated multiple times:

1. **No side effects** - Side effects would run multiple times
2. **No async/await** - Can't throw Promise mid-execution
3. **Pure computation** - Same inputs → same outputs
4. **Idempotent reads** - Re-reading same atom is safe

```typescript
// ❌ FORBIDDEN - Side effect runs multiple times on re-eval
derived(({ read }) => {
  console.log("Fetching..."); // Logs multiple times!
  analytics.track("computed"); // Tracks multiple times!
  return read(data$);
});

// ❌ FORBIDDEN - async function can't throw Promise
derived(async ({ read }) => {
  const data = await read(data$); // WRONG: await doesn't work
  return data;
});

// ✅ CORRECT - Pure, synchronous, no side effects
derived(({ read }) => {
  const data = read(data$); // Throws Promise if loading
  return transform(data); // Pure transformation
});
```

### state() - Opt-out of Suspense

Use `state()` when you want to handle loading/error manually without throwing:

```typescript
const dashboard$ = derived(({ state }) => {
  const userState = state(user$);

  // No Promise thrown - you handle all states
  if (userState.status === "loading") {
    return { loading: true, user: null };
  }
  if (userState.status === "error") {
    return { loading: false, error: userState.error };
  }
  return { loading: false, user: userState.value };
});
```

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

**Tip:** When reading multiple atoms, use `all()` instead of multiple `read()` calls to optimize re-evaluations. See [BEST PRACTICE: Use all() for Multiple Atoms](#best-practice-use-all-for-multiple-atoms).

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
