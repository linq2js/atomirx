# Getting Started

Learn the fundamentals of atomirx in 5 minutes.

## Installation

```bash
npm install atomirx
# or
pnpm add atomirx
# or
yarn add atomirx
```

## Quick Start

### 1. Create Your First Atom

```ts
import { atom } from 'atomirx';

// Create a simple counter
const count$ = atom(0);

// Read the value
console.log(count$.get()); // 0

// Update the value
count$.set(1);
count$.set(prev => prev + 1);

// Subscribe to changes
const unsubscribe = count$.on(() => {
  console.log('Count changed:', count$.get());
});
```

### 2. Derive Computed Values

```ts
import { atom, derived } from 'atomirx';

const count$ = atom(0);
const doubled$ = derived(({ read }) => read(count$) * 2);

// Derived values are always async (Promise)
await doubled$.get(); // 0

count$.set(5);
await doubled$.get(); // 10
```

### 3. Use with React

```tsx
import { atom } from 'atomirx';
import { useSelector, rx } from 'atomirx/react';

const count$ = atom(0);

function Counter() {
  const count = useSelector(count$);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => count$.set(n => n + 1)}>+</button>
    </div>
  );
}

// Or use rx() for inline reactive values
function CounterInline() {
  return (
    <div>
      <p>Count: {rx(count$)}</p>
      <button onClick={() => count$.set(n => n + 1)}>+</button>
    </div>
  );
}
```

## Core Concepts

### Atoms - Mutable State

Atoms are the basic unit of state. They hold a single value that can be read and updated.

```ts
const name$ = atom('John');
const settings$ = atom({ theme: 'dark', lang: 'en' });

// Lazy initialization
const timestamp$ = atom(() => Date.now());
timestamp$.reset(); // Re-runs initializer

// With equality checking
const state$ = atom({ count: 0 }, { equals: 'shallow' });
```

### Derived - Computed State

Derived atoms automatically compute values from other atoms. They're read-only and always return Promises.

```ts
const firstName$ = atom('John');
const lastName$ = atom('Doe');

const fullName$ = derived(({ read }) => 
  `${read(firstName$)} ${read(lastName$)}`
);
```

### Effects - Side Effects

Effects run when their dependencies change. Perfect for syncing state to external systems.

```ts
effect(({ read }) => {
  localStorage.setItem('count', String(read(count$)));
});

// With cleanup
effect(({ read, onCleanup }) => {
  const id = setInterval(() => {
    console.log(read(message$));
  }, 1000);
  onCleanup(() => clearInterval(id));
});
```

## Async Data

atomirx handles async data naturally using a Suspense-style API.

### Storing Promises

```ts
const user$ = atom(fetchUser());

// The atom stores the Promise as-is
user$.get(); // Promise<User>

// To refetch, set a new Promise
user$.set(fetchUser());
```

### Deriving from Async Data

```ts
const posts$ = atom(fetchPosts());

const postCount$ = derived(({ read }) => {
  const posts = read(posts$); // Suspends until resolved
  return posts.length;
});
```

### React Integration with Suspense

```tsx
import { Suspense } from 'react';
import { useSelector } from 'atomirx/react';

function UserProfile() {
  const user = useSelector(user$); // Awaited value
  return <div>{user.name}</div>;
}

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

### Fallback Values

Use `fallback` to provide a value during loading:

```ts
const postCount$ = derived(
  ({ read }) => read(posts$).length,
  { fallback: 0 }
);

// staleValue is guaranteed to be a number
postCount$.staleValue; // 0 (during loading) → actual count (after)
```

## Organizing State with Modules

Use `define()` to create lazy singleton stores:

```ts
import { atom, define, readonly } from 'atomirx';

const counterModule = define(() => {
  const count$ = atom(0);

  return {
    // Expose as read-only
    count$: readonly(count$),
    // Actions
    increment: () => count$.set(n => n + 1),
    decrement: () => count$.set(n => n - 1),
    reset: () => count$.reset(),
  };
});

// Usage
const { count$, increment } = counterModule();
increment();
```

## Batching Updates

Batch multiple updates to prevent intermediate renders:

```ts
import { batch } from 'atomirx';

batch(() => {
  firstName$.set('Jane');
  lastName$.set('Smith');
  age$.set(30);
});
// Subscribers notified once with final values
```

## Next Steps

- [API Reference](./api-reference.md) - Complete API documentation
- [Patterns](./patterns.md) - Common patterns and best practices
- [Testing](./testing.md) - Testing strategies
