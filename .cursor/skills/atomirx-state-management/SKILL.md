---
name: atomirx-state-management
description: Guide for atomirx reactive state management. Use for atom, derived, effect, select, pool, define(), ready(), React hooks (useSelector, rx, useAction, useStable), and debugging reactive flows.
---

# atomirx State Management

## Core Primitives

| Primitive          | Purpose                        | Subscription |
| ------------------ | ------------------------------ | ------------ |
| `atom<T>(initial)` | Mutable state                  | No           |
| `derived(fn)`      | Computed value                 | Yes (lazy)   |
| `effect(fn)`       | Side effects on changes        | Yes (eager)  |
| `select(fn)`       | One-time read, no subscription | No           |
| `pool(fn, opts)`   | Parameterized atoms with GC    | Per-entry    |
| `batch(fn)`        | Group updates, single notify   | No           |
| `define(fn)`       | Lazy singleton factory         | No           |
| `onCreateHook`     | Track atom/effect creation     | No           |
| `onErrorHook`      | Global error handling          | No           |

## SelectContext Methods

**Works identically in `derived()`, `effect()`, `useSelector()`, `rx()`.** Learn once, use everywhere.

| Method      | Signature                 | Behavior                          |
| ----------- | ------------------------- | --------------------------------- |
| `read()`    | `read(atom$)`             | Read + track dependency           |
| `ready()`   | `ready(atom$)` or with fn | Wait for non-null (suspends)      |
| `from()`    | `from(pool, params)`      | Get ScopedAtom from pool          |
| `track()`   | `track(atom$)`            | Track without reading             |
| `safe()`    | `safe(() => expr)`        | Catch errors, preserve Suspense   |
| `all()`     | `all([a$, b$])`           | Wait for all (Promise.all)        |
| `any()`     | `any({ a: a$, b: b$ })`   | First ready (Promise.any)         |
| `race()`    | `race({ a: a$, b: b$ })` | First settled (Promise.race)      |
| `settled()` | `settled([a$, b$])`       | All results (Promise.allSettled)  |
| `state()`   | `state(atom$)`            | Get state without throwing        |
| `and()`     | `and([cond1, cond2])`     | Logical AND, short-circuit        |
| `or()`      | `or([cond1, cond2])`      | Logical OR, short-circuit         |

```typescript
// Same pattern works everywhere
const pattern = ({ read, all, safe }) => {
  const [user, posts] = all([user$, posts$]);
  const [err, parsed] = safe(() => JSON.parse(read(config$)));
  return { user, posts, config: err ? null : parsed };
};

const combined$ = derived(pattern);
const data = useSelector(pattern);
effect(pattern);
{rx(pattern)}
```

## read() vs ready() vs state()

| Method    | On null/undefined | On loading     | Use Case              |
| --------- | ----------------- | -------------- | --------------------- |
| `read()`  | Returns null      | Throws Promise | Always need value     |
| `ready()` | Suspends          | Throws Promise | Wait for data         |
| `state()` | Returns state obj | Returns state  | Manual loading/error  |

## Key Rules

1. **MUST use define()** for all state/logic. Global classes OK, variables MUST be in `define()`.
2. **MUST use batch()** for multiple atom updates.
3. **MUST group useSelector calls** into single selector.
4. **useAction deps: pass atoms, use .get() inside** for auto re-dispatch.
5. **NEVER try/catch with read()** — breaks Suspense. Use `safe()`.
6. **MUST co-locate mutations** in store that owns the atom.
7. **MUST export readonly atoms** via `readonly({ atom$ })`.
8. **SelectContext is sync only** — NEVER use in setTimeout/Promise.then.
9. **Services vs Stores** — Services are stateless, Stores have atoms.
10. **NEVER import service factories** — use `define()`, invoke with `()`.
11. **Single effect, single workflow** — split multiple workflows.
12. **MUST define meta.key** for debugging: `{ meta: { key: "store.name" } }`.
13. **MUST use .override()** for hooks, never assign `.current` directly.
14. **MUST use useStable()** — NEVER use React's useCallback.
15. **Use pool** for parameterized state instead of manual Maps.

### meta.key (REQUIRED)

```tsx
// ✅ DO: Define meta.key
const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
const isAuth$ = derived(({ read }) => !!read(user$), { meta: { key: "auth.isAuthenticated" } });
effect(({ read }) => { ... }, { meta: { key: "auth.persistSession" } });
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000, meta: { key: "users" } });

// ❌ DON'T: Skip meta.key
const user$ = atom<User | null>(null);
```

### useSelector Grouping

```tsx
// ✅ DO: Single useSelector
const { user, posts, settings } = useSelector(({ read }) => ({
  user: read(user$),
  posts: read(posts$),
  settings: read(settings$),
}));

// ❌ DON'T: Multiple calls
const user = useSelector(user$);
const posts = useSelector(posts$);
```

### useAction with Atoms

```tsx
// ✅ DO: Pass atoms to deps, use .get() inside
const load = useAction(async () => atom1$.get() + (await atom2$.get()), {
  deps: [atom1$, atom2$],
  lazy: false,
});

// ❌ DON'T: useSelector values in deps
const { v1, v2 } = useSelector(({ read }) => ({ v1: read(atom1$), v2: read(atom2$) }));
const load = useAction(async () => v1 + v2, { deps: [v1, v2], lazy: false });
```

### batch() for Multiple Updates

```tsx
// ✅ DO: Batch
batch(() => {
  user$.set(newUser);
  settings$.set(newSettings);
  lastUpdated$.set(Date.now());
});

// ❌ DON'T: Separate updates
user$.set(newUser);
settings$.set(newSettings);
```

### useStable() (REQUIRED)

**MUST use `useStable()` instead of React's `useCallback`/`useMemo`.**

```tsx
// ❌ FORBIDDEN
const handleSubmit = useCallback(() => auth.register(username), [auth, username]);

// ✅ REQUIRED
const stable = useStable({
  onSubmit: () => auth.register(username),
  onLogin: () => auth.login(),
  config: { timeout: 5000, retries: 3 },
  columns: [{ key: "name", label: "Name" }],
});
```

### pool() for Parameterized State

```tsx
// ✅ DO: Use pool
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000, meta: { key: "users" } });
userPool.get("user-1");
userPool.set("user-1", newUser);

// In reactive context use from()
const userPosts$ = derived(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$).posts;
});

// ❌ DON'T: Manual Map
const userCache = new Map<string, MutableAtom<User>>();
```

### and()/or() for Boolean Logic

```tsx
// ✅ DO: Use and()/or()
const canEdit$ = derived(({ and }) => and([isLoggedIn$, hasPermission$]));
const hasData$ = derived(({ or }) => or([cacheData$, apiData$]));

// Lazy evaluation
const canDelete$ = derived(({ and }) => and([
  isLoggedIn$,
  () => hasDeletePermission$, // Only evaluated if logged in
]));

// ❌ DON'T: Manual logic
const canEdit$ = derived(({ read }) => read(isLoggedIn$) && read(hasPermission$));
```

### define() for Services and Stores

```tsx
// ✅ STORE (has atoms)
export const counterStore = define(() => {
  const count$ = atom(0, { meta: { key: "counter.count" } });
  return {
    ...readonly({ count$ }),
    increment: () => count$.set((x) => x + 1),
  };
});

// ✅ SERVICE (stateless)
export const storageService = define((): StorageService => ({
  get: (key) => localStorage.getItem(key),
  set: (key, val) => localStorage.setItem(key, val),
}));

// ❌ FORBIDDEN: Factory pattern
import { getAuthService } from "@/services/auth";
const auth = getAuthService(); // WRONG

// ✅ REQUIRED: Module invocation
import { authService } from "@/services/auth.service";
const auth = authService(); // Correct
```

### Hooks (.override() REQUIRED)

```tsx
// ❌ FORBIDDEN: Direct assignment
onCreateHook.current = (info) => { ... };

// ✅ REQUIRED: Use .override()
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  console.log(`Created ${info.type}: ${info.key}`);
});

onErrorHook.override((prev) => (info) => {
  prev?.(info);
  Sentry.captureException(info.error);
});
```

## Finding Things

| To Find          | Search Pattern                                               |
| ---------------- | ------------------------------------------------------------ |
| Atom definitions | `atom<` or `atom(`                                           |
| Derived atoms    | `derived((`                                                  |
| Effects          | `effect((`                                                   |
| Pools            | `pool((`                                                     |
| Stores           | `define(() =>` in `*.store.ts`                               |
| Services         | `define(() =>` in `*.service.ts`                             |
| Atom usages      | `read(`, `ready(`, `all([`, `any({`, `race({`, `settled([`   |
| Pool usages      | `from(poolName,`                                             |
| Mutations        | Find store owner, check return statement                     |
| Hook setup       | `onCreateHook.override`, `onErrorHook.override`              |

## Debugging "Why doesn't X update?"

1. Find atom being set → search `.set(`
2. Find subscribers → search `read(atomName$)`, `ready(atomName$)`
3. Check derived is subscribed → used in `useSelector`?
4. Check effect cleanup → doesn't prevent re-run?
5. For pools → check if entry was GC'd, verify `from()` usage

## Common Issues

| Symptom                | Likely Cause               | Fix                             |
| ---------------------- | -------------------------- | ------------------------------- |
| Derived never updates  | No active subscription     | Use `useSelector` in component  |
| Effect runs infinitely | Setting atom it reads      | Use `select()` for non-reactive |
| ready() never resolves | Value never becomes non-null| Check data flow                 |
| Stale closure          | Reading atom in callback   | Use `.get()` in callbacks       |
| Suspense not working   | try/catch around read()    | Use `safe()` instead            |
| Hook not firing        | Direct `.current` assign   | Use `.override()` instead       |
| Missing hook calls     | Hook chain broken          | Always call `prev?.(info)`      |
| Pool entry missing     | GC'd before access         | Increase gcTime                 |
| ScopedAtom error       | Used outside context       | Only use from() inside derived  |

## Naming Conventions

| Type        | Variable      | File              | Contains            |
| ----------- | ------------- | ----------------- | ------------------- |
| **Service** | `authService` | `auth.service.ts` | Pure functions only |
| **Store**   | `authStore`   | `auth.store.ts`   | Atoms, derived, effects |

- **Atoms**: `$` suffix → `count$`, `user$`
- **Services**: `*Service` → `authService` (NO atoms)
- **Stores**: `*Store` → `authStore` (HAS atoms)
- **Pools**: `*Pool` → `userPool`
- **Actions**: verb-led → `navigateTo`, `invalidate`

### File Structure

```
src/
├── services/           # Stateless
│   ├── auth/
│   │   └── auth.service.ts
│   └── crypto/
│       └── crypto.service.ts
└── stores/             # Stateful
    ├── auth.store.ts
    ├── todos.store.ts
    └── sync.store.ts
```

## References

- [Rules & Best Practices](references/rules.md)
- [Pool Patterns](references/pool-patterns.md)
- [Select Context](references/select-context.md)
- [Deferred Loading](references/deferred-loading.md)
- [React Integration](references/react-integration.md)
- [Error Handling](references/error-handling.md)
- [Async Patterns](references/async-patterns.md)
- [Atom Patterns](references/atom-patterns.md)
- [Derived Patterns](references/derived-patterns.md)
- [Effect Patterns](references/effect-patterns.md)
- [Hooks](references/hooks.md)
- [Testing Patterns](references/testing-patterns.md)
- [Store Template](references/store-template.md)
- [Service Template](references/service-template.md)
