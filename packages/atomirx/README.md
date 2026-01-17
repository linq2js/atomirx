# atomirx

A lightweight, reactive state management library for TypeScript/JavaScript with first-class React integration.

## Features

- **Simple API** - Just `atom`, `derived`, and `effect` for reactive state
- **Async-first** - Built-in support for Promises with loading/error states
- **Suspense-style** - Getters throw promises when loading, enabling React Suspense integration
- **Fine-grained reactivity** - Conditional dependency tracking for optimal performance
- **React hooks** - `useSelector`, `useAction`, `useStable`, and `rx` for seamless integration
- **Tiny bundle** - Zero dependencies for core, optional React bindings
- **TypeScript-first** - Full type inference and strict typing

## Installation

```bash
npm install atomirx
# or
pnpm add atomirx
# or
yarn add atomirx
```

## Quick Start

```typescript
import { atom, derived, effect } from "atomirx";

// Create a mutable atom
const count = atom(0);

// Create a derived (computed) value
const doubled = derived(count, (get) => get() * 2);

// Subscribe to changes
count.on(() => console.log("Count:", count.value));
doubled.on(() => console.log("Doubled:", doubled.value));

// Update the atom
count.set(5);        // Count: 5, Doubled: 10
count.set(n => n + 1); // Count: 6, Doubled: 12

// Create side effects
const dispose = effect(count, (get) => {
  localStorage.setItem("count", String(get()));
});

// Clean up when done
dispose();
```

## Core Concepts

### Atoms

Atoms are mutable reactive containers that hold a single value.

```typescript
import { atom } from "atomirx";

// Synchronous atom
const name = atom("John");
console.log(name.value); // "John"
name.set("Jane");

// Async atom - starts in loading state
const user = atom(fetchUser(id));
console.log(user.loading); // true
await user;
console.log(user.value); // { name: "John", ... }

// Lazy initializer - computation deferred until first access
const expensive = atom(() => computeExpensiveValue());

// With fallback for loading/error states
const data = atom(fetchData(), { fallback: [] });
console.log(data.value);   // [] during loading
console.log(data.stale()); // true during loading
```

#### Atom API

| Property/Method | Description |
|----------------|-------------|
| `value` | Current value (undefined during loading without fallback) |
| `loading` | `true` if waiting for a Promise to resolve |
| `error` | Error from rejected Promise (undefined if no error) |
| `stale()` | `true` if using fallback/previous value during loading/error |
| `dirty()` | `true` if value has been modified since creation |
| `set(value)` | Update with value, Promise, or reducer function |
| `reset()` | Reset to initial state |
| `on(listener)` | Subscribe to changes, returns unsubscribe function |
| `then()` | Makes atom awaitable: `await atom` |

### Derived

Derived atoms are read-only computed values that automatically update when source atoms change.

```typescript
import { atom, derived } from "atomirx";

// Single source
const count = atom(5);
const doubled = derived(count, (get) => get() * 2);
console.log(doubled.value); // 10

// Multiple sources
const firstName = atom("John");
const lastName = atom("Doe");
const fullName = derived(
  [firstName, lastName],
  (getFirst, getLast) => `${getFirst()} ${getLast()}`
);
console.log(fullName.value); // "John Doe"

// Conditional dependencies - only subscribes to accessed atoms
const showDetails = atom(false);
const summary = atom("Brief");
const details = atom("Detailed");

const content = derived(
  [showDetails, summary, details],
  (getShow, getSummary, getDetails) =>
    getShow() ? getDetails() : getSummary()
);
// When showDetails is false, changes to details don't trigger recomputation
```

#### Suspense-Style Getters

Getters in derived atoms behave like React Suspense:
- **Loading atom**: getter throws the Promise
- **Error atom**: getter throws the error
- **Resolved atom**: getter returns the value

```typescript
const asyncUser = atom(fetchUser());
const userName = derived(asyncUser, (get) => get().name);

// userName.loading is true while asyncUser is loading
// userName.error is set if asyncUser has an error
```

### Effect

Effects run side effects when source atoms change.

```typescript
import { atom, effect } from "atomirx";

// Basic effect
const count = atom(0);
const dispose = effect(count, (get) => {
  console.log("Count changed:", get());
});

// With cleanup
const interval = atom(1000);
const dispose = effect(interval, (get) => {
  const id = setInterval(() => console.log("tick"), get());
  return () => clearInterval(id); // Cleanup before next run or dispose
});

// Multiple sources
const dispose = effect([userAtom, settingsAtom], (getUser, getSettings) => {
  analytics.identify(getUser().id, getSettings());
});
```

### Batch

Batch multiple updates into a single notification cycle.

```typescript
import { atom, batch } from "atomirx";

const firstName = atom("John");
const lastName = atom("Doe");

// Without batch: 2 notifications
firstName.set("Jane");
lastName.set("Smith");

// With batch: 1 notification with final state
batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
});
```

### Emitter

A pub/sub event system for custom events.

```typescript
import { emitter } from "atomirx";

const events = emitter<string>();

// Subscribe
const unsubscribe = events.on((message) => {
  console.log("Received:", message);
});

// Emit
events.emit("Hello"); // Logs: "Received: Hello"

// Unsubscribe
unsubscribe();

// Settle pattern (Promise-like - late subscribers still receive value)
const ready = emitter<Config>();
ready.settle(config); // All current and future subscribers receive config
```

### Define

Create swappable lazy singletons for dependency injection.

```typescript
import { define, atom } from "atomirx";

const counterStore = define(() => {
  const count = atom(0);
  return {
    count,
    increment: () => count.set((c) => c + 1),
  };
});

// Normal usage - lazy singleton
const store = counterStore();
store.increment();

// Override for testing
counterStore.override(() => ({
  count: atom(999),
  increment: vi.fn(),
}));

// Reset to original
counterStore.reset();
```

## Async Utilities

Utilities for working with multiple async atoms in derived/selector contexts.

```typescript
import { atom, derived, all, any, race, settled } from "atomirx";

const userAtom = atom(fetchUser());
const postsAtom = atom(fetchPosts());

// all() - Wait for all to resolve (like Promise.all)
const dashboard = derived([userAtom, postsAtom], (getUser, getPosts) => {
  const [user, posts] = all([getUser, getPosts]);
  return { user, posts };
});

// any() - First resolved wins (like Promise.any)
const data = derived([primaryAtom, fallbackAtom], (getPrimary, getFallback) => {
  const [winner, value] = any({ primary: getPrimary, fallback: getFallback });
  return value;
});

// race() - First settled wins (like Promise.race)
const fastest = derived([cacheAtom, apiAtom], (getCache, getApi) => {
  const [source, value] = race({ cache: getCache, api: getApi });
  return { source, value };
});

// settled() - Get all results regardless of success/failure (like Promise.allSettled)
const results = derived([userAtom, postsAtom], (getUser, getPosts) => {
  const { user, posts } = settled({ user: getUser, posts: getPosts });
  return {
    user: user.status === "resolved" ? user.value : null,
    posts: posts.status === "resolved" ? posts.value : [],
  };
});
```

## React Integration

### useSelector

Subscribe to atom values with automatic re-render.

```tsx
import { useSelector } from "atomirx/react";
import { atom } from "atomirx";

const count = atom(5);

function Counter() {
  // Simple usage
  const value = useSelector(count);
  
  // With selector
  const doubled = useSelector(count, (get) => get() * 2);
  
  // Multiple atoms
  const fullName = useSelector(
    [firstName, lastName],
    (getFirst, getLast) => `${getFirst()} ${getLast()}`
  );
  
  return <div>{doubled}</div>;
}
```

#### Async Atoms with Suspense

For async atoms, wrap with `<Suspense>` and `<ErrorBoundary>`:

```tsx
const userAtom = atom(fetchUser());

function UserProfile() {
  const user = useSelector(userAtom); // Suspends until resolved
  return <div>{user.name}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<div>Error!</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <UserProfile />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### rx

Reactive inline component for fine-grained updates.

```tsx
import { rx } from "atomirx/react";

function Page() {
  return (
    <div>
      {/* Only this part re-renders when count changes */}
      Count: {rx(count)}
      
      {/* With selector */}
      Doubled: {rx(count, (get) => get() * 2)}
      
      {/* Multiple atoms */}
      {rx([firstName, lastName], (f, l) => `${f()} ${l()}`)}
    </div>
  );
}
```

### useAction

Handle async actions with loading/error states and abort support.

```tsx
import { useAction } from "atomirx/react";

function UserProfile({ userId }) {
  const fetchUser = useAction(async ({ signal }) => {
    const response = await fetch(`/api/users/${userId}`, { signal });
    return response.json();
  });

  return (
    <div>
      {fetchUser.status === "idle" && (
        <button onClick={fetchUser}>Load User</button>
      )}
      {fetchUser.status === "loading" && <Spinner />}
      {fetchUser.status === "success" && <div>{fetchUser.result.name}</div>}
      {fetchUser.status === "error" && <div>Error: {String(fetchUser.error)}</div>}
    </div>
  );
}

// Eager execution on mount
const fetchUser = useAction(
  async ({ signal }) => fetchUserApi(userId, { signal }),
  { lazy: false, deps: [userId] }
);

// With atom deps - re-executes when atom changes
const fetchUser = useAction(
  async ({ signal }) => fetchUserApi(userIdAtom.value, { signal }),
  { lazy: false, deps: [userIdAtom] }
);
```

#### useAction API

| Property/Method | Description |
|----------------|-------------|
| `status` | `"idle"` \| `"loading"` \| `"success"` \| `"error"` |
| `result` | Result value when successful |
| `error` | Error when failed |
| `abort()` | Cancel current request |
| `reset()` | Reset to idle state |

### useStable

Stabilize object/array/callback references to prevent unnecessary re-renders.

```tsx
import { useStable } from "atomirx/react";

function MyComponent({ userId }) {
  const stable = useStable({
    // Object - stable if shallow equal
    config: { theme: "dark", userId },
    // Array - stable if items are reference-equal
    items: [1, 2, 3],
    // Function - reference never changes
    onClick: () => console.log("clicked", userId),
  });

  // Safe to use in deps
  useEffect(() => {
    console.log(stable.config);
  }, [stable.config]);

  return <MemoizedChild config={stable.config} onClick={stable.onClick} />;
}
```

## API Reference

### Core

| Export | Description |
|--------|-------------|
| `atom(value, options?)` | Create a mutable atom |
| `derived(source, fn, options?)` | Create a derived (computed) atom |
| `effect(source, fn)` | Create a side effect |
| `batch(fn)` | Batch multiple updates |
| `emitter(initialListeners?)` | Create an event emitter |
| `define(factory, options?)` | Create a swappable lazy singleton |
| `select(source, fn)` | Low-level selector utility |
| `isAtom(value)` | Type guard for atoms |

### Async Utilities

| Export | Description |
|--------|-------------|
| `all(getters)` | Wait for all getters (like Promise.all) |
| `any(getters)` | First resolved getter (like Promise.any) |
| `race(getters)` | First settled getter (like Promise.race) |
| `settled(getters)` | All results regardless of success/failure |
| `getterStatus(getter)` | Get status of a single getter |

### React (`atomirx/react`)

| Export | Description |
|--------|-------------|
| `useSelector(source, selector?, equals?)` | Subscribe to atom values |
| `useAction(fn, options?)` | Handle async actions |
| `useStable(input, equals?)` | Stabilize references |
| `rx(source, selector?, equals?)` | Reactive inline component |

## TypeScript

atomirx is written in TypeScript and provides full type inference:

```typescript
import { atom, derived } from "atomirx";

// Types are inferred
const count = atom(0); // MutableAtom<number>
const doubled = derived(count, (get) => get() * 2); // Atom<number>

// Explicit typing
const user = atom<User | null>(null);

// Async atoms
const data = atom(fetchData()); // MutableAtom<Data>
```

## License

MIT
