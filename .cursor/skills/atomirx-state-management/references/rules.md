# Rules & Best Practices

## useSelector Grouping Rule (CRITICAL)

**MUST group multiple atom reads into a single `useSelector` call.**

```tsx
// ✅ DO: Group multiple reads into single useSelector
const { count, user, settings } = useSelector(({ read }) => ({
  count: read(count$),
  user: read(user$),
  settings: read(settings$),
}));

// ❌ DON'T: Multiple separate useSelector calls
const count = useSelector(count$);
const user = useSelector(user$);
const settings = useSelector(settings$);
```

**Why this matters:**

| Issue             | Multiple Calls            | Single Grouped Call      |
| ----------------- | ------------------------- | ------------------------ |
| Subscriptions     | N subscriptions           | 1 subscription           |
| Re-render checks  | N checks per state change | 1 check per state change |
| Custom equality   | Must add to each call     | Single equality fn       |
| Code organization | Values scattered          | Related values together  |

**When single `useSelector(atom$)` is OK:**

- Only one atom needed in the component
- The atom is the only reactive state source

**When to group (MUST):**

- Reading 2+ atoms → always group
- Deriving values from multiple atoms → group and compute together

## useAction with Atom Dependencies

When using `useAction` with `lazy: false` for auto re-dispatch on atom changes, pass atoms to `deps` and use `.get()` inside.

```tsx
// ✅ DO: Atoms in deps, .get() inside action
const [load] = useAction(
  async () => {
    const val1 = atom1$.get();
    const val2 = await atom2$.get(); // await if contains Promise
    return val1 + val2;
  },
  { deps: [atom1$, atom2$], lazy: false }
);

// ❌ DON'T: useSelector values in deps
const { val1, val2 } = useSelector(({ read }) => ({
  val1: read(atom1$),
  val2: read(atom2$), // Suspends component before useAction
}));
const [load] = useAction(async () => val1 + val2, {
  deps: [val1, val2],
  lazy: false,
});
```

**Why:** Using `useSelector` causes unnecessary Suspense, extra subscriptions, and stale closure risks.

## define() Module Isolation Rule (CRITICAL)

**MUST use `define()` to encapsulate all state, logic, and mutable variables.**

Global-level classes and pure utility functions are OK, but any stateful logic or variables MUST be inside `define()`.

```typescript
// ✅ DO: Encapsulate state and logic in define()
import { define, atom, readonly } from "atomirx";

export const counterModule = define(() => {
  const storage = storageModule(); // Depend on other modules
  const count$ = atom(0);

  const increment = () => count$.set((x) => x + 1);
  const save = () => storage.set("count", count$.get());

  return {
    ...readonly({ count$ }), // Export read-only atom, prevent external mutations
    increment,
    save,
  };
});

// ❌ DON'T: Global variables outside define()
const count$ = atom(0); // Bad: not testable, not mockable
const increment = () => count$.set((x) => x + 1);
```

**Why define() is mandatory:**

| Benefit              | Description                                 |
| -------------------- | ------------------------------------------- |
| Testing/Mocking      | Override modules for unit tests             |
| Lazy initialization  | Module only initializes when first accessed |
| Dependency injection | Modules can depend on other modules         |
| Environment-specific | Override based on platform/feature flags    |
| Encapsulation        | `readonly()` prevents external mutations    |

### Module Override Pattern

Use `override()` for environment-specific implementations or mocking:

```typescript
// Define interface with placeholder
const storageModule = define((): StorageModule => {
  throw new Error("Not implemented yet");
});

// Platform-specific implementations
const webStorageModule = define(
  (): StorageModule => ({
    get: (key) => localStorage.getItem(key),
    set: (key, val) => localStorage.setItem(key, val),
  })
);

const nativeStorageModule = define(
  (): StorageModule => ({
    get: (key) => AsyncStorage.getItem(key),
    set: (key, val) => AsyncStorage.setItem(key, val),
  })
);

// Override based on environment
if (isWeb) {
  storageModule.override(webStorageModule);
} else {
  storageModule.override(nativeStorageModule);
}

// In tests: mock the module
storageModule.override(() => ({
  get: jest.fn(),
  set: jest.fn(),
}));
```

## batch() for Multiple Updates

**MUST wrap multiple atom updates in `batch()` for single notification.**

```typescript
// ✅ DO: Batch multiple updates
batch(() => {
  user$.set(newUser);
  settings$.set(newSettings);
  lastUpdated$.set(Date.now());
}); // Subscribers notified ONCE after all updates

// ❌ DON'T: Separate updates
user$.set(newUser); // Notification 1
settings$.set(newSettings); // Notification 2
lastUpdated$.set(Date.now()); // Notification 3
```

**Why batch() matters:**

| Without batch()          | With batch()          |
| ------------------------ | --------------------- |
| N notifications          | 1 notification        |
| N re-render checks       | 1 re-render check     |
| Intermediate states seen | Only final state seen |
| Potential UI flicker     | Clean single update   |

**When to use batch():**

- Updating 2+ atoms together
- Resetting multiple atoms
- Any action that modifies multiple pieces of state

## Atom Storage Rules

**Never store atoms in component scope** - causes memory leaks:

```typescript
// ❌ BAD - atoms in component scope
function Component() {
  const data$ = useRef(atom(0)).current; // Memory leak!
}

// ✅ GOOD - define() module (PREFERRED)
const dataModule = define(() => {
  const data$ = atom(0);
  return {
    ...readonly({ data$ }),
    update: (v) => data$.set(v),
  };
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
