# Rules & Best Practices

## Service vs Store Pattern (CRITICAL)

**All state and logic MUST use `define()`. Services are stateless, Stores contain atoms.**

| Type        | Purpose              | Variable Name | File Name         | Contains                |
| ----------- | -------------------- | ------------- | ----------------- | ----------------------- |
| **Service** | Stateless logic, I/O | `authService` | `auth.service.ts` | Pure functions only     |
| **Store**   | Reactive state       | `authStore`   | `auth.store.ts`   | Atoms, derived, effects |

### Service Pattern

```typescript
// services/auth/auth.service.ts
export const authService = define(
  (): AuthService => ({
    checkSupport: async () => {
      /* WebAuthn API calls */
    },
    register: async (opts) => {
      /* credential creation */
    },
    authenticate: async (opts) => {
      /* credential assertion */
    },
  })
);
```

### Store Pattern

```typescript
// stores/auth.store.ts
import { authService } from "@/services/auth/auth.service";

export const authStore = define(() => {
  const auth = authService(); // Inject service via module invocation

  const user$ = atom<User | null>(null);
  const isAuthenticated$ = derived(({ read }) => read(user$) !== null);

  return {
    ...readonly({ user$, isAuthenticated$ }),
    login: async () => {
      const result = await auth.authenticate({});
      if (result.success) user$.set(result.user);
    },
  };
});
```

### FORBIDDEN: Factory Pattern

```typescript
// ❌ FORBIDDEN - Factory function pattern
// services/auth/index.ts
let instance: AuthService | null = null;
export function getAuthService(): AuthService {
  if (!instance) instance = createAuthService();
  return instance;
}

// ❌ FORBIDDEN - Importing factories in stores
import { getAuthService } from "@/services/auth";
const authStore = define(() => {
  const auth = getAuthService(); // WRONG! Factory pattern
});

// ✅ REQUIRED - Service as define() module
import { authService } from "@/services/auth/auth.service";
const authStore = define(() => {
  const auth = authService(); // Correct! Module invocation
});
```

**Detection Pattern for AI:**

- `get*Service()`, `create*Service()`, `*Factory()` → STOP, refactor to `define()`
- `import { get* }` for services → WRONG pattern
- Services should be imported as `*Service` and invoked with `()`

**Why this matters:**

| Factory Pattern (`getService()`) | Module Pattern (`define()`)    |
| -------------------------------- | ------------------------------ |
| Not mockable for tests           | `serviceModule.override(mock)` |
| Hidden dependencies              | Explicit module dependencies   |
| No lazy initialization control   | Lazy singleton by default      |
| Breaks atomirx DI system         | Uses atomirx DI system         |

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
const load = useAction(
  async () => {
    const val1 = atom1$.get();
    const val2 = await atom2$.get(); // await if contains Promise
    return val1 + val2;
  },
  { deps: [atom1$, atom2$], lazy: false }
);
// load() to call, load.loading, load.result, load.error for state

// ❌ DON'T: useSelector values in deps
const { val1, val2 } = useSelector(({ read }) => ({
  val1: read(atom1$),
  val2: read(atom2$), // Suspends component before useAction
}));
const load = useAction(async () => val1 + val2, {
  deps: [val1, val2],
  lazy: false,
});
```

**Why:** Using `useSelector` causes unnecessary Suspense, extra subscriptions, and stale closure risks.

## define() Isolation Rule (CRITICAL)

**MUST use `define()` to encapsulate all state, logic, and mutable variables.**

Global-level classes and pure utility functions are OK, but any stateful logic or variables MUST be inside `define()`.

```typescript
// ✅ DO: Encapsulate state and logic in define()
import { define, atom, readonly } from "atomirx";

export const counterStore = define(() => {
  const storage = storageService(); // Depend on services
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

| Benefit              | Description                                    |
| -------------------- | ---------------------------------------------- |
| Testing/Mocking      | Override services/stores for unit tests        |
| Lazy initialization  | Only initializes when first accessed           |
| Dependency injection | Stores can depend on services and other stores |
| Environment-specific | Override based on platform/feature flags       |
| Encapsulation        | `readonly()` prevents external mutations       |

### Override Pattern

Use `override()` for environment-specific implementations or mocking:

```typescript
// Define interface with placeholder
const storageService = define((): StorageService => {
  throw new Error("Not implemented yet");
});

// Platform-specific implementations
const webStorageService = define(
  (): StorageService => ({
    get: (key) => localStorage.getItem(key),
    set: (key, val) => localStorage.setItem(key, val),
  })
);

const nativeStorageService = define(
  (): StorageService => ({
    get: (key) => AsyncStorage.getItem(key),
    set: (key, val) => AsyncStorage.setItem(key, val),
  })
);

// Override based on environment
if (isWeb) {
  storageService.override(webStorageService);
} else {
  storageService.override(nativeStorageService);
}

// In tests: mock the service
storageService.override(() => ({
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

## Single Effect, Single Workflow (CRITICAL)

**Each effect handles ONE workflow. Split multiple workflows into separate effects.**

```typescript
// ❌ WRONG - Multiple workflows in one effect
effect(({ read }) => {
  const id = read(currentId$);
  const filter = read(filter$);

  // Workflow 1: fetch entity
  if (id && !cache[id]) {
    fetchEntity(id).then((e) => cache$.set((c) => ({ ...c, [id]: e })));
  }

  // Workflow 2: save filter to localStorage
  localStorage.setItem("filter", filter);

  // Workflow 3: analytics
  trackPageView(id);
});

// ✅ CORRECT - Separate effects for each workflow
effect(({ read }) => {
  const id = read(currentId$);
  const cache = read(cache$);
  if (id && !cache[id]) {
    fetchEntity(id).then((e) => cache$.set((c) => ({ ...c, [id]: e })));
  }
});

effect(({ read }) => {
  const filter = read(filter$);
  localStorage.setItem("filter", filter);
});

effect(({ read }) => {
  const id = read(currentId$);
  if (id) trackPageView(id);
});
```

**Why single workflow per effect:**

| Multiple Workflows            | Single Workflow               |
| ----------------------------- | ----------------------------- |
| Hard to trace data flow       | Clear cause → effect          |
| Side effects trigger together | Independent triggers          |
| Difficult to test             | Easy to test in isolation     |
| Hard to disable one workflow  | Can comment out single effect |

## MUST Define meta.key for Debugging (CRITICAL)

**All atoms, derived, and effects MUST define `meta.key` for debugging and maintenance.**

```typescript
// ✅ CORRECT - meta.key defined for all reactive primitives
const authStore = define(() => {
  // Atoms
  const user$ = atom<User | null>(null, {
    meta: { key: "auth.user" },
  });

  const isLoading$ = atom(false, {
    meta: { key: "auth.isLoading" },
  });

  // Derived
  const isAuthenticated$ = derived(({ read }) => read(user$) !== null, {
    meta: { key: "auth.isAuthenticated" },
  });

  // Effects
  effect(
    ({ read }) => {
      const user = read(user$);
      if (user) analytics.identify(user.id);
    },
    { meta: { key: "auth.identifyUser" } }
  );

  return { ... };
});

// ❌ WRONG - No meta.key defined
const user$ = atom<User | null>(null);  // Hard to debug!
const isAuthenticated$ = derived(({ read }) => read(user$) !== null);  // Which derived?
effect(({ read }) => { ... });  // Which effect fired?
```

**Key naming convention:**

| Pattern             | Example                              | Use Case                    |
| ------------------- | ------------------------------------ | --------------------------- |
| `store.atomName`    | `auth.user`, `todos.items`           | Standard atoms              |
| `store.derivedName` | `auth.isAuthenticated`               | Derived values              |
| `store.effectName`  | `auth.identifyUser`, `sync.autoSave` | Effects (describe workflow) |

**Why keys are mandatory:**

| Without Keys              | With Keys                    |
| ------------------------- | ---------------------------- |
| "Some atom changed"       | "auth.user changed"          |
| "Effect fired"            | "sync.autoSave effect fired" |
| Hard to trace in DevTools | Clear identification         |
| Debugging is guesswork    | Precise debugging            |

## Atom Storage Rules

**Never store atoms in component scope** - causes memory leaks:

```typescript
// ❌ BAD - atoms in component scope
function Component() {
  const data$ = useRef(atom(0)).current; // Memory leak!
}

// ✅ GOOD - define() store (PREFERRED)
const dataStore = define(() => {
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

**All atom mutations must be co-located in the store that owns the atom.**

```typescript
// ✅ CORRECT - Mutations inside store
const counterStore = define(() => {
  const count$ = atom(0);

  return {
    ...readonly({ count$ }), // Expose read-only
    // All mutations co-located here
    increment: () => count$.set((prev) => prev + 1),
    decrement: () => count$.set((prev) => prev - 1),
    reset: () => count$.reset(),
  };
});

// ❌ WRONG - Mutations scattered outside store
const { count$ } = counterStore();
count$.set(10); // Don't do this! Mutations should be in store
```

**Why this matters:**

| Benefit           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| **Traceability**  | To find what mutates an atom, just look at its store |
| **Encapsulation** | Store controls all valid state transitions           |
| **Testing**       | Mock the store, not individual atoms                 |
| **Refactoring**   | Change atom internals without hunting for usages     |

**Finding mutation logic:**

```typescript
// When you see this usage:
const { count$ } = counterStore();
// OR
counterStore().count$;

// → All mutations are in counterStore, search there
// → Search: `define(() =>` to find the store definition
// → All .set() calls for count$ will be inside that store
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

// Services: camelCase, Service suffix (NO atoms)
const authService = define((): AuthService => ...);
const cryptoService = define((): CryptoService => ...);

// Stores: camelCase, Store suffix (HAS atoms)
const authStore = define(() => ...);
const todosStore = define(() => ...);

// Actions: verb-led
navigateTo, invalidate, refresh, fetchUser, logout
```

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
