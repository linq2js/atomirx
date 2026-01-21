<div align="center">

# atomirx

**Opinionated, Batteries-Included Reactive State Management for React**

[![npm version](https://img.shields.io/npm/v/atomirx.svg)](https://www.npmjs.com/package/atomirx)
[![npm downloads](https://img.shields.io/npm/dm/atomirx.svg)](https://www.npmjs.com/package/atomirx)
[![bundle size](https://img.shields.io/bundlephobia/minzip/atomirx)](https://bundlephobia.com/package/atomirx)
[![license](https://img.shields.io/npm/l/atomirx.svg)](./LICENSE)

</div>

---

## Overview

atomirx is a reactive state management library that combines the simplicity of atoms with powerful async handling. Built with TypeScript-first design, it provides a complete solution for managing application state with first-class support for async operations, computed values, and React integration.

### Key Features

- **Atoms** - Simple, reactive state containers
- **Derived Atoms** - Computed values with automatic dependency tracking
- **Effects** - Side effects that react to state changes
- **Pools** - Parameterized atom families with automatic garbage collection
- **Async-First** - Built-in Suspense support for async operations
- **React Integration** - Hooks and utilities for seamless React usage
- **TypeScript** - Full type safety with excellent inference
- **Tiny** - Zero dependencies (except lodash for deep equality)

## Installation

```bash
npm install atomirx
# or
pnpm add atomirx
# or
yarn add atomirx
```

## Quick Start

```tsx
import { atom, derived, effect } from 'atomirx';
import { useSelector, rx } from 'atomirx/react';

// Create a mutable atom
const count$ = atom(0);

// Create a derived atom (computed value)
const doubled$ = derived(({ read }) => read(count$) * 2);

// Create a side effect
effect(({ read }) => {
  console.log('Count changed:', read(count$));
});

// Use in React
function Counter() {
  const count = useSelector(count$);
  const doubled = useSelector(doubled$);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={() => count$.set(c => c + 1)}>Increment</button>
    </div>
  );
}
```

## Table of Contents

- [Core Concepts](#core-concepts)
  - [Atoms](#atoms)
  - [Derived Atoms](#derived-atoms)
  - [Effects](#effects)
  - [Pools](#pools)
  - [Batching](#batching)
  - [Modules (define)](#modules-define)
- [React Integration](#react-integration)
  - [useSelector](#useselector)
  - [rx](#rx)
  - [useAction](#useaction)
  - [useStable](#usestable)
- [Async Operations](#async-operations)
  - [Suspense Support](#suspense-support)
  - [Async Utilities](#async-utilities)
  - [Promise State Tracking](#promise-state-tracking)
- [Advanced Topics](#advanced-topics)
  - [Select Context](#select-context)
  - [Equality Functions](#equality-functions)
  - [Error Handling](#error-handling)
  - [DevTools & Hooks](#devtools--hooks)
- [API Reference](#api-reference)
- [Documentation](#documentation)

---

## Core Concepts

### Atoms

Atoms are the fundamental building blocks - simple reactive containers that hold a single value.

```ts
import { atom } from 'atomirx';

// Create an atom with initial value
const count$ = atom(0);

// Read the current value
count$.get(); // 0

// Update the value
count$.set(5);
count$.set(prev => prev + 1); // Reducer pattern

// Reset to initial value
count$.reset();

// Subscribe to changes
const unsubscribe = count$.on(() => {
  console.log('Count changed:', count$.get());
});
```

#### Lazy Initialization

```ts
// Value computed at creation time
const timestamp$ = atom(() => Date.now());

// Reset re-runs the initializer
timestamp$.reset(); // Gets new timestamp
```

#### Storing Functions

```ts
// To store a function as a value, wrap it
const callback$ = atom(() => () => console.log('hello'));
```

#### Atom with Context

```ts
const data$ = atom((context) => {
  // Access AbortSignal for cancellation
  const signal = context.signal;
  
  // Register cleanup function
  context.onCleanup(() => {
    console.log('Cleanup on value change');
  });
  
  return fetchData({ signal });
});
```

### Derived Atoms

Derived atoms compute values from other atoms with automatic dependency tracking.

```ts
import { derived } from 'atomirx';

const firstName$ = atom('John');
const lastName$ = atom('Doe');

// Simple derived value
const fullName$ = derived(({ read }) => 
  `${read(firstName$)} ${read(lastName$)}`
);

// Access the computed value (always returns Promise)
await fullName$.get(); // "John Doe"

// Access stale/cached value synchronously
fullName$.staleValue; // "John Doe" or undefined if not computed yet

// Check current state
fullName$.state(); // { status: "ready", value: "John Doe" }

// Force recomputation
fullName$.refresh();
```

#### Derived with Fallback

```ts
const posts$ = atom(fetchPosts()); // Async atom

// Without fallback - staleValue can be undefined
const postCount$ = derived(({ read }) => read(posts$).length);
postCount$.staleValue; // number | undefined

// With fallback - staleValue is guaranteed
const postCountSafe$ = derived(
  ({ read }) => read(posts$).length,
  { fallback: 0 }
);
postCountSafe$.staleValue; // number (0 during loading)
```

### Effects

Effects run side effects in response to atom changes.

```ts
import { effect } from 'atomirx';

// Basic effect
const dispose = effect(({ read }) => {
  const count = read(count$);
  localStorage.setItem('count', String(count));
});

// Stop the effect
dispose();
```

#### Effect with Cleanup

```ts
effect(({ read, onCleanup }) => {
  const interval = read(interval$);
  const id = setInterval(() => console.log('tick'), interval);
  
  // Cleanup runs before next execution or on dispose
  onCleanup(() => clearInterval(id));
});
```

### Pools

Pools are parameterized collections of atoms with automatic garbage collection.

```ts
import { pool } from 'atomirx';

// Create a pool with GC after 60 seconds of inactivity
const userPool = pool(
  (id: string) => fetchUser(id),
  { gcTime: 60_000 }
);

// Get/set values directly
const user = userPool.get('user-1');
userPool.set('user-1', { name: 'John', email: 'john@example.com' });

// Check existence
userPool.has('user-1'); // true

// Remove entry
userPool.remove('user-1');

// Clear all entries
userPool.clear();

// Subscribe to changes
userPool.onChange((id, value) => console.log('Changed:', id, value));
userPool.onRemove((id, value) => console.log('Removed:', id, value));
```

#### Pool in Reactive Context

```ts
// Use from() in derived/effect/useSelector
const userPosts$ = derived(({ read, from }) => {
  const userId = read(currentUserId$);
  const user = read(from(userPool, userId)); // Creates VirtualAtom
  return user.posts;
});
```

### Batching

Batch multiple updates to prevent intermediate renders.

```ts
import { batch } from 'atomirx';

const firstName$ = atom('');
const lastName$ = atom('');

// Without batch: 2 notifications
firstName$.set('John');
lastName$.set('Doe');

// With batch: 1 notification after both updates
batch(() => {
  firstName$.set('John');
  lastName$.set('Doe');
});
```

### Modules (define)

Create swappable lazy singleton stores for better organization and testing.

```ts
import { define, atom, readonly } from 'atomirx';

const counterModule = define(() => {
  const count$ = atom(0);

  return {
    // Expose as read-only to consumers
    count$: readonly(count$),
    
    // Actions
    increment: () => count$.set(c => c + 1),
    decrement: () => count$.set(c => c - 1),
    reset: () => count$.reset(),
  };
});

// Usage
const { count$, increment } = counterModule();
increment();
```

#### Override for Testing

```ts
// In tests
beforeEach(() => {
  counterModule.override(() => ({
    count$: atom(999),
    increment: vi.fn(),
    decrement: vi.fn(),
    reset: vi.fn(),
  }));
});

afterEach(() => {
  counterModule.reset();
});
```

---

## React Integration

### useSelector

React hook for selecting values from atoms with automatic subscriptions.

```tsx
import { useSelector } from 'atomirx/react';

function Counter() {
  // Single atom
  const count = useSelector(count$);

  // Derived value with selector
  const doubled = useSelector(({ read }) => read(count$) * 2);

  // Multiple atoms
  const fullName = useSelector(({ read }) => 
    `${read(firstName$)} ${read(lastName$)}`
  );

  return <div>{count} - {doubled} - {fullName}</div>;
}
```

### rx

Inline reactive component for fine-grained updates.

```tsx
import { rx } from 'atomirx/react';

function Counter() {
  // Only the rx component re-renders when count changes
  return (
    <div>
      Count: {rx(count$)}
      Doubled: {rx(({ read }) => read(count$) * 2)}
      <button onClick={() => count$.set(c => c + 1)}>+</button>
    </div>
  );
}
```

#### rx with Loading/Error Handling

```tsx
{rx(
  ({ read }) => read(asyncAtom$),
  {
    loading: () => <Spinner />,
    error: ({ error }) => <Error message={error.message} />,
  }
)}
```

### useAction

Hook for managing async operations with state tracking.

```tsx
import { useAction } from 'atomirx/react';

function SaveButton() {
  const [save, state] = useAction(async (data: FormData) => {
    const result = await api.save(data);
    return result;
  });

  return (
    <button 
      onClick={() => save(formData)}
      disabled={state.status === 'loading'}
    >
      {state.status === 'loading' ? 'Saving...' : 'Save'}
    </button>
  );
}
```

### useStable

Hook for creating stable references to callbacks and objects.

```tsx
import { useStable } from 'atomirx/react';

function Component({ onSave }) {
  // Stable callback reference
  const handleSave = useStable.fn(() => {
    onSave(data);
  });

  // Stable object reference
  const config = useStable.obj({ timeout: 5000 });

  return <Child onSave={handleSave} config={config} />;
}
```

---

## Async Operations

### Suspense Support

atomirx uses a Suspense-style API for async atoms.

```tsx
const user$ = atom(fetchUser());

function UserProfile() {
  // Throws Promise when loading (suspends)
  // Throws error when rejected
  // Returns value when resolved
  const user = useSelector(user$);
  return <div>{user.name}</div>;
}

// Must wrap with Suspense and ErrorBoundary
function App() {
  return (
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Loading />}>
        <UserProfile />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Async Utilities

The select context provides utilities for handling multiple async atoms.

```tsx
// Wait for all atoms (like Promise.all)
const dashboard$ = derived(({ all }) => {
  const [user, posts] = all(user$, posts$);
  return { user, posts };
});

// First settled value (like Promise.race)
const fastest$ = derived(({ race }) => race(source1$, source2$));

// First success, ignore errors unless all fail (like Promise.any)
const anySuccess$ = derived(({ any }) => any(primary$, fallback$));

// All settled with status (like Promise.allSettled)
const results$ = derived(({ settled }) => {
  const results = settled(atom1$, atom2$);
  return results.map(r => 
    r.status === 'ready' ? r.value : 'failed'
  );
});
```

### Promise State Tracking

```ts
import { isPending, isFulfilled, isRejected, trackPromise } from 'atomirx';

const promise = fetchData();
const state = trackPromise(promise);

if (isPending(promise)) {
  console.log('Loading...');
}

if (isFulfilled(promise)) {
  console.log('Value:', state.value);
}

if (isRejected(promise)) {
  console.log('Error:', state.error);
}
```

---

## Advanced Topics

### Select Context

All reactive contexts (`derived`, `effect`, `useSelector`, `rx`) provide a unified select context.

```ts
interface SelectContext {
  // Read a single atom's value
  read<T>(atom: Atom<T>): Awaited<T>;
  
  // Get atom from pool
  from<P, T>(pool: Pool<P, T>, params: P): VirtualAtom<T>;
  
  // Wait for all atoms
  all<A extends Atom[]>(...atoms: A): Values<A>;
  
  // First settled (like Promise.race)
  race<A extends Atom[]>(...atoms: A): Value<A[number]>;
  
  // First success (like Promise.any)
  any<A extends Atom[]>(...atoms: A): Value<A[number]>;
  
  // All settled with status
  settled<A extends Atom[]>(...atoms: A): SettledResult<A>[];
  
  // Safe error handling (preserves Suspense)
  safe<T>(fn: () => T): [Error, undefined] | [undefined, T];
  
  // Check if atom is ready (non-loading)
  ready<T>(atom: Atom<T>): boolean;
}
```

### Equality Functions

Control when atoms notify subscribers.

```ts
// Built-in options
atom(value, { equals: 'strict' });  // Object.is (default)
atom(value, { equals: 'shallow' }); // Shallow comparison
atom(value, { equals: 'deep' });    // Deep comparison (lodash)

// Custom equality function
atom(value, { 
  equals: (a, b) => a.id === b.id 
});
```

### Error Handling

Use `safe()` instead of try/catch in reactive contexts.

```ts
// ❌ WRONG - Catches Suspense Promise
derived(({ read }) => {
  try {
    return read(asyncAtom$);
  } catch (e) {
    return 'fallback'; // Catches loading promises too!
  }
});

// ✅ CORRECT - Use safe()
derived(({ read, safe }) => {
  const [err, data] = safe(() => read(asyncAtom$));
  if (err) return { error: err.message };
  return { data };
});
```

### DevTools & Hooks

Register hooks for debugging and monitoring.

```ts
import { onCreateHook, onErrorHook } from 'atomirx';

// Monitor atom creation
const unsubscribe = onCreateHook.add((info) => {
  console.log('Created:', info.type, info.key);
});

// Monitor errors
onErrorHook.add(({ source, error }) => {
  console.error('Error in', source.type, source.key, error);
});
```

---

## API Reference

### Core

| Export | Description |
|--------|-------------|
| `atom(value, options?)` | Create a mutable atom |
| `derived(selector, options?)` | Create a computed atom |
| `effect(fn, options?)` | Create a side effect |
| `pool(init, options)` | Create a parameterized atom family |
| `batch(fn)` | Batch multiple updates |
| `define(factory, options?)` | Create a lazy singleton module |
| `readonly(atom)` | Type utility for read-only exposure |
| `select(selector)` | Run a selector outside React |
| `emitter()` | Create an event emitter |

### React

| Export | Description |
|--------|-------------|
| `useSelector(selector, equals?)` | Subscribe to atom(s) |
| `rx(selector, options?)` | Inline reactive component |
| `useAction(fn, options?)` | Async action with state |
| `useStable` | Stable reference utilities |

### Promise Utilities

| Export | Description |
|--------|-------------|
| `trackPromise(promise)` | Get/track promise state |
| `isPending(value)` | Check if promise is loading |
| `isFulfilled(value)` | Check if promise resolved |
| `isRejected(value)` | Check if promise rejected |
| `unwrap(value)` | Get value or throw error |

### Type Guards

| Export | Description |
|--------|-------------|
| `isAtom(value)` | Check if value is an atom |
| `isDerived(value)` | Check if value is a derived atom |
| `isPool(value)` | Check if value is a pool |
| `isVirtualAtom(value)` | Check if value is a virtual atom |

---

## Documentation

For more detailed documentation, see:

- **[Core Concepts](./packages/atomirx/docs/core-concepts.md)** - Deep dive into atoms, derived, effects
- **[React Guide](./packages/atomirx/docs/react-guide.md)** - Complete React integration guide
- **[Async Patterns](./packages/atomirx/docs/async-patterns.md)** - Handling async operations
- **[Testing](./packages/atomirx/docs/testing.md)** - Testing strategies and mocking
- **[Migration Guide](./packages/atomirx/docs/migration.md)** - Migrating from other libraries
- **[API Reference](./packages/atomirx/docs/api-reference.md)** - Complete API documentation

---

## Examples

Check out the example applications:

- **[Showcase App](./packages/showcase)** - Interactive demos of all features
- **[Todo App](./packages/todo-app)** - Real-world todo application

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT © [Gignuyen](https://github.com/linq2js)
