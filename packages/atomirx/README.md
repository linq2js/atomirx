# `atomirx`

**The Official, Opinionated, Batteries-Included Reactive State Management for TypeScript**

[![npm version](https://img.shields.io/npm/v/`atomirx`.svg?style=flat-square)](https://www.npmjs.com/package/`atomirx`)
[![npm downloads](https://img.shields.io/npm/dm/`atomirx`.svg?style=flat-square)](https://www.npmjs.com/package/`atomirx`)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/`atomirx`?style=flat-square)](https://bundlephobia.com/package/`atomirx`)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Purpose

The **`atomirx`** package is intended to be the standard way to write reactive state logic in TypeScript and JavaScript applications. It was originally created to help address three common concerns about state management:

- "Setting up reactive state is too complicated"
- "I have to add a lot of packages to handle async operations"
- "Fine-grained reactivity requires too much boilerplate"

We can't solve every use case, but in the spirit of [`create-react-app`](https://github.com/facebook/create-react-app), we can provide an official, opinionated set of tools that handles the most common use cases and reduces the decisions you need to make.

## Table of Contents

- [`atomirx`](#atomirx)
  - [Purpose](#purpose)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Using Create React App](#using-create-react-app)
    - [Adding to an Existing Project](#adding-to-an-existing-project)
  - [Why `atomirx`?](#why-atomirx)
    - [The Problem](#the-problem)
    - [The Solution](#the-solution)
    - [Design Philosophy](#design-philosophy)
  - [What's Included](#whats-included)
    - [Core](#core)
    - [React Bindings (\`\`atomirx`/react`)](#react-bindings-atomirxreact)
  - [Getting Started](#getting-started)
    - [Basic Example: Counter](#basic-example-counter)
    - [React Example: Todo App](#react-example-todo-app)
  - [Usage Guide](#usage-guide)
    - [Atoms: The Foundation](#atoms-the-foundation)
      - [Creating Atoms](#creating-atoms)
      - [Reading Atom Values](#reading-atom-values)
      - [Updating Atoms](#updating-atoms)
      - [Subscribing to Changes](#subscribing-to-changes)
      - [Complete Atom API](#complete-atom-api)
    - [Derived State: Computed Values](#derived-state-computed-values)
      - [Basic Derived State](#basic-derived-state)
      - [Conditional Dependencies](#conditional-dependencies)
      - [Suspense-Style Getters](#suspense-style-getters)
      - [Derived from Multiple Async Sources](#derived-from-multiple-async-sources)
    - [Effects: Side Effect Management](#effects-side-effect-management)
      - [Basic Effects](#basic-effects)
      - [Effects with Cleanup](#effects-with-cleanup)
      - [Effects with Multiple Dependencies](#effects-with-multiple-dependencies)
    - [Async Patterns](#async-patterns)
      - [`all()` - Wait for All (like Promise.all)](#all---wait-for-all-like-promiseall)
      - [`any()` - First Resolved (like Promise.any)](#any---first-resolved-like-promiseany)
      - [`race()` - First Settled (like Promise.race)](#race---first-settled-like-promiserace)
      - [`settled()` - All Results (like Promise.allSettled)](#settled---all-results-like-promiseallsettled)
      - [Async Utility Summary](#async-utility-summary)
    - [Batching Updates](#batching-updates)
    - [Event System](#event-system)
    - [Dependency Injection](#dependency-injection)
  - [React Integration](#react-integration)
    - [useValue Hook](#usevalue-hook)
      - [Custom Equality](#custom-equality)
    - [Reactive Components with rx](#reactive-components-with-rx)
    - [Async Actions with useAction](#async-actions-with-useaction)
      - [Eager Execution](#eager-execution)
      - [useAction API](#useaction-api)
    - [Reference Stability with useStable](#reference-stability-with-usestable)
    - [Suspense Integration](#suspense-integration)
      - [Nested Suspense Boundaries](#nested-suspense-boundaries)
  - [API Reference](#api-reference)
    - [Core API](#core-api)
      - [`atom<T>(initialValue, options?)`](#atomtinitialvalue-options)
      - [`derived<T>(selector)`](#derivedtselector)
      - [`effect(fn)`](#effectfn)
      - [`batch(fn)`](#batchfn)
      - [`emitter<T>()`](#emittert)
      - [`define<T>(factory, options?)`](#definetfactory-options)
      - [`isAtom(value)`](#isatomvalue)
    - [SelectContext API](#selectcontext-api)
    - [React API](#react-api)
      - [`useValue`](#usevalue)
      - [`rx`](#rx)
      - [`useAction`](#useaction)
      - [`useStable`](#usestable)
  - [TypeScript Integration](#typescript-integration)
  - [Comparison with Other Libraries](#comparison-with-other-libraries)
    - [When to Use `atomirx`](#when-to-use-atomirx)
  - [Resources \& Learning](#resources--learning)
    - [Documentation](#documentation)
    - [Examples](#examples)
    - [Community](#community)
  - [License](#license)

## Installation

### Using Create React App

The fastest way to get started is using our official template:

```bash
npx create-react-app my-app --template `atomirx`
```

### Adding to an Existing Project

`atomirx` is available as a package on NPM for use with a module bundler or in a Node application:

```bash
# NPM
npm install `atomirx`

# Yarn
yarn add `atomirx`

# PNPM
pnpm add `atomirx`
```

The package includes precompiled ESM and CommonJS builds, along with TypeScript type definitions.

## Why `atomirx`?

### The Problem

Traditional state management solutions often require:

- **Excessive boilerplate** for simple state updates
- **Separate packages** for async operations, caching, and derived state
- **Manual subscription management** leading to memory leaks
- **Coarse-grained updates** causing unnecessary re-renders
- **Complex mental models** for understanding data flow

### The Solution

`atomirx` provides a **unified, minimal API** that handles all common state management patterns out of the box:

| Challenge         | `atomirx` Solution                                             |
| ----------------- | -------------------------------------------------------------- |
| Mutable state     | `atom()` - single source of truth with automatic subscriptions |
| Computed values   | `derived()` - automatic dependency tracking and memoization    |
| Side effects      | `effect()` - declarative effects with cleanup                  |
| Async operations  | Built-in Promise support with loading/error states             |
| React integration | Suspense-compatible hooks with fine-grained updates            |
| Testing           | `define()` - dependency injection with easy mocking            |

### Design Philosophy

`atomirx` is built on these core principles:

1. **Minimal API Surface** - Learn three functions (`atom`, `derived`, `effect`) and you're productive
2. **Async-First** - Promises are first-class citizens, not an afterthought
3. **Fine-Grained Reactivity** - Only the code that needs to run, runs
4. **Type Safety** - Full TypeScript inference without manual type annotations
5. **Framework Agnostic** - Core library has zero dependencies; React bindings are optional
6. **Suspense-Native** - Designed from the ground up for React Suspense patterns

## What's Included

`atomirx` includes these APIs:

### Core

- **`atom()`**: Creates mutable reactive state containers with built-in async support
- **`derived()`**: Creates computed values with automatic dependency tracking
- **`effect()`**: Runs side effects that automatically re-execute when dependencies change
- **`batch()`**: Groups multiple updates into a single notification cycle
- **`define()`**: Creates swappable lazy singletons for dependency injection

### React Bindings (``atomirx`/react`)

- **`useValue()`**: Subscribe to atoms with automatic re-rendering
- **`rx()`**: Inline reactive components for fine-grained updates
- **`useAction()`**: Handle async operations with loading/error states
- **`useStable()`**: Stabilize object/array/callback references

## Getting Started

### Basic Example: Counter

```typescript
import { atom, derived, effect } from "`atomirx`";

// Step 1: Create an atom (mutable state)
const count$ = atom(0);

// Step 2: Create derived state (computed values)
const doubled$ = derived(({ get }) => get(count$) * 2);
const message$ = derived(({ get }) => {
  const count = get(count$);
  return count === 0 ? "Click to start!" : `Count: ${count}`;
});

// Step 3: React to changes with effects
effect(({ get }) => {
  console.log("Current count:", get(count$));
  console.log("Doubled value:", get(doubled$));
});

// Step 4: Update state
count$.set(5); // Logs: Current count: 5, Doubled value: 10
count$.set((n) => n + 1); // Logs: Current count: 6, Doubled value: 12
```

### React Example: Todo App

```tsx
import { atom, derived } from "`atomirx`";
import { useValue, rx } from "`atomirx`/react";

// Define your state
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos$ = atom<Todo[]>([]);
const filter$ = atom<"all" | "active" | "completed">("all");

// Derive computed state
const filteredTodos$ = derived(({ get }) => {
  const todos = get(todos$);
  const filter = get(filter$);

  switch (filter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
});

const stats$ = derived(({ get }) => {
  const todos = get(todos$);
  return {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    remaining: todos.filter((t) => !t.completed).length,
  };
});

// Actions
const addTodo = (text: string) => {
  todos$.set((todos) => [...todos, { id: Date.now(), text, completed: false }]);
};

const toggleTodo = (id: number) => {
  todos$.set((todos) =>
    todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
  );
};

// Components
function TodoList() {
  const todos = useValue(filteredTodos$);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.completed ? "✓" : "○"} {todo.text}
        </li>
      ))}
    </ul>
  );
}

function Stats() {
  // Fine-grained updates: only re-renders when stats change
  return (
    <footer>
      {rx(({ get }) => {
        const { total, completed, remaining } = get(stats$);
        return (
          <span>
            {remaining} of {total} remaining
          </span>
        );
      })}
    </footer>
  );
}
```

## Usage Guide

### Atoms: The Foundation

Atoms are the building blocks of `atomirx`. They hold mutable state and automatically notify subscribers when the value changes.

#### Creating Atoms

```typescript
import { atom } from "`atomirx`";

// Synchronous atom with initial value
const count$ = atom(0);
const user$ = atom<User | null>(null);
const settings$ = atom({ theme: "dark", language: "en" });

// Async atom - automatically tracks loading/error states
const userData$ = atom(fetchUser(userId));

// Lazy initialization - computation deferred until first access
const expensive$ = atom(() => computeExpensiveValue());

// With fallback value during loading/error
const posts$ = atom(fetchPosts(), { fallback: [] });
```

#### Reading Atom Values

```typescript
// Direct access (outside reactive context)
console.log(count$.value); // Current value
console.log(userData$.loading); // true while Promise is pending
console.log(userData$.error); // Error if Promise rejected

// Check state
console.log(posts$.stale()); // true if using fallback during loading
console.log(count$.dirty()); // true if modified since creation
```

#### Updating Atoms

```typescript
// Direct value
count$.set(10);

// Functional update (receives current value)
count$.set((current) => current + 1);

// Async update
userData$.set(fetchUser(newUserId));

// Reset to initial state
count$.reset();
```

#### Subscribing to Changes

```typescript
// Subscribe to changes
const unsubscribe = count$.on((newValue) => {
  console.log("Count changed to:", newValue);
});

// Await async atoms
await userData$;
console.log("User loaded:", userData$.value);

// Unsubscribe when done
unsubscribe();
```

#### Complete Atom API

| Property/Method | Type             | Description                                                  |
| --------------- | ---------------- | ------------------------------------------------------------ |
| `value`         | `T \| undefined` | Current value. `undefined` during loading without fallback   |
| `loading`       | `boolean`        | `true` while waiting for Promise to resolve                  |
| `error`         | `unknown`        | Error from rejected Promise, `undefined` otherwise           |
| `stale()`       | `boolean`        | `true` if using fallback/previous value during loading/error |
| `dirty()`       | `boolean`        | `true` if value has been modified since creation             |
| `set(value)`    | `void`           | Update with value, Promise, or updater function              |
| `reset()`       | `void`           | Reset to initial state                                       |
| `on(listener)`  | `() => void`     | Subscribe to changes, returns unsubscribe function           |
| `then()`        | `Promise<T>`     | Makes atom awaitable: `await atom`                           |

### Derived State: Computed Values

Derived atoms automatically compute values based on other atoms. They track dependencies at runtime and only recompute when those specific dependencies change.

#### Basic Derived State

```typescript
import { atom, derived } from "`atomirx`";

const firstName$ = atom("John");
const lastName$ = atom("Doe");

// Derived state with automatic dependency tracking
const fullName$ = derived(({ get }) => {
  return `${get(firstName$)} ${get(lastName$)}`;
});

console.log(fullName$.value); // "John Doe"

firstName$.set("Jane");
console.log(fullName$.value); // "Jane Doe"
```

#### Conditional Dependencies

One of `atomirx`'s most powerful features is **conditional dependency tracking**. Dependencies are tracked based on actual runtime access, not static analysis:

```typescript
const showDetails$ = atom(false);
const summary$ = atom("Brief overview");
const details$ = atom("Detailed information...");

const content$ = derived(({ get }) => {
  // Only tracks showDetails$ initially
  if (get(showDetails$)) {
    // details$ becomes a dependency only when showDetails$ is true
    return get(details$);
  }
  return get(summary$);
});

// When showDetails$ is false:
// - Changes to details$ do NOT trigger recomputation
// - Only changes to showDetails$ or summary$ trigger recomputation
```

#### Suspense-Style Getters

The `get()` function follows React Suspense semantics for async atoms:

| Atom State | `get()` Behavior                                |
| ---------- | ----------------------------------------------- |
| Loading    | Throws the Promise (caught by derived/Suspense) |
| Error      | Throws the error                                |
| Resolved   | Returns the value                               |

```typescript
const user$ = atom(fetchUser());

const userName$ = derived(({ get }) => {
  // Automatically handles loading/error states
  const user = get(user$);
  return user.name;
});

// userName$.loading is true while user$ is loading
// userName$.error is set if user$ has an error
// userName$.value is available when user$ resolves
```

#### Derived from Multiple Async Sources

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());

const dashboard$ = derived(({ get }) => {
  const user = get(user$); // Suspends if loading
  const posts = get(posts$); // Suspends if loading

  return {
    userName: user.name,
    postCount: posts.length,
  };
});

// dashboard$.loading is true until BOTH user$ and posts$ resolve
```

### Effects: Side Effect Management

Effects run side effects whenever their dependencies change. They use the same reactive context as `derived()`.

#### Basic Effects

```typescript
import { atom, effect } from "`atomirx`";

const count$ = atom(0);

// Effect runs immediately and on every change
const dispose = effect(({ get }) => {
  console.log("Count is now:", get(count$));
});

count$.set(5); // Logs: "Count is now: 5"

// Clean up when done
dispose();
```

#### Effects with Cleanup

Return a cleanup function to run before the next execution or disposal:

```typescript
const interval$ = atom(1000);

const dispose = effect(({ get }) => {
  const ms = get(interval$);
  const id = setInterval(() => console.log("tick"), ms);

  // Cleanup runs before next execution or on dispose
  return () => clearInterval(id);
});

interval$.set(500); // Clears old interval, starts new one
dispose(); // Clears interval completely
```

#### Effects with Multiple Dependencies

```typescript
const user$ = atom<User | null>(null);
const settings$ = atom({ notifications: true });

effect(({ get }) => {
  const user = get(user$);
  const settings = get(settings$);

  if (user && settings.notifications) {
    analytics.identify(user.id);
    notifications.subscribe(user.id);
  }
});
```

### Async Patterns

`atomirx` provides powerful utilities for working with multiple async atoms through the `SelectContext`.

#### `all()` - Wait for All (like Promise.all)

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());
const comments$ = atom(fetchComments());

const dashboard$ = derived(({ all }) => {
  // Suspends until ALL atoms resolve
  const [user, posts, comments] = all([user$, posts$, comments$]);

  return { user, posts, comments };
});
```

#### `any()` - First Resolved (like Promise.any)

```typescript
const primaryApi$ = atom(fetchFromPrimary());
const fallbackApi$ = atom(fetchFromFallback());

const data$ = derived(({ any }) => {
  // Returns first successfully resolved value
  // Object form returns [key, value] tuple
  const [source, value] = any({
    primary: primaryApi$,
    fallback: fallbackApi$,
  });

  console.log(`Data from: ${source}`);
  return value;
});
```

#### `race()` - First Settled (like Promise.race)

```typescript
const cache$ = atom(checkCache());
const api$ = atom(fetchFromApi());

const data$ = derived(({ race }) => {
  // Returns first settled (resolved OR rejected)
  const [source, value] = race({
    cache: cache$,
    api: api$,
  });

  return { source, value };
});
```

#### `settled()` - All Results (like Promise.allSettled)

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());

const results$ = derived(({ settled }) => {
  // Never suspends - returns status for each atom
  const [userResult, postsResult] = settled([user$, posts$]);

  return {
    user: userResult.status === "resolved" ? userResult.value : null,
    posts: postsResult.status === "resolved" ? postsResult.value : [],
    hasErrors:
      userResult.status === "rejected" || postsResult.status === "rejected",
  };
});
```

#### Async Utility Summary

| Utility     | Input Form | Output               | Behavior                             |
| ----------- | ---------- | -------------------- | ------------------------------------ |
| `all()`     | Array      | Array of values      | Suspends until all resolve           |
| `any()`     | Object     | `[key, value]` tuple | First to resolve wins                |
| `race()`    | Object     | `[key, value]` tuple | First to settle wins                 |
| `settled()` | Array      | Array of results     | Never suspends, returns all statuses |

### Batching Updates

When updating multiple atoms, use `batch()` to combine notifications:

```typescript
import { atom, batch } from "`atomirx`";

const firstName$ = atom("John");
const lastName$ = atom("Doe");
const age$ = atom(30);

// Without batch: 3 separate notifications
firstName$.set("Jane");
lastName$.set("Smith");
age$.set(25);

// With batch: 1 notification with final state
batch(() => {
  firstName$.set("Jane");
  lastName$.set("Smith");
  age$.set(25);
});
```

### Event System

The `emitter()` function provides a lightweight pub/sub system:

```typescript
import { emitter } from "`atomirx`";

// Create typed emitter
const userEvents = emitter<{ type: "login" | "logout"; userId: string }>();

// Subscribe
const unsubscribe = userEvents.on((event) => {
  console.log(`User ${event.userId} ${event.type}`);
});

// Emit events
userEvents.emit({ type: "login", userId: "123" });

// Settle pattern - late subscribers receive the settled value
const appReady = emitter<Config>();
appReady.settle(config); // All current AND future subscribers receive config
```

### Dependency Injection

The `define()` function creates swappable lazy singletons, perfect for testing:

```typescript
import { define, atom } from "`atomirx`";

// Define a store factory
const counterStore = define(() => {
  const count$ = atom(0);

  return {
    count$,
    increment: () => count$.set((c) => c + 1),
    decrement: () => count$.set((c) => c - 1),
    reset: () => count$.reset(),
  };
});

// Usage - lazy singleton (same instance everywhere)
const store = counterStore();
store.increment();

// Testing - override the factory
counterStore.override(() => ({
  count$: atom(999),
  increment: vi.fn(),
  decrement: vi.fn(),
  reset: vi.fn(),
}));

// Reset to original implementation
counterStore.reset();
```

## React Integration

`atomirx` provides first-class React integration through the ``atomirx`/react` package.

### useValue Hook

Subscribe to atom values with automatic re-rendering:

```tsx
import { useValue } from "`atomirx`/react";
import { atom } from "`atomirx`";

const count$ = atom(0);
const user$ = atom<User | null>(null);

function Counter() {
  // Shorthand: pass atom directly
  const count = useValue(count$);

  // Context selector: compute derived value
  const doubled = useValue(({ get }) => get(count$) * 2);

  // Multiple atoms
  const display = useValue(({ get }) => {
    const count = get(count$);
    const user = get(user$);
    return user ? `${user.name}: ${count}` : `Anonymous: ${count}`;
  });

  return <div>{display}</div>;
}
```

#### Custom Equality

```tsx
// Only re-render when specific fields change
const userName = useValue(
  ({ get }) => get(user$)?.name,
  (prev, next) => prev === next,
);
```

### Reactive Components with rx

The `rx()` function creates inline reactive components for fine-grained updates:

```tsx
import { rx } from "`atomirx`/react";

function Dashboard() {
  return (
    <div>
      {/* Only this span re-renders when count$ changes */}
      <span>Count: {rx(count$)}</span>

      {/* Derived value */}
      <span>Doubled: {rx(({ get }) => get(count$) * 2)}</span>

      {/* Complex rendering */}
      {rx(({ get }) => {
        const user = get(user$);
        return user ? <UserCard user={user} /> : <LoginPrompt />;
      })}

      {/* Async with utilities */}
      {rx(({ all }) => {
        const [user, posts] = all([user$, posts$]);
        return <Feed user={user} posts={posts} />;
      })}
    </div>
  );
}
```

**Key benefit**: The parent component doesn't re-render when atoms change - only the `rx` components do.

### Async Actions with useAction

Handle async operations with built-in loading/error states:

```tsx
import { useAction } from "`atomirx`/react";

function UserProfile({ userId }: { userId: string }) {
  const saveUser = useAction(async ({ signal }, data: UserData) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      signal, // Automatic abort on unmount or re-execution
    });
    return response.json();
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveUser(formData);
      }}
    >
      {saveUser.status === "loading" && <Spinner />}
      {saveUser.status === "error" && <Error message={saveUser.error} />}
      {saveUser.status === "success" && <Success data={saveUser.result} />}

      <button disabled={saveUser.status === "loading"}>Save</button>
    </form>
  );
}
```

#### Eager Execution

```tsx
// Execute immediately on mount
const fetchUser = useAction(
  async ({ signal }) => fetchUserApi(userId, { signal }),
  { lazy: false, deps: [userId] },
);

// Re-execute when atom changes
const fetchPosts = useAction(
  async ({ signal }) => fetchPostsApi(filter$.value, { signal }),
  { lazy: false, deps: [filter$] },
);
```

#### useAction API

| Property/Method | Type                                          | Description                  |
| --------------- | --------------------------------------------- | ---------------------------- |
| `status`        | `'idle' \| 'loading' \| 'success' \| 'error'` | Current state                |
| `result`        | `T \| undefined`                              | Result value when successful |
| `error`         | `unknown`                                     | Error when failed            |
| `abort()`       | `() => void`                                  | Cancel current request       |
| `reset()`       | `() => void`                                  | Reset to idle state          |

### Reference Stability with useStable

Prevent unnecessary re-renders by stabilizing references:

```tsx
import { useStable } from "`atomirx`/react";

function SearchResults({ query, filters }: Props) {
  const stable = useStable({
    // Object - stable if shallow equal
    searchParams: { query, ...filters },

    // Array - stable if items are reference-equal
    selectedIds: [1, 2, 3],

    // Function - reference never changes
    onSelect: (id: number) => {
      console.log("Selected:", id);
    },
  });

  // Safe to use in dependency arrays
  useEffect(() => {
    performSearch(stable.searchParams);
  }, [stable.searchParams]);

  return (
    <MemoizedList params={stable.searchParams} onSelect={stable.onSelect} />
  );
}
```

### Suspense Integration

`atomirx` is designed to work seamlessly with React Suspense:

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { atom } from "`atomirx`";
import { useValue } from "`atomirx`/react";

const user$ = atom(fetchUser());

function UserProfile() {
  // Suspends until user$ resolves
  const user = useValue(user$);
  return <div>{user.name}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <UserProfile />
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### Nested Suspense Boundaries

```tsx
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header /> {/* Depends on user$ */}
      </Suspense>

      <Suspense fallback={<FeedSkeleton />}>
        <Feed /> {/* Depends on posts$ */}
      </Suspense>

      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar /> {/* Depends on recommendations$ */}
      </Suspense>
    </div>
  );
}
```

## API Reference

### Core API

#### `atom<T>(initialValue, options?)`

Creates a mutable reactive atom.

```typescript
function atom<T>(
  initialValue: T | Promise<T> | (() => T | Promise<T>),
  options?: { fallback?: T },
): MutableAtom<T>;
```

#### `derived<T>(selector)`

Creates a read-only derived atom.

```typescript
function derived<T>(selector: (context: SelectContext) => T): Atom<T>;

// Legacy array API (backward compatible)
function derived<T, S>(source: Atom<S>, selector: (get: () => S) => T): Atom<T>;

function derived<T, S extends readonly Atom<any>[]>(
  sources: S,
  selector: (...getters: GetterTuple<S>) => T,
): Atom<T>;
```

#### `effect(fn)`

Creates a side effect that runs when dependencies change.

```typescript
function effect(
  fn: (context: SelectContext) => void | (() => void),
): () => void; // Returns dispose function
```

#### `batch(fn)`

Batches multiple updates into a single notification.

```typescript
function batch<T>(fn: () => T): T;
```

#### `emitter<T>()`

Creates a pub/sub event emitter.

```typescript
function emitter<T>(): {
  on: (listener: (value: T) => void) => () => void;
  emit: (value: T) => void;
  settle: (value: T) => void;
};
```

#### `define<T>(factory, options?)`

Creates a swappable lazy singleton.

```typescript
function define<T>(
  factory: () => T,
  options?: { eager?: boolean },
): {
  (): T;
  override: (factory: () => T) => void;
  reset: () => void;
};
```

#### `isAtom(value)`

Type guard for atoms.

```typescript
function isAtom<T>(value: unknown): value is Atom<T>;
```

### SelectContext API

Available in `derived()`, `effect()`, `useValue()`, and `rx()`:

| Method    | Signature                                            | Description                                |
| --------- | ---------------------------------------------------- | ------------------------------------------ |
| `get`     | `<T>(atom: Atom<T>) => T`                            | Read atom value with dependency tracking   |
| `all`     | `<T>(atoms: Atom<T>[]) => T[]`                       | Wait for all atoms (Promise.all semantics) |
| `any`     | `<T>(atoms: Record<string, Atom<T>>) => [string, T]` | First resolved (Promise.any semantics)     |
| `race`    | `<T>(atoms: Record<string, Atom<T>>) => [string, T]` | First settled (Promise.race semantics)     |
| `settled` | `<T>(atoms: Atom<T>[]) => SettledResult<T>[]`        | All results (Promise.allSettled semantics) |

### React API

#### `useValue`

```typescript
// Shorthand
function useValue<T>(atom: Atom<T>): T;

// Context selector
function useValue<T>(
  selector: (context: SelectContext) => T,
  equals?: (prev: T, next: T) => boolean,
): T;
```

#### `rx`

```typescript
// Shorthand
function rx<T>(atom: Atom<T>): ReactNode;

// Context selector
function rx<T>(
  selector: (context: SelectContext) => T,
  equals?: (prev: T, next: T) => boolean,
): ReactNode;
```

#### `useAction`

```typescript
function useAction<T, Args extends any[]>(
  action: (context: { signal: AbortSignal }, ...args: Args) => Promise<T>,
  options?: {
    lazy?: boolean;
    deps?: (Atom<any> | any)[];
  },
): {
  (...args: Args): void;
  status: "idle" | "loading" | "success" | "error";
  result: T | undefined;
  error: unknown;
  abort: () => void;
  reset: () => void;
};
```

#### `useStable`

```typescript
function useStable<T extends Record<string, any>>(
  input: T,
  equals?: (prev: T[keyof T], next: T[keyof T]) => boolean,
): T;
```

## TypeScript Integration

`atomirx` is written in TypeScript and provides full type inference:

```typescript
import { atom, derived } from "`atomirx`";

// Types are automatically inferred
const count$ = atom(0); // MutableAtom<number>
const name$ = atom("John"); // MutableAtom<string>
const doubled$ = derived(({ get }) => get(count$) * 2); // Atom<number>

// Explicit typing when needed
interface User {
  id: string;
  name: string;
  email: string;
}

const user$ = atom<User | null>(null); // MutableAtom<User | null>
const userData$ = atom<User>(fetchUser()); // MutableAtom<User>

// Type-safe selectors
const userName$ = derived(({ get }) => {
  const user = get(user$);
  return user?.name ?? "Anonymous"; // Atom<string>
});

// Generic atoms
function createListAtom<T>(initial: T[] = []) {
  const items$ = atom<T[]>(initial);

  return {
    items$,
    add: (item: T) => items$.set((list) => [...list, item]),
    remove: (predicate: (item: T) => boolean) =>
      items$.set((list) => list.filter((item) => !predicate(item))),
  };
}

const todoList = createListAtom<Todo>();
```

## Comparison with Other Libraries

| Feature              | `atomirx`   | Redux Toolkit | Zustand | Jotai       | Recoil   |
| -------------------- | ----------- | ------------- | ------- | ----------- | -------- |
| Bundle size          | ~3KB        | ~12KB         | ~3KB    | ~8KB        | ~20KB    |
| Boilerplate          | Minimal     | Low           | Minimal | Minimal     | Medium   |
| TypeScript           | First-class | First-class   | Good    | First-class | Good     |
| Async support        | Built-in    | RTK Query     | Manual  | Built-in    | Built-in |
| Fine-grained updates | Yes         | No            | Partial | Yes         | Yes      |
| Suspense support     | Native      | No            | No      | Yes         | Yes      |
| DevTools             | Planned     | Yes           | Yes     | Yes         | Yes      |
| Learning curve       | Low         | Medium        | Low     | Low         | Medium   |

### When to Use `atomirx`

**Choose `atomirx` when you want:**

- Minimal API with maximum capability
- First-class async support without additional packages
- Fine-grained reactivity for optimal performance
- React Suspense integration out of the box
- Strong TypeScript inference

**Consider alternatives when you need:**

- Time-travel debugging (Redux Toolkit)
- Established ecosystem with many plugins (Redux)
- Server-side state management (TanStack Query)

## Resources & Learning

### Documentation

- [API Reference](#api-reference) - Complete API documentation
- [Usage Guide](#usage-guide) - In-depth usage patterns
- [React Integration](#react-integration) - React-specific features

### Examples

- [Counter](./examples/counter) - Basic counter example
- [Todo App](./examples/todo) - Full todo application
- [Async Data](./examples/async) - Async data fetching patterns
- [Testing](./examples/testing) - Testing strategies with `define()`

### Community

- [GitHub Issues](https://github.com/`atomirx`/`atomirx`/issues) - Bug reports and feature requests
- [Discussions](https://github.com/`atomirx`/`atomirx`/discussions) - Questions and community support

## License

MIT License

Copyright (c) `atomirx` contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
