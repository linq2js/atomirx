---
name: atomirx-state-management
description: Guide for working with atomirx reactive state management library. Use when working with atomirx primitives (atom, derived, effect, select), implementing store patterns with define(), using ready() for deferred loading, debugging reactive data flows, handling async operations, or integrating with React (useSelector, rx, useAction). Triggers on atomirx imports, atom$ naming conventions, or reactive state patterns.
---

# atomirx State Management

## Core Primitives

| Primitive          | Purpose                            | Creates Subscription |
| ------------------ | ---------------------------------- | -------------------- |
| `atom<T>(initial)` | Mutable state container            | No                   |
| `derived(fn)`      | Computed value from other atoms    | Yes (lazy)           |
| `effect(fn)`       | Side effects on state changes      | Yes (eager)          |
| `select(fn)`       | One-time read without subscription | No                   |
| `batch(fn)`        | Group updates into single notify   | No                   |
| `define(fn)`       | Lazy singleton factory             | No                   |
| `onCreateHook`     | Track atom/effect/module creation  | No                   |
| `onErrorHook`      | Global error handling              | No                   |

## SelectContext Methods

| Method      | Signature                   | Behavior                              |
| ----------- | --------------------------- | ------------------------------------- |
| `read()`    | `read(atom$)`               | Read + track dependency               |
| `ready()`   | `ready(atom$)` or with `fn` | Wait for non-null (suspends)          |
| `safe()`    | `safe(() => expr)`          | Catch errors, preserve Suspense       |
| `all()`     | `all([a$, b$])`             | Wait for all (like Promise.all)       |
| `any()`     | `any({ a: a$, b: b$ })`     | First ready (like Promise.any)        |
| `race()`    | `race({ a: a$, b: b$ })`    | First settled (like Promise.race)     |
| `settled()` | `settled([a$, b$])`         | All results (like Promise.allSettled) |
| `state()`   | `state(atom$)`              | Get state without throwing            |

## read() vs ready() vs state()

| Method    | On null/undefined    | On loading            | Use Case                      |
| --------- | -------------------- | --------------------- | ----------------------------- |
| `read()`  | Returns null         | Throws Promise        | Always need value             |
| `ready()` | Suspends computation | Throws Promise        | Wait for data                 |
| `state()` | Returns state object | Returns loading state | Manual loading/error handling |

## Key Rules

1. **MUST use define() for all state/logic** - Global classes/utils OK, but variables/state MUST be in `define()`.
2. **MUST use batch() for multiple atom updates** - Wrap multiple `.set()` calls in `batch()` for single notification.
3. **Group multiple useSelector calls** - Each call creates a subscription. Group reads into single selector.
4. **useAction deps: pass atoms, not values** - For `lazy: false` auto re-dispatch, pass atoms to `deps` and use `.get()` inside.
5. **Never use try/catch with read()** - breaks Suspense. Use `safe()` instead.
6. **Co-locate mutations in store** - all `.set()` calls for an atom belong in its store.
7. **Export readonly atoms** - Use `readonly({ atom$ })` to prevent external mutations.
8. **SelectContext is synchronous only** - can't use `read()` in setTimeout/Promise.then.
9. **Service vs Store naming** - Services are stateless (`*Service`), Stores contain atoms (`*Store`). See Naming Conventions.
10. **NEVER import service factories** - Use `define()` for services, consume via invocation. See FORBIDDEN Patterns.
11. **Single effect, single workflow** - Each effect handles ONE workflow. Split multiple workflows into separate effects.
12. **MUST define meta.key for atoms/derived/effects** - Use `{ meta: { key: "store.name" } }` for debugging.
13. **MUST use .override() for hooks** - Never assign directly to `.current`. Use `.override()` to preserve hook chain.
14. **MUST use useStable() for callbacks** - NEVER use React's useCallback. Use `useStable({ callback1, callback2 })` instead.

### meta.key for Debugging (CRITICAL)

```tsx
// ✅ DO: Define meta.key for all reactive primitives
const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
const isAuth$ = derived(({ read }) => !!read(user$), { meta: { key: "auth.isAuthenticated" } });
effect(({ read }) => { ... }, { meta: { key: "auth.persistSession" } });

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
// load() to call, load.loading, load.result, load.error for state

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

const columns = useMemo(
  () => [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ],
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

  // Dates
  startDate: new Date(),
});

// Usage: stable.onSubmit, stable.config, stable.columns, stable.startDate
```

**Why useStable over useCallback/useMemo:**

1. **Stable references** — values never change identity, no dependency arrays needed
2. **Always fresh values** — closures capture current values, no stale closure bugs
3. **Cleaner code** — group related stable values together
4. **Better performance** — no re-creation on every render
5. **Works with any value** — functions, objects, arrays, dates

**Pattern in `.logic.ts` hooks:**

```tsx
export function useAuthPageLogic() {
  const auth = authStore();
  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");

  // ✅ Group ALL stable values with useStable
  const stable = useStable({
    // Callbacks
    onRegister: async () => {
      if (!username.trim()) return;
      await auth.register(username.trim());
    },
    onLogin: async () => {
      await auth.login();
    },
    onSwitchToRegister: () => {
      auth.clearError();
      setView("register");
    },
    onSwitchToLogin: () => {
      auth.clearError();
      setView("login");
    },

    // Config/options that need stable reference
    formOptions: {
      validateOnBlur: true,
      validateOnChange: false,
    },
  });

  return {
    view,
    username,
    setUsername,
    ...stable, // Spread all stable values
  };
}
```

**When to use useStable vs useMemo:**

| Use Case                                  | Use                                                |
| ----------------------------------------- | -------------------------------------------------- |
| Callbacks/handlers                        | `useStable` (ALWAYS)                               |
| Config objects passed as props            | `useStable`                                        |
| Arrays passed as props (columns, options) | `useStable`                                        |
| Expensive computed values                 | `useMemo` (computation cost > reference stability) |
| Derived data from state                   | `useMemo` or just compute inline                   |

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
| `onCreateHook` | DevTools, persistence, validation | `{ type, key, meta, atom/effect }` |
| `onErrorHook`  | Monitoring, logging, toast alerts | `{ source: CreateInfo, error }`    |

See [references/hooks.md](references/hooks.md) for complete patterns.

## Finding Things in Codebase

| To Find          | Search Pattern                                                       |
| ---------------- | -------------------------------------------------------------------- |
| Atom definitions | `atom<` or `atom(`                                                   |
| Derived atoms    | `derived((`                                                          |
| Effects          | `effect((`                                                           |
| Stores           | `define(() =>` in `*.store.ts` files                                 |
| Services         | `define(() =>` in `*.service.ts` files                               |
| Atom usages      | `read(`, `ready(`, `all([`, `any({`, `race({`, `settled([`, `state(` |
| Mutations        | Find the store that owns the atom, look at its return statement      |
| Hook setup       | `onCreateHook.override`, `onErrorHook.override`                      |

## Tracing "Why doesn't X update?"

1. Find atom being set → search `.set(`
2. Find subscribers → search `read(atomName$)`, `ready(atomName$)`, etc.
3. Check derived is subscribed → used in `useSelector`?
4. Check effect cleanup → doesn't prevent re-run?

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

## Naming Conventions

| Type        | Purpose              | Variable Name | File Name         | Contains                |
| ----------- | -------------------- | ------------- | ----------------- | ----------------------- |
| **Service** | Stateless logic, I/O | `authService` | `auth.service.ts` | Pure functions only     |
| **Store**   | Reactive state       | `authStore`   | `auth.store.ts`   | Atoms, derived, effects |

- **Atoms**: `$` suffix → `count$`, `user$`
- **Services**: camelCase, `Service` suffix → `authService`, `cryptoService` (NO atoms)
- **Stores**: camelCase, `Store` suffix → `authStore`, `todosStore` (HAS atoms)
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
- [Deferred Loading](references/deferred-loading.md) - Entity loading with ready()
- [React Integration](references/react-integration.md) - useSelector, rx, useAction
- [Error Handling](references/error-handling.md) - safe() vs try/catch details
- [Async Patterns](references/async-patterns.md) - all, any, race, settled
- [Hooks](references/hooks.md) - onCreateHook, onErrorHook, middleware patterns
- [Store Template](references/store-template.md) - JSDoc template for stores (stateful)
- [Service Template](references/service-template.md) - JSDoc template for services (stateless)
