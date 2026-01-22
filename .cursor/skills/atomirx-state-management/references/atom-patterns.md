# Atom Patterns - MutableAtom Features

The `atom()` function creates a mutable state container with several advanced features.

## Overview

```typescript
const count$ = atom(0);
const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
const data$ = atom(() => expensiveInit());
```

## Core API

| Method       | Signature                    | Description                        |
| ------------ | ---------------------------- | ---------------------------------- |
| `get()`      | `() => T`                    | Get current value                  |
| `set()`      | `(value \| reducer) => void` | Update value                       |
| `reset()`    | `() => void`                 | Reset to initial value             |
| `dirty()`    | `() => boolean`              | Check if modified since init/reset |
| `on()`       | `(listener) => unsub`        | Subscribe to changes               |
| `_dispose()` | `() => void`                 | Internal: cleanup (used by pool)   |

## Lazy Initialization

Pass a function to defer computation until atom creation:

```typescript
// Computed at creation time
const config$ = atom(() => parseExpensiveConfig());

// reset() re-runs the initializer for fresh values
const timestamp$ = atom(() => Date.now());
timestamp$.reset(); // Gets new timestamp

// To store a function as value, wrap it:
const callback$ = atom(() => () => console.log("hello"));
```

## Dirty Tracking

Track if value has changed since initialization or last reset:

```typescript
const form$ = atom({ name: "", email: "" }, { meta: { key: "form" } });

form$.dirty(); // false - just initialized

form$.set({ name: "John", email: "" });
form$.dirty(); // true - value changed

form$.reset();
form$.dirty(); // false - reset clears dirty flag
```

### Use Cases

- Enable/disable save buttons
- Warn on unsaved changes
- Track form modifications

```tsx
function FormButtons() {
  const isDirty = useSelector(() => form$.dirty());

  return (
    <div>
      <button disabled={!isDirty}>Save</button>
      <button onClick={() => form$.reset()}>Reset</button>
    </div>
  );
}
```

## AtomContext - Signal & Cleanup

When using lazy initialization, the initializer receives a context with abort signal and cleanup registration:

```typescript
interface AtomContext {
  /** AbortSignal aborted when atom value changes via set() or reset() */
  signal: AbortSignal;

  /** Register cleanup function that runs on value change or reset */
  onCleanup(cleanup: VoidFunction): void;
}
```

### Abort Signal

Cancel pending operations when atom value changes:

```typescript
const data$ = atom((context) => {
  const controller = new AbortController();

  // Abort our controller when atom changes
  context.signal.addEventListener("abort", () => controller.abort());

  return fetch("/api/data", { signal: controller.signal });
});

// When set() is called, previous fetch is aborted
data$.set(fetch("/api/data/new"));
```

### Cleanup Registration

Run cleanup when value changes:

```typescript
const subscription$ = atom((context) => {
  const sub = websocket.subscribe("channel");

  // Cleanup runs before value changes
  context.onCleanup(() => sub.unsubscribe());

  return sub;
});

// When reset() or set() is called:
// 1. Previous subscription is unsubscribed
// 2. New subscription is created
subscription$.reset();
```

### Combined Pattern

```typescript
const realtime$ = atom((context) => {
  const socket = new WebSocket("wss://api.example.com");

  // Cleanup socket on atom change
  context.onCleanup(() => socket.close());

  // Also abort any fetch using the signal
  fetchInitialData({ signal: context.signal });

  return socket;
});
```

## Equality Options

Control when subscribers are notified:

```typescript
// Default: strict equality (Object.is)
const count$ = atom(0);

// Shallow equality for objects
const user$ = atom({ name: "", email: "" }, { equals: "shallow" });
user$.set((prev) => ({ ...prev })); // No notification (shallow equal)

// Deep equality for nested objects
const config$ = atom({ nested: { value: 1 } }, { equals: "deep" });

// Custom equality function
const data$ = atom(
  { id: 1, timestamp: Date.now() },
  { equals: (a, b) => a.id === b.id } // Only compare by id
);
```

### Equality Shorthands

| Shorthand    | Description                                    |
| ------------ | ---------------------------------------------- |
| `"strict"`   | Object.is (default, fastest)                   |
| `"shallow"`  | Compare object keys/array items with Object.is |
| `"shallow2"` | 2 levels deep                                  |
| `"shallow3"` | 3 levels deep                                  |
| `"deep"`     | Full recursive comparison (slowest)            |

## readonly() Utility (IMPORTANT)

**MUST** expose atoms as read-only to prevent external mutations:

```typescript
const myModule = define(() => {
  const count$ = atom(0);

  return {
    // Expose as read-only - consumers can't call set() or reset()
    count$: readonly(count$),
    // Mutations only through explicit actions
    increment: () => count$.set((prev) => prev + 1),
    decrement: () => count$.set((prev) => prev - 1),
  };
});

// Usage:
const { count$, increment } = myModule();
count$.get(); // ✅ OK
count$.on(console.log); // ✅ OK
count$.set(5); // ❌ TypeScript error
increment(); // ✅ Use action instead
```

### Multiple atoms at once

```typescript
return {
  ...readonly({ count$, name$ }),
  setName: (name: string) => name$.set(name),
};
```

## Async Values

Atom stores values as-is, including Promises:

```typescript
// Store Promise directly
const posts$ = atom(fetchPosts());
posts$.get(); // Promise<Post[]>

// Refetch
posts$.set(fetchPosts()); // Store new Promise

// With lazy init - reset() re-runs initializer
const lazyPosts$ = atom(() => fetchPosts());
lazyPosts$.reset(); // Refetches!
```

**Note:** MutableAtom does not unwrap Promises. Use `derived()` with `read()` for automatic Promise handling and Suspense integration.

## Plugin System (.use())

Atoms implement `Pipeable` for extension:

```typescript
const count$ = atom(0)
  .use((source) => ({
    ...source,
    double: () => source.get() * 2,
  }))
  .use((source) => ({
    ...source,
    triple: () => source.get() * 3,
  }));

count$.double(); // 0
count$.triple(); // 0
```

## Common Patterns

### Form State

```typescript
interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

const form$ = atom<FormState>(
  {
    values: {},
    errors: {},
    touched: {},
  },
  { meta: { key: "contactForm" }, equals: "shallow" }
);

// Update single field
const setField = (name: string, value: string) => {
  form$.set((prev) => ({
    ...prev,
    values: { ...prev.values, [name]: value },
    touched: { ...prev.touched, [name]: true },
  }));
};

// Check if form has unsaved changes
const hasUnsavedChanges = () => form$.dirty();
```

### Cache with Expiration

```typescript
const cache$ = atom((context) => {
  const data = new Map<string, unknown>();

  // Clear cache after 5 minutes
  const timeout = setTimeout(() => data.clear(), 300_000);
  context.onCleanup(() => clearTimeout(timeout));

  return data;
});
```

### WebSocket Connection

```typescript
const ws$ = atom((context) => {
  const socket = new WebSocket("wss://api.example.com");

  socket.onopen = () => console.log("Connected");
  socket.onerror = (e) => console.error("WS Error", e);

  context.onCleanup(() => {
    socket.close();
    console.log("Disconnected");
  });

  return socket;
});

// Reconnect
ws$.reset(); // Closes old, creates new
```

### Interval-based Updates

```typescript
const clock$ = atom((context) => {
  let time = new Date();

  const interval = setInterval(() => {
    time = new Date();
    // Note: This pattern requires external notification
    // Consider using effect() for interval-based updates
  }, 1000);

  context.onCleanup(() => clearInterval(interval));

  return time;
});
```

## When to Use MutableAtom vs Derived

| Use Case                  | Use MutableAtom | Use Derived |
| ------------------------- | --------------- | ----------- |
| User input/form state     | ✅              | ❌          |
| API response storage      | ✅              | ❌          |
| Computed from other atoms | ❌              | ✅          |
| Transformed async data    | ❌              | ✅          |
| Cached calculations       | ❌              | ✅          |
