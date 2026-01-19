# Module Documentation Template

Use this JSDoc template when documenting atomirx modules to help both humans and AI understand the reactive structure.

## Full Template

```typescript
/**
 * @module moduleName
 *
 * @description Brief description of what this module manages
 *
 * @atoms
 * - atomName$ - Description of what this atom stores
 * - anotherAtom$ - Description
 *
 * @derived
 * - derivedName$ - What it computes and from what
 *
 * @effects
 * - Brief description of each side effect
 *
 * @actions
 * - actionName(args) - What it does
 * - anotherAction() - What it does
 *
 * @reactive-flow
 * trigger → atom$ → [derived$] + [effect] → result
 *
 * @example
 * // Usage example
 * const { action, state$ } = myModule;
 * action(args);
 * const value = useSelector(state$);
 */
const moduleName = define(() => {
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

For complex modules, include ASCII graph at top:

```typescript
const articleModule = define(() => {
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

## Minimal Template (Small Modules)

For simple modules, use condensed format:

```typescript
/**
 * @module counterModule
 * @atoms count$ - Current count value
 * @actions increment(), decrement(), reset()
 */
const counterModule = define(() => {
  const count$ = atom(0);
  return {
    ...readonly({ count$ }),
    increment: () => count$.set((c) => c + 1),
    decrement: () => count$.set((c) => c - 1),
    reset: () => count$.set(0),
  };
});
```
