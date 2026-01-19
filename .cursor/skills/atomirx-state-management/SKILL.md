---
name: atomirx-state-management
description: Guide for working with atomirx reactive state management library. Use when working with atomirx primitives (atom, derived, effect, select), implementing module patterns with define(), using ready() for deferred loading, debugging reactive data flows, handling async operations, or integrating with React (useSelector, rx, useAction). Triggers on atomirx imports, atom$ naming conventions, or reactive state patterns.
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
| `define(fn)`       | Lazy singleton module factory      | No                   |

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
6. **Co-locate mutations in module** - all `.set()` calls for an atom belong in its module.
7. **Export readonly atoms** - Use `readonly({ atom$ })` to prevent external mutations.
8. **SelectContext is synchronous only** - can't use `read()` in setTimeout/Promise.then.

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
const [load] = useAction(async () => atom1$.get() + (await atom2$.get()), {
  deps: [atom1$, atom2$],
  lazy: false,
});

// ❌ DON'T: useSelector values in deps (causes Suspense, stale closures)
const { v1, v2 } = useSelector(({ read }) => ({
  v1: read(atom1$),
  v2: read(atom2$),
}));
const [load] = useAction(async () => v1 + v2, { deps: [v1, v2], lazy: false });
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

### define() Module Isolation (CRITICAL)

```tsx
// ✅ DO: All state and logic in define()
export const counterModule = define(() => {
  const count$ = atom(0);
  return {
    ...readonly({ count$ }), // Prevent external mutations
    increment: () => count$.set((x) => x + 1),
  };
});

// ✅ DO: Override for environment/testing
const storageModule = define((): StorageModule => {
  throw new Error("Not implemented");
});
storageModule.override(webStorageModule); // or nativeStorageModule

// ❌ DON'T: Global variables outside define()
const count$ = atom(0); // Not testable, not mockable
```

See [references/rules.md](references/rules.md) for detailed examples.

## Finding Things in Codebase

| To Find          | Search Pattern                                                       |
| ---------------- | -------------------------------------------------------------------- |
| Atom definitions | `atom<` or `atom(`                                                   |
| Derived atoms    | `derived((`                                                          |
| Effects          | `effect((`                                                           |
| Modules          | `define(() =>`                                                       |
| Atom usages      | `read(`, `ready(`, `all([`, `any({`, `race({`, `settled([`, `state(` |
| Mutations        | Find the module that owns the atom, look at its return statement     |

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

## Naming Conventions

- **Atoms**: `$` suffix → `count$`, `user$`
- **Modules**: camelCase, `Module` suffix → `authModule`, `articleModule`
- **Actions**: verb-led → `navigateTo`, `invalidate`, `refresh`

## References

- [Rules & Best Practices](references/rules.md) - Storage, mutations, error handling
- [Deferred Loading](references/deferred-loading.md) - Entity loading with ready()
- [React Integration](references/react-integration.md) - useSelector, rx, useAction
- [Error Handling](references/error-handling.md) - safe() vs try/catch details
- [Async Patterns](references/async-patterns.md) - all, any, race, settled
- [Module Template](references/module-template.md) - JSDoc documentation templates
