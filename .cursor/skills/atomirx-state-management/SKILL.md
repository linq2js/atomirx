---
name: atomirx-state-management
description: Guide for working with atomirx reactive state management library. Use when working with atomirx primitives (atom, derived, effect, select, pool), implementing store patterns with define(), using ready() for deferred loading, debugging reactive data flows, handling async operations, or integrating with React (useSelector, rx, useAction, useStable). Triggers on atomirx imports, atom$ naming conventions, or reactive state patterns.
---

# atomirx State Management

## Core Primitives

| Primitive          | Purpose                            | Creates Subscription |
| ------------------ | ---------------------------------- | -------------------- |
| `atom<T>(initial)` | Mutable state container            | No                   |
| `derived(fn)`      | Computed value from other atoms    | Yes (lazy)           |
| `effect(fn)`       | Side effects on state changes      | Yes (eager)          |
| `select(fn)`       | One-time read without subscription | No                   |
| `pool(fn, opts)`   | Collection of atoms indexed by params | No (per-entry GC) |
| `batch(fn)`        | Group updates into single notify   | No                   |
| `define(fn)`       | Lazy singleton factory             | No                   |
| `onCreateHook`     | Track atom/effect/module creation  | No                   |
| `onErrorHook`      | Global error handling              | No                   |

## SelectContext Methods (Unified Across All Reactive Contexts)

**CRITICAL:** These methods work **identically** in `derived()`, `effect()`, `useSelector()`, and `rx()`. Learn once, use everywhere.

| Method      | Signature                   | Behavior                              |
| ----------- | --------------------------- | ------------------------------------- |
| `read()`    | `read(atom$)`               | Read + track dependency               |
| `ready()`   | `ready(atom$)` or with `fn` | Wait for non-null (suspends)          |
| `from()`    | `from(pool, params)`        | Get ScopedAtom from pool              |
| `track()`   | `track(atom$)`              | Track dependency without reading      |
| `safe()`    | `safe(() => expr)`          | Catch errors, preserve Suspense       |
| `all()`     | `all([a$, b$])`             | Wait for all (like Promise.all)       |
| `any()`     | `any({ a: a$, b: b$ })`     | First ready (like Promise.any)        |
| `race()`    | `race({ a: a$, b: b$ })`    | First settled (like Promise.race)     |
| `settled()` | `settled([a$, b$])`         | All results (like Promise.allSettled) |
| `state()`   | `state(atom$)`              | Get state without throwing            |
| `and()`     | `and([cond1, cond2])`       | Logical AND with short-circuit        |
| `or()`      | `or([cond1, cond2])`        | Logical OR with short-circuit         |

```typescript
// ✅ SAME pattern works in derived(), effect(), useSelector(), rx()
const pattern = ({ read, all, safe }) => {
  const [user, posts] = all([user$, posts$]);
  const [err, parsed] = safe(() => JSON.parse(read(config$)));
  return { user, posts, config: err ? null : parsed };
};

// Use in any context:
const combined$ = derived(pattern);
effect(({ read, all }) => console.log(all([user$, posts$])));
const data = useSelector(pattern);
{rx(pattern)}
```

## read() vs ready() vs state()

| Method    | On null/undefined    | On loading            | Use Case                      |
| --------- | -------------------- | --------------------- | ----------------------------- |
| `read()`  | Returns null         | Throws Promise        | Always need value             |
| `ready()` | Suspends computation | Throws Promise        | Wait for data                 |
| `state()` | Returns state object | Returns loading state | Manual loading/error handling |

## Key Rules

1. **MUST use define() for all state/logic** - Global classes/utils OK, but variables/state MUST be in `define()`.
2. **MUST use batch() for multiple atom updates** - Wrap multiple `.set()` calls in `batch()` for single notification.
3. **MUST group multiple useSelector calls** - Each call creates a subscription. Group reads into single selector.
4. **useAction deps: MUST pass atoms, not values** - For `lazy: false` auto re-dispatch, pass atoms to `deps` and use `.get()` inside.
5. **NEVER use try/catch with read()** - BREAKS Suspense. Use `safe()` instead.
6. **MUST co-locate mutations in store** - all `.set()` calls for an atom MUST belong in its store.
7. **MUST export readonly atoms** - Use `readonly({ atom$ })` to prevent external mutations.
8. **SelectContext is synchronous ONLY** - NEVER use `read()` in setTimeout/Promise.then.
9. **Service vs Store naming** - Services are stateless (`*Service`), Stores contain atoms (`*Store`). See Naming Conventions.
10. **NEVER import service factories** - Use `define()` for services, consume via invocation. See FORBIDDEN Patterns.
11. **Single effect, single workflow** - Each effect handles ONE workflow. Split multiple workflows into separate effects.
12. **MUST define meta.key for atoms/derived/effects** - Use `{ meta: { key: "store.name" } }` for debugging.
13. **MUST use .override() for hooks** - Never assign directly to `.current`. Use `.override()` to preserve hook chain.
14. **MUST use useStable() for callbacks** - NEVER use React's useCallback. Use `useStable({ callback1, callback2 })` instead.
15. **Use pool for parameterized state** - When you need atoms indexed by ID/params, use `pool()` instead of manual Maps.

### meta.key for Debugging (CRITICAL)

```tsx
// ✅ DO: Define meta.key for all reactive primitives
const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
const isAuth$ = derived(({ read }) => !!read(user$), { meta: { key: "auth.isAuthenticated" } });
effect(({ read }) => { ... }, { meta: { key: "auth.persistSession" } });
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000, meta: { key: "users" } });

// ❌ DON'T: Skip meta.key (hard to debug)
const user$ = atom<User | null>(null);
const isAuth$ = derived(({ read }) => !!read(user$));
effect(({ read }) => { ... });
```

### useSelector Grouping (IMPORTANT)

```tsx
// ✅ DO: Single useSelector with multiple reads
const { user, posts, settings } = useSelector(({ read }) => ({
  user: read(user$),
  posts: read(posts$),
  settings: read(settings$),
}));

// ❌ DON'T: Multiple useSelector calls
const user = useSelector(user$);
const posts = useSelector(posts$);
const settings = useSelector(settings$);
```

### useAction with Atom Deps (IMPORTANT)

```tsx
// ✅ DO: Pass atoms to deps, use .get() inside
const load = useAction(async () => atom1$.get() + (await atom2$.get()), {
  deps: [atom1$, atom2$],
  lazy: false,
});
// load() to call, load.status, load.result, load.error for state

// ❌ DON'T: useSelector values in deps (causes Suspense, stale closures)
const { v1, v2 } = useSelector(({ read }) => ({
  v1: read(atom1$),
  v2: read(atom2$),
}));
const load = useAction(async () => v1 + v2, { deps: [v1, v2], lazy: false });
```

### batch() for Multiple Updates (IMPORTANT)

```tsx
// ✅ DO: Wrap multiple updates in batch()
batch(() => {
  user$.set(newUser);
  settings$.set(newSettings);
  lastUpdated$.set(Date.now());
});

// ❌ DON'T: Multiple separate updates (triggers multiple re-renders)
user$.set(newUser);
settings$.set(newSettings);
lastUpdated$.set(Date.now());
```

### useStable() for Callbacks and Values (CRITICAL)

**MUST use `useStable()` instead of React's `useCallback` and `useMemo` for stable references.**

`useStable` works with:

- **Functions/callbacks** — stable identity, always fresh closures
- **Arrays** — stable reference for dependency arrays
- **Objects** — stable reference for config objects
- **Dates** — stable reference for date values

```tsx
// ❌ FORBIDDEN: React useCallback/useMemo
const handleSubmit = useCallback(() => {
  auth.register(username);
}, [auth, username]);

const config = useMemo(
  () => ({
    timeout: 5000,
    retries: 3,
  }),
  []
);

// ✅ REQUIRED: useStable for callbacks, arrays, objects
const stable = useStable({
  // Callbacks
  onSubmit: () => auth.register(username),
  onLogin: () => auth.login(),
  onCancel: () => setView("idle"),

  // Config objects
  config: {
    timeout: 5000,
    retries: 3,
  },

  // Arrays (e.g., table columns, options)
  columns: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ],
});

// Usage: stable.onSubmit, stable.config, stable.columns
```

### pool() for Parameterized State (IMPORTANT)

```tsx
// ✅ DO: Use pool for entity caches
const userPool = pool(
  (id: string) => fetchUser(id),
  { gcTime: 60_000, meta: { key: "users" } }
);

// Public API (value-based)
userPool.get("user-1");  // T
userPool.set("user-1", newUser);
userPool.remove("user-1");

// In reactive context - use from() to get ScopedAtom
const userPosts$ = derived(({ read, from }) => {
  const user$ = from(userPool, "user-1"); // ScopedAtom<User>
  return read(user$).posts;
});

// ❌ DON'T: Manual Map-based caching
const userCache = new Map<string, MutableAtom<User>>();
function getUser(id: string) {
  if (!userCache.has(id)) {
    userCache.set(id, atom(fetchUser(id)));
  }
  return userCache.get(id)!;
}
```

### and()/or() for Boolean Logic (IMPORTANT)

```tsx
// ✅ DO: Use and()/or() for boolean conditions with atoms
const canEdit$ = derived(({ and }) => and([isLoggedIn$, hasPermission$]));
const hasData$ = derived(({ or }) => or([cacheData$, apiData$]));

// With lazy evaluation (short-circuit)
const canDelete$ = derived(({ and }) => and([
  isLoggedIn$,                    // Always evaluated
  () => hasDeletePermission$,     // Only evaluated if logged in
]));

// Nested logic: (A && B) || C
const result$ = derived(({ or, and }) => or([and([a$, b$]), c$]));

// ❌ DON'T: Manual boolean logic (verbose, no short-circuit)
const canEdit$ = derived(({ read }) => read(isLoggedIn$) && read(hasPermission$));
```

### define() for Services and Stores (CRITICAL)

```tsx
// ✅ DO: All state in define() - this is a STORE (has atoms)
export const counterStore = define(() => {
  const count$ = atom(0);
  return {
    ...readonly({ count$ }), // Prevent external mutations
    increment: () => count$.set((x) => x + 1),
  };
});

// ✅ DO: Services also use define() - this is a SERVICE (stateless)
export const storageService = define(
  (): StorageService => ({
    get: (key) => localStorage.getItem(key),
    set: (key, val) => localStorage.setItem(key, val),
  })
);

// ✅ DO: Override for environment/testing
storageService.override(mockStorageService);

// ❌ DON'T: Global variables outside define()
const count$ = atom(0); // Not testable, not mockable
```

### FORBIDDEN: Service Factory Pattern (CRITICAL)

```tsx
// ❌ FORBIDDEN: Factory functions for services
import { getAuthService } from "@/services/auth";
import { getCryptoService } from "@/services/crypto";

export const authStore = define(() => {
  const auth = getAuthService(); // WRONG! Factory pattern
  const crypto = getCryptoService(); // WRONG! Factory pattern
  // ...
});

// ✅ REQUIRED: Services as define() modules
import { authService } from "@/services/auth.service";
import { cryptoService } from "@/services/crypto.service";

export const authStore = define(() => {
  const auth = authService(); // Correct! Module invocation
  const crypto = cryptoService(); // Correct! Module invocation
  // ...
});
```

**Detection Pattern for AI:**

- `get*Service()`, `create*()`, `*Factory()` → STOP, refactor to `define()`
- `import { get* }` for services → WRONG pattern

See [references/rules.md](references/rules.md) for detailed examples.

### Hooks for Middleware & Error Handling (CRITICAL)

```tsx
// ❌ FORBIDDEN: Direct assignment breaks hook chain
onCreateHook.current = (info) => { ... };
onErrorHook.current = (info) => { ... };

// ✅ REQUIRED: Use .override() to preserve chain
onCreateHook.override((prev) => (info) => {
  prev?.(info); // call existing handlers first
  console.log(`Created ${info.type}: ${info.key}`);
});

onErrorHook.override((prev) => (info) => {
  prev?.(info); // call existing handlers first
  Sentry.captureException(info.error);
});

// Reset all handlers
onCreateHook.reset();
onErrorHook.reset();
```

| Hook           | Use Case                          | Info Type                          |
| -------------- | --------------------------------- | ---------------------------------- |
| `onCreateHook` | DevTools, persistence, validation | `{ type, key, meta, instance }` |
| `onErrorHook`  | Monitoring, logging, toast alerts | `{ source: CreateInfo, error }`    |

See [references/hooks.md](references/hooks.md) for complete patterns.

## Finding Things in Codebase

| To Find          | Search Pattern                                                       |
| ---------------- | -------------------------------------------------------------------- |
| Atom definitions | `atom<` or `atom(`                                                   |
| Derived atoms    | `derived((`                                                          |
| Effects          | `effect((`                                                           |
| Pools            | `pool((`                                                             |
| Stores           | `define(() =>` in `*.store.ts` files                                 |
| Services         | `define(() =>` in `*.service.ts` files                               |
| Atom usages      | `read(`, `ready(`, `all([`, `any({`, `race({`, `settled([`, `state(` |
| Pool usages      | `from(poolName,`                                                     |
| Mutations        | Find the store that owns the atom, look at its return statement      |
| Hook setup       | `onCreateHook.override`, `onErrorHook.override`                      |

## Tracing "Why doesn't X update?"

1. Find atom being set → search `.set(`
2. Find subscribers → search `read(atomName$)`, `ready(atomName$)`, etc.
3. Check derived is subscribed → used in `useSelector`?
4. Check effect cleanup → doesn't prevent re-run?
5. For pools → check if entry was GC'd, verify `from()` usage

## Common Issues

| Symptom                | Likely Cause                 | Fix                             |
| ---------------------- | ---------------------------- | ------------------------------- |
| Derived never updates  | No active subscription       | Use `useSelector` in component  |
| Effect runs infinitely | Setting atom it reads        | Use `select()` for non-reactive |
| ready() never resolves | Value never becomes non-null | Check data flow                 |
| Stale closure          | Reading atom in callback     | Use `.get()` in callbacks       |
| Suspense not working   | try/catch around read()      | Use `safe()` instead            |
| Hook not firing        | Direct `.current` assignment | Use `.override()` instead       |
| Missing hook calls     | Hook chain broken            | Always call `prev?.(info)`      |
| Pool entry missing     | GC'd before access           | Increase gcTime or access more  |
| ScopedAtom error       | Used outside select context  | Only use from() inside derived  |

## Naming Conventions

| Type        | Purpose              | Variable Name | File Name         | Contains                |
| ----------- | -------------------- | ------------- | ----------------- | ----------------------- |
| **Service** | Stateless logic, I/O | `authService` | `auth.service.ts` | Pure functions only     |
| **Store**   | Reactive state       | `authStore`   | `auth.store.ts`   | Atoms, derived, effects |

- **Atoms**: `$` suffix → `count$`, `user$`
- **Services**: camelCase, `Service` suffix → `authService`, `cryptoService` (NO atoms)
- **Stores**: camelCase, `Store` suffix → `authStore`, `todosStore` (HAS atoms)
- **Pools**: camelCase, `Pool` suffix → `userPool`, `articlePool`
- **Actions**: verb-led → `navigateTo`, `invalidate`, `refresh`

### File Structure

```
src/
├── services/           # Stateless (no atoms)
│   ├── auth/
│   │   └── auth.service.ts      # authService
│   └── crypto/
│       └── crypto.service.ts    # cryptoService
│
└── stores/             # Stateful (has atoms)
    ├── auth.store.ts            # authStore
    ├── todos.store.ts           # todosStore
    └── sync.store.ts            # syncStore
```

## References

- [Rules & Best Practices](references/rules.md) - Storage, mutations, error handling
- [Pool Patterns](references/pool-patterns.md) - Parameterized state with automatic GC
- [Select Context](references/select-context.md) - All context methods in detail
- [Deferred Loading](references/deferred-loading.md) - Entity loading with ready()
- [React Integration](references/react-integration.md) - useSelector, rx, useAction, useStable
- [Error Handling](references/error-handling.md) - safe() vs try/catch details
- [Async Patterns](references/async-patterns.md) - all, any, race, settled
- [Atom Patterns](references/atom-patterns.md) - Atom features (dirty, signal, cleanup)
- [Derived Patterns](references/derived-patterns.md) - Derived features (staleValue, state, refresh)
- [Effect Patterns](references/effect-patterns.md) - Effect features (cleanup, signal, lifecycle)
- [Hooks](references/hooks.md) - onCreateHook, onErrorHook, middleware patterns
- [Testing Patterns](references/testing-patterns.md) - Testing with define, hooks
- [Store Template](references/store-template.md) - JSDoc template for stores (stateful)
- [Service Template](references/service-template.md) - JSDoc template for services (stateless)
