# Store Documentation Template

**MUST** use this JSDoc template when documenting atomirx stores to help both humans and AI understand the reactive structure.

## When to Use Store (CRITICAL)

A **Store** is for **stateful** reactive containers that manage atoms.

| Criteria                       | Store                      | Service          |
| ------------------------------ | -------------------------- | ---------------- |
| Contains atoms/derived/effects | ✅ **REQUIRED**            | ❌ **FORBIDDEN** |
| Manages reactive state         | ✅ **REQUIRED**            | ❌ **NEVER**     |
| Wraps external I/O             | ❌ **NEVER** (use service) | ✅ **REQUIRED**  |

## Naming Convention (MUST Follow)

| Element  | Pattern               | Example                           |
| -------- | --------------------- | --------------------------------- |
| Variable | `*Store`              | `authStore`, `todosStore`         |
| File     | `*.store.ts`          | `auth.store.ts`, `todos.store.ts` |
| Location | `stores/` or `state/` | `src/stores/auth.store.ts`        |

## Full Template

```typescript
/**
 * @store storeName
 *
 * @description Brief description of what this store manages
 *
 * @atoms
 * - atomName$ - Description of what this atom stores
 * - anotherAtom$ - Description
 *
 * @derived
 * - derivedName$ - What it computes (depends on: atom1$, atom2$)
 *
 * @effects (single effect = single workflow)
 * - effectName - What it does (watches: atom1$, atom2$) (writes: atom3$)
 *
 * @actions
 * - actionName(args) - What it does (writes: atom1$, atom2$)
 * - anotherAction() - What it does (reads: atom1$, writes: atom2$)
 *
 * @reactive-flow
 * trigger → atom$ → [derived$] + [effect] → result
 *
 * @example
 * // Usage example
 * const { action, state$ } = myStore();
 * action(args);
 * const value = useSelector(state$);
 */
const storeName = define(() => {
  // Implementation
});
```

## Reactive Flow Notation

Use arrows to show data flow direction:

```
action() → atom$ → derived$ → UI
                 → effect → external system
```

### Common Flow Patterns

```
// Simple: action updates atom, UI reflects
updateUser(data) → user$ → UI

// Derived chain: atom feeds derived
setFilter(f) → filter$ → filteredItems$ → UI

// Effect side effect: atom triggers async
login(creds) → credentials$ → [auth effect] → authToken$

// Deferred loading: ready() suspends until data
navigateTo(id) → currentId$ → [currentEntity$ suspends] + [effect fetches]
                            → cache$ updated → currentEntity$ resolves
```

## Dependency Graph Comment

For complex stores, include ASCII graph at top:

```typescript
const articleStore = define(() => {
  // ┌─────────────────────────────────────────────────────────┐
  // │ Dependency Graph:                                       │
  // │                                                         │
  // │  currentArticleId$                                      │
  // │         │                                               │
  // │         ├──────────────┬─────────────────┐              │
  // │         ▼              ▼                 ▼              │
  // │  currentArticle$   fetchEffect      (subscribers)       │
  // │   (ready waits)    (auto-fetch)                         │
  // │         │              │                                │
  // │         ▼              ▼                                │
  // │      articleCache$ ◄───┘                                │
  // │                                                         │
  // │  Legend:                                                │
  // │  ─▶ reactive dependency (read/ready)                    │
  // │  ◄─ writes to                                           │
  // └─────────────────────────────────────────────────────────┘
  // ... implementation
});
```

## Inline Action Documentation

Document each action with its reactive flow:

```typescript
return {
  // ─────────────────────────────────────────────────────────────
  // navigateTo(id) - Navigate to entity
  // ─────────────────────────────────────────────────────────────
  // Flow:
  // 1. Set currentId$ to new ID
  // 2. If cached: derived resolves immediately
  //    If not cached: derived suspends → effect fetches
  // 3. When cache updated, derived resolves → UI updates
  navigateTo: (id: string) => currentId$.set(id),

  // ─────────────────────────────────────────────────────────────
  // refresh() - Force refetch current entity
  // ─────────────────────────────────────────────────────────────
  // Flow:
  // 1. Remove current from cache
  // 2. Derived suspends → UI shows loading
  // 3. Effect detects miss → fetches
  // 4. Cache updated → UI shows fresh data
  refresh: () => {
    cache$.set((prev) => {
      const { [currentId$.get()]: _, ...rest } = prev;
      return rest;
    });
  },
};
```

## Minimal Template (Small Stores)

For simple stores, use condensed format. **MUST still include `meta.key` and `readonly()`:**

```typescript
/**
 * @store counterStore
 * @atoms count$ - Current count value
 * @actions increment(), decrement(), reset()
 */
const counterStore = define(() => {
  // MUST define meta.key
  const count$ = atom(0, { meta: { key: "counter.count" } });
  return {
    // MUST use readonly() to prevent external mutations
    ...readonly({ count$ }),
    increment: () => count$.set((c) => c + 1),
    decrement: () => count$.set((c) => c - 1),
    reset: () => count$.set(0),
  };
});
```

## Key Naming Convention (CRITICAL)

**MUST define `meta.key` for ALL atoms, derived, and effects. NEVER skip this.**

```typescript
// ✅ REQUIRED - Atoms with meta.key
const user$ = atom<User | null>(null, {
  meta: { key: "auth.user" },
});

// ✅ REQUIRED - Derived with meta.key
const isAuthenticated$ = derived(({ read }) => read(user$) !== null, {
  meta: { key: "auth.isAuthenticated" },
});

// ✅ REQUIRED - Effects with meta.key
effect(
  ({ read }) => {
    const id = read(currentId$);
    if (id) fetchEntity(id);
  },
  { meta: { key: "article.autoFetch" } }
);

// ❌ FORBIDDEN - Missing meta.key (hard to debug)
const user$ = atom<User | null>(null);
const isAuth$ = derived(({ read }) => read(user$) !== null);
effect(({ read }) => { ... });
```

| Pattern                 | Example                    |
| ----------------------- | -------------------------- |
| `storeName.atomName`    | `auth.user`, `todos.items` |
| `storeName.derivedName` | `auth.isAuthenticated`     |
| `storeName.effectName`  | `sync.autoSave`            |

## Store Rules Summary (MUST Follow)

| Rule      | Requirement                                                          |
| --------- | -------------------------------------------------------------------- |
| State     | **MUST** contain atoms, derived, and/or effects                      |
| I/O       | **MUST NEVER** wrap I/O directly - inject services instead           |
| Naming    | **MUST** use `*Store` suffix and `*.store.ts` file                   |
| meta.key  | **MUST** define for ALL atoms, derived, and effects                  |
| readonly  | **MUST** export atoms via `readonly()` to prevent external mutations |
| Mutations | **MUST** co-locate all `.set()` calls in the store                   |
| Module    | **MUST** use `define()` for testability                              |
| Effects   | **MUST** have single effect per workflow                             |
