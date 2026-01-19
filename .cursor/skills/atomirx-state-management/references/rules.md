# Rules & Best Practices

## Atom Storage Rules

**Never store atoms in component scope** - causes memory leaks:

```typescript
// ❌ BAD - atoms in component scope
function Component() {
  const data$ = useRef(atom(0)).current; // Memory leak!
}

// ✅ GOOD - Module scope
const data$ = atom(0);

// ✅ BEST - define() module
const dataModule = define(() => {
  const data$ = atom(0);
  return { data$, update: (v) => data$.set(v) };
});
```

**Why:**

- Atoms in components aren't properly disposed on unmount
- Each render may create new atoms
- Easy to forget cleanup logic

## Mutation Co-location Rule

**All atom mutations must be co-located in the module that owns the atom.**

```typescript
// ✅ CORRECT - Mutations inside module
const counterModule = define(() => {
  const count$ = atom(0);

  return {
    ...readonly({ count$ }), // Expose read-only
    // All mutations co-located here
    increment: () => count$.set((prev) => prev + 1),
    decrement: () => count$.set((prev) => prev - 1),
    reset: () => count$.reset(),
  };
});

// ❌ WRONG - Mutations scattered outside module
const { count$ } = counterModule();
count$.set(10); // Don't do this! Mutations should be in module
```

**Why this matters:**

| Benefit           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| **Traceability**  | To find what mutates an atom, just look at its module |
| **Encapsulation** | Module controls all valid state transitions           |
| **Testing**       | Mock the module, not individual atoms                 |
| **Refactoring**   | Change atom internals without hunting for usages      |

**Finding mutation logic:**

```typescript
// When you see this usage:
const { count$ } = counterModule();
// OR
counterModule().count$;

// → All mutations are in counterModule, search there
// → Search: `define(() =>` to find the module definition
// → All .set() calls for count$ will be inside that module
```

## SelectContext: Synchronous Only

All context methods must be called **synchronously** during selector execution:

```typescript
// ❌ WRONG - read() in async callback
derived(({ read }) => {
  setTimeout(() => {
    read(atom$); // Error: called outside selection context
  }, 100);
  return "value";
});

// ✅ CORRECT - Use atom.get() for async access
effect(({ read }) => {
  const config = read(config$);

  setTimeout(async () => {
    const data = myAtom$.get(); // Direct access, not tracked
    console.log(data);
  }, 100);
});
```

## Error Handling: safe() Not try/catch

**CRITICAL**: Never use try/catch with `read()` - it breaks Suspense!

```typescript
// ❌ WRONG - Catches Promise (breaks Suspense)
derived(({ read }) => {
  try {
    return read(asyncAtom$);
  } catch (e) {
    return null; // Catches loading Promise!
  }
});

// ✅ CORRECT - Use safe()
derived(({ read, safe }) => {
  const [err, value] = safe(() => read(asyncAtom$));
  if (err) return { error: err.message };
  return { value };
});
```

See [error-handling.md](error-handling.md) for more details.

## Naming Conventions

```typescript
// Atoms: $ suffix
const count$ = atom(0);
const user$ = atom<User | null>(null);

// Modules: no suffix, camelCase
const authModule = define(() => ...);
const articleModule = define(() => ...);

// Actions: verb-led
navigateTo, invalidate, refresh, fetchUser, logout
```
