# Atomirx

**Opinionated, Batteries-Included Reactive State Management**

[![npm version](https://img.shields.io/npm/v/atomirx.svg?style=flat-square)](https://www.npmjs.com/package/atomirx)
[![npm downloads](https://img.shields.io/npm/dm/atomirx.svg?style=flat-square)](https://www.npmjs.com/package/atomirx)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/atomirx?style=flat-square)](https://bundlephobia.com/package/atomirx)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Purpose

The **atomirx** package is intended to be the standard way to write reactive state logic in TypeScript and JavaScript applications. It was originally created to help address three common concerns about state management:

- "Setting up reactive state is too complicated"
- "I have to add a lot of packages to handle async operations"
- "Fine-grained reactivity requires too much boilerplate"

We can't solve every use case, but in the spirit of [`create-react-app`](https://github.com/facebook/create-react-app), we can provide an official, opinionated set of tools that handles the most common use cases and reduces the decisions you need to make.

## Table of Contents

- [Atomirx](#atomirx)
  - [Purpose](#purpose)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Why atomirx?](#why-atomirx)
    - [The Problem](#the-problem)
    - [The Solution](#the-solution)
    - [Design Philosophy](#design-philosophy)
  - [What's Included](#whats-included)
    - [Core](#core)
    - [React Bindings (`atomirx/react`)](#react-bindings-atomirxreact)
  - [Getting Started](#getting-started)
    - [Basic Example: Counter](#basic-example-counter)
    - [React Example: Todo App](#react-example-todo-app)
  - [Patterns \& Best Practices](#patterns--best-practices)
    - [Naming: The `$` Suffix](#naming-the--suffix)
    - [When to Use Each Primitive](#when-to-use-each-primitive)
    - [Atom Storage: Stable Scopes Only](#atom-storage-stable-scopes-only)
    - [Error Handling: Use `safe()` Not try/catch](#error-handling-use-safe-not-trycatch)
      - [The Problem with try/catch](#the-problem-with-trycatch)
      - [The Solution: safe()](#the-solution-safe)
      - [Use Cases for safe()](#use-cases-for-safe)
    - [SelectContext Methods: Synchronous Only](#selectcontext-methods-synchronous-only)
    - [Complete Example: Todo App with Async](#complete-example-todo-app-with-async)
    - [Deferred Entity Loading with `ready()`](#deferred-entity-loading-with-ready)
      - [The Pattern](#the-pattern)
      - [How It Works](#how-it-works)
      - [Component Usage](#component-usage)
      - [Benefits](#benefits)
      - [When to Use `ready()`](#when-to-use-ready)
      - [Important Notes](#important-notes)
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
      - [`any()` - First Ready (like Promise.any)](#any---first-ready-like-promiseany)
      - [`race()` - First Settled (like Promise.race)](#race---first-settled-like-promiserace)
      - [`settled()` - All Results (like Promise.allSettled)](#settled---all-results-like-promiseallsettled)
      - [Async Utility Summary](#async-utility-summary)
    - [Batching Updates](#batching-updates)
    - [Event System](#event-system)
    - [Dependency Injection](#dependency-injection)
    - [Atom Metadata and Middleware](#atom-metadata-and-middleware)
      - [Extending AtomMeta with TypeScript](#extending-atommeta-with-typescript)
      - [Using onCreateHook for Middleware](#using-oncreatehook-for-middleware)
      - [Creating Persisted Atoms](#creating-persisted-atoms)
      - [Multiple Middleware Example](#multiple-middleware-example)
      - [Hook Info Types](#hook-info-types)
  - [React Integration](#react-integration)
    - [useSelector Hook](#useselector-hook)
      - [Custom Equality](#custom-equality)
      - [Why useSelector is Powerful](#why-useselector-is-powerful)
    - [Reactive Components with rx](#reactive-components-with-rx)
      - [Inline Loading and Error Handling](#inline-loading-and-error-handling)
      - [Selector Memoization with `deps`](#selector-memoization-with-deps)
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
      - [`effect(fn, options?)`](#effectfn-options)
      - [`batch(fn)`](#batchfn)
      - [`emitter<T>()`](#emittert)
      - [`define<T>(factory, options?)`](#definetfactory-options)
      - [`isAtom(value)`](#isatomvalue)
    - [SelectContext API](#selectcontext-api)
      - [`state()` - Get Async State Without Throwing](#state---get-async-state-without-throwing)
    - [React API](#react-api)
      - [`useSelector`](#useselector)
      - [`rx`](#rx)
      - [`useAction`](#useaction)
      - [`useStable`](#usestable)
  - [TypeScript Integration](#typescript-integration)
  - [Comparison with Other Libraries](#comparison-with-other-libraries)
    - [When to Use atomirx](#when-to-use-atomirx)
  - [Resources \& Learning](#resources--learning)
    - [Documentation](#documentation)
    - [Examples](#examples)
    - [Community](#community)
  - [License](#license)

## Installation

atomirx is available as a package on NPM for use with a module bundler or in a Node application:

```bash
# NPM
npm install atomirx

# Yarn
yarn add atomirx

# PNPM
pnpm add atomirx
```

The package includes precompiled ESM and CommonJS builds, along with TypeScript type definitions.

## Why atomirx?

### The Problem

Traditional state management solutions often require:

- **Excessive boilerplate** for simple state updates
- **Separate packages** for async operations, caching, and derived state
- **Manual subscription management** leading to memory leaks
- **Coarse-grained updates** causing unnecessary re-renders
- **Complex mental models** for understanding data flow

### The Solution

atomirx provides a **unified, minimal API** that handles all common state management patterns out of the box:

| Challenge         | atomirx Solution                                               |
| ----------------- | -------------------------------------------------------------- |
| Mutable state     | `atom()` - single source of truth with automatic subscriptions |
| Computed values   | `derived()` - automatic dependency tracking and memoization    |
| Side effects      | `effect()` - declarative effects with cleanup                  |
| Async operations  | Built-in Promise support with loading/error states             |
| React integration | Suspense-compatible hooks with fine-grained updates            |
| Testing           | `define()` - dependency injection with easy mocking            |

### Design Philosophy

atomirx is built on these core principles:

1. **Minimal API Surface** - Learn three functions (`atom`, `derived`, `effect`) and you're productive
2. **Async-First** - Promises are first-class citizens, not an afterthought
3. **Fine-Grained Reactivity** - Only the code that needs to run, runs
4. **Type Safety** - Full TypeScript inference without manual type annotations
5. **Framework Agnostic** - Core library has zero dependencies; React bindings are optional
6. **Suspense-Native** - Designed from the ground up for React Suspense patterns

## What's Included

atomirx includes these APIs:

### Core

- **`atom()`**: Creates mutable reactive state containers with built-in async support
- **`derived()`**: Creates computed values with automatic dependency tracking
- **`effect()`**: Runs side effects that automatically re-execute when dependencies change
- **`batch()`**: Groups multiple updates into a single notification cycle
- **`define()`**: Creates swappable lazy singletons for dependency injection

### React Bindings (`atomirx/react`)

- **`useSelector()`**: Subscribe to atoms with automatic re-rendering (Suspense-based)
- **`rx()`**: Inline reactive components with optional loading/error handlers
- **`useAction()`**: Handle async operations with loading/error states
- **`useStable()`**: Stabilize object/array/callback references

## Getting Started

### Basic Example: Counter

```typescript
import { atom, derived, effect } from "atomirx";

// Step 1: Create an atom (mutable state)
const count$ = atom(0);

// Step 2: Create derived state (computed values)
const doubled$ = derived(({ read }) => read(count$) * 2);
const message$ = derived(({ read }) => {
  const count = read(count$);
  return count === 0 ? "Click to start!" : `Count: ${count}`;
});

// Step 3: React to changes with effects
effect(({ read }) => {
  console.log("Current count:", read(count$));
  console.log("Doubled value:", read(doubled$));
});

// Step 4: Update state
count$.set(5); // Logs: Current count: 5, Doubled value: 10
count$.set((n) => n + 1); // Logs: Current count: 6, Doubled value: 12
```

### React Example: Todo App

```tsx
import { atom, derived } from "atomirx";
import { useSelector, rx } from "atomirx/react";

// Define your state
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos$ = atom<Todo[]>([]);
const filter$ = atom<"all" | "active" | "completed">("all");

// Derive computed state
const filteredTodos$ = derived(({ read }) => {
  const todos = read(todos$);
  const filter = read(filter$);

  switch (filter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
});

const stats$ = derived(({ read }) => {
  const todos = read(todos$);
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
    todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
  );
};

// Components
function TodoList() {
  const todos = useSelector(filteredTodos$);

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
      {rx(({ read }) => {
        const { total, completed, remaining } = read(stats$);
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

## Patterns & Best Practices

Following consistent patterns and best practices makes atomirx code more readable and maintainable across your team.

### Naming: The `$` Suffix

All atoms (both `atom()` and `derived()`) should use the `$` suffix. This convention:

- Clearly distinguishes reactive state from regular variables
- Makes it obvious when you're working with atoms vs plain values
- Improves code readability at a glance

```typescript
// ✅ Good - clear that these are atoms
const count$ = atom(0);
const user$ = atom<User | null>(null);
const filteredItems$ = derived(({ read }) => /* ... */);

// ❌ Avoid - unclear what's reactive
const count = atom(0);
const user = atom<User | null>(null);
```

### When to Use Each Primitive

| Primitive   | Purpose                 | Use When                                                                    |
| ----------- | ----------------------- | --------------------------------------------------------------------------- |
| `atom()`    | Store values            | You need mutable state (including Promises)                                 |
| `derived()` | Compute reactive values | You need to transform or combine atom values                                |
| `effect()`  | Trigger side effects    | You need to react to atom changes (sync to external systems, logging, etc.) |

### Atom Storage: Stable Scopes Only

**Never store atoms in component/local scope.** Atoms created inside React components (even with `useRef`) can lead to:

- **Memory leaks** - atoms aren't properly disposed when components unmount
- **Forgotten disposal** - easy to forget cleanup logic
- **Multiple instances** - each component render may create new atoms

```typescript
// ❌ BAD - atoms in component scope
function TodoList() {
  // These atoms are created per component instance!
  const todos$ = useRef(atom(() => fetchTodos())).current;
  const filter$ = useRef(atom("all")).current;
  // Memory leak: atoms not disposed on unmount
}

// ✅ GOOD - atoms at module scope
const todos$ = atom(() => fetchTodos());
const filter$ = atom("all");

function TodoList() {
  const todos = useSelector(filteredTodos$);
  // ...
}
```

**Use `define()` to organize atoms into modules:**

```typescript
// ✅ BEST - atoms organized in a module with define()
const TodoModule = define(() => {
  // Atoms are created once, lazily
  const todos$ = atom(() => fetchTodos(), { meta: { key: "todos" } });
  const filter$ = atom<"all" | "active" | "completed">("all");

  const filteredTodos$ = derived(({ read }) => {
    const filter = read(filter$);
    const todos = read(todos$);
    return filter === "all" ? todos : todos.filter(/* ... */);
  });

  return {
    todos$,
    filter$,
    filteredTodos$,
    setFilter: (f: "all" | "active" | "completed") => filter$.set(f),
    refetch: () => todos$.set(fetchTodos()),
    reset: () => todos$.reset(),
  };
});

// Usage in React
function TodoList() {
  const { filteredTodos$, setFilter } = TodoModule();
  const todos = useSelector(filteredTodos$);
  // ...
}
```

Benefits of `define()`:

- **Lazy singleton** - module created on first access
- **Testable** - use `.override()` to inject mocks
- **Disposable** - use `.invalidate()` to clean up and recreate
- **Organized** - group related atoms and actions together

**`atom()`** - Store raw values, including Promises:

```typescript
// Synchronous values
const filter$ = atom("all");
const count$ = atom(0);

// Async values - store the Promise directly
const todoList$ = atom(() => fetchAllTodos()); // Lazy fetch on creation
const userData$ = atom(fetchUser(userId)); // Fetch immediately
```

**`derived()`** - Handle reactive/async transformations:

```typescript
// derived() automatically unwraps Promises from atoms
const filteredTodoList$ = derived(({ read }) => {
  const filter = read(filter$);
  const todoList = read(todoList$); // Promise is unwrapped automatically!

  switch (filter) {
    case "active":
      return todoList.filter((t) => !t.completed);
    case "completed":
      return todoList.filter((t) => t.completed);
    default:
      return todoList;
  }
});
```

**`effect()`** - Coordinate updates across multiple atoms:

```typescript
// Sync local state to server when it changes
effect(({ read, onCleanup }) => {
  const settings = read(settings$);

  const controller = new AbortController();
  saveSettingsToServer(settings, { signal: controller.signal });

  onCleanup(() => controller.abort());
});

// Update multiple atoms based on another atom's change
effect(({ read }) => {
  const user = read(currentUser$);

  if (user) {
    // Trigger fetches for user-specific data
    userPosts$.set(fetchUserPosts(user.id));
    userSettings$.set(fetchUserSettings(user.id));
  }
});
```

### Error Handling: Use `safe()` Not try/catch

When working with reactive selectors in `derived()`, `effect()`, `useSelector()`, and `rx()`, you need to be careful about how you handle errors. The standard JavaScript `try/catch` pattern can break atomirx's Suspense mechanism.

#### The Problem with try/catch

The `read()` function in selectors uses a **Suspense-like pattern**: when an atom is loading (contains a pending Promise), `read()` throws that Promise. This is how atomirx signals to React's Suspense that it should show a fallback.

**If you wrap `read()` in a try/catch, you'll catch the Promise** along with any actual errors:

```typescript
// ❌ WRONG - This breaks Suspense!
const data$ = derived(({ read }) => {
  try {
    const user = read(asyncUser$); // Throws Promise when loading!
    return processUser(user);
  } catch (e) {
    // This catches BOTH:
    // 1. The Promise (when loading) - breaks Suspense!
    // 2. Actual errors from processUser()
    return null;
  }
});
```

This causes several problems:

1. **Loading state is lost** - Instead of suspending, your derived atom immediately returns `null`
2. **No Suspense fallback** - React never sees the loading state
3. **Silent failures** - You can't distinguish between "loading" and "error"

#### The Solution: safe()

atomirx provides the `safe()` utility in all selector contexts. It catches actual errors but **re-throws Promises** to preserve Suspense:

```typescript
// ✅ CORRECT - Use safe() for error handling
const data$ = derived(({ read, safe }) => {
  const [err, user] = safe(() => {
    const raw = read(asyncUser$); // Can throw Promise (Suspense) ✓
    return processUser(raw); // Can throw Error ✓
  });

  if (err) {
    // Only actual errors reach here, not loading state
    console.error("Processing failed:", err);
    return { error: err.message };
  }

  return { user };
});
```

**How `safe()` works:**

| Scenario          | `try/catch`        | `safe()`                        |
| ----------------- | ------------------ | ------------------------------- |
| Loading (Promise) | ❌ Catches Promise | ✅ Re-throws → Suspense         |
| Error             | ✅ Catches error   | ✅ Returns `[error, undefined]` |
| Success           | ✅ Returns value   | ✅ Returns `[undefined, value]` |

#### Use Cases for safe()

**1. Parsing/Validation that might fail:**

```typescript
const parsedConfig$ = derived(({ read, safe }) => {
  const [err, config] = safe(() => {
    const raw = read(rawConfig$);
    return JSON.parse(raw); // Can throw SyntaxError
  });

  if (err) {
    return { valid: false, error: "Invalid JSON" };
  }
  return { valid: true, config };
});
```

**2. Graceful degradation with multiple sources:**

```typescript
const dashboard$ = derived(({ read, safe }) => {
  // Primary data - required
  const user = read(user$);

  // Optional data - graceful degradation
  const [err1, analytics] = safe(() => read(analytics$));
  const [err2, notifications] = safe(() => read(notifications$));

  return {
    user,
    analytics: err1 ? null : analytics,
    notifications: err2 ? [] : notifications,
    errors: [err1, err2].filter(Boolean),
  };
});
```

**3. Error handling in effects:**

```typescript
effect(({ read, safe }) => {
  const [err, data] = safe(() => {
    const raw = read(asyncData$);
    return transformData(raw);
  });

  if (err) {
    console.error("Effect failed:", err);
    return; // Skip the rest of the effect
  }

  saveToLocalStorage(data);
});
```

**4. Error handling in React components:**

```tsx
function UserProfile() {
  const result = useSelector(({ read, safe }) => {
    const [err, user] = safe(() => read(user$));
    return { err, user };
  });

  if (result.err) {
    return <ErrorMessage error={result.err} />;
  }

  return <Profile user={result.user} />;
}
```

**5. With rx() for inline error handling:**

```tsx
<Suspense fallback={<Loading />}>
  {rx(({ read, safe }) => {
    const [err, posts] = safe(() => read(posts$));
    if (err) return <ErrorBanner message="Failed to load posts" />;
    return posts.map((post) => <PostCard key={post.id} post={post} />);
  })}
</Suspense>
```

### SelectContext Methods: Synchronous Only

All context methods (`read`, `all`, `race`, `any`, `settled`, `safe`) must be called **synchronously** during selector execution. They cannot be used in async callbacks like `setTimeout`, `Promise.then`, or event handlers.

```typescript
// ❌ WRONG - Calling read() in async callback
derived(({ read }) => {
  setTimeout(() => {
    read(atom$); // Error: called outside selection context
  }, 100);
  return "value";
});

// ❌ WRONG - Storing read() for later use
let savedRead;
select(({ read }) => {
  savedRead = read; // Don't do this!
  return read(atom$);
});
savedRead(atom$); // Error: called outside selection context

// ✅ CORRECT - For async access, use atom.get() directly
effect(({ read }) => {
  const config = read(config$);

  setTimeout(async () => {
    // Use atom.get() for async access (not tracked as dependency)
    const data = myMutableAtom$.get();
    const asyncData = await myDerivedAtom$.get();
    console.log(data, asyncData);
  }, 100);
});
```

**Why this restriction?**

1. **Dependency tracking**: Context methods track which atoms are accessed to know when to recompute. This tracking only works during synchronous execution.

2. **Predictable behavior**: If `read()` could be called at any time, the reactive graph would be unpredictable and hard to debug.

3. **Clear error messages**: Rather than silently failing to track dependencies, atomirx throws a helpful error explaining the issue.

**For async access**, use `atom.get()` directly:

- `mutableAtom$.get()` - Returns the raw value (may be a Promise)
- `await derivedAtom$.get()` - Returns a Promise that resolves to the computed value

### Complete Example: Todo App with Async

```typescript
import { atom, derived } from "atomirx";
import { useSelector, rx } from "atomirx/react";
import { Suspense } from "react";

// Atoms store values (including Promises)
const filter$ = atom<"all" | "active" | "completed">("all");
const todoList$ = atom(() => fetchAllTodos()); // Lazy init, re-runs on reset()

// Derived handles reactive transformations (auto-unwraps Promises)
const filteredTodoList$ = derived(({ read }) => {
  const filter = read(filter$);
  const todoList = read(todoList$); // This is the resolved value, not a Promise!

  switch (filter) {
    case "active": return todoList.filter(t => !t.completed);
    case "completed": return todoList.filter(t => t.completed);
    default: return todoList;
  }
});

// In UI - useSelector suspends until data is ready
function TodoList() {
  const filteredTodoList = useSelector(filteredTodoList$);

  return (
    <ul>
      {filteredTodoList.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}

// Or use rx() for inline reactive rendering
function App() {
  return (
    <Suspense fallback={<div>Loading todos...</div>}>
      {rx(({ read }) =>
        read(filteredTodoList$).map(todo => <Todo key={todo.id} todo={todo} />)
      )}
    </Suspense>
  );
}

// Refetch todos
function RefreshButton() {
  return (
    <button onClick={() => todoList$.reset()}>
      Refresh
    </button>
  );
}
```

### Deferred Entity Loading with `ready()`

When building detail pages (e.g., `/article/:id`), you often need to:

1. Wait for a route parameter to be set
2. Fetch data based on that parameter
3. Share the loaded entity across multiple components

The `ready()` method in derived atoms provides an elegant solution for this pattern.

#### The Pattern

```typescript
import { atom, derived, effect, readonly, define } from "atomirx";

const articleModule = define(() => {
  // Current article ID - set from route
  const currentArticleId$ = atom<string | undefined>(undefined);

  // Article cache - normalized storage
  const articleCache$ = atom<Record<string, Article>>({});

  // Current article - uses ready() to wait for both ID and cached data
  const currentArticle$ = derived(({ ready }) => {
    const id = ready(currentArticleId$); // Suspends if undefined
    const article = ready(articleCache$, (cache) => cache[id]); // Suspends if not cached
    return article;
  });

  // Fetch article when ID changes
  effect(({ read }) => {
    const id = read(currentArticleId$);
    if (!id) return;

    // Skip if already cached
    const cache = read(articleCache$);
    if (cache[id]) return;

    // Fetch and cache
    // ─────────────────────────────────────────────────────────────
    // Optional: Track loading/error states in cache for more control
    // type CacheEntry<T> =
    //   | { status: "loading" }
    //   | { status: "error"; error: Error }
    //   | { status: "success"; data: T };
    // const articleCache$ = atom<Record<string, CacheEntry<Article>>>({});
    //
    // articleCache$.set((prev) => ({ ...prev, [id]: { status: "loading" } }));
    // fetch(...)
    //   .then((article) => articleCache$.set((prev) => ({
    //     ...prev, [id]: { status: "success", data: article }
    //   })))
    //   .catch((error) => articleCache$.set((prev) => ({
    //     ...prev, [id]: { status: "error", error }
    //   })));
    // ─────────────────────────────────────────────────────────────
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((article) => {
        articleCache$.set((prev) => ({ ...prev, [id]: article }));
      });
  });

  return {
    ...readonly({ currentArticleId$, currentArticle$ }),

    // ─────────────────────────────────────────────────────────────
    // navigateTo(id) - Navigate to a new article
    // ─────────────────────────────────────────────────────────────
    // Flow:
    // 1. Set currentArticleId$ to new ID
    // 2. currentArticle$ recomputes:
    //    - If cached: ready() succeeds → UI shows article immediately
    //    - If not cached: ready() suspends → UI shows <Skeleton />
    // 3. effect() runs in parallel:
    //    - If cached: early return (no fetch)
    //    - If not cached: fetch → update articleCache$
    // 4. When cache updated, currentArticle$ recomputes → UI shows article
    navigateTo: (id: string) => currentArticleId$.set(id),

    // ─────────────────────────────────────────────────────────────
    // invalidate(id) - Mark an article as stale (soft invalidation)
    // ─────────────────────────────────────────────────────────────
    // Flow:
    // 1. Guard: Skip if id === currentArticleId (don't disrupt current view)
    // 2. Remove article from cache
    // 3. No immediate effect on UI (current article unchanged)
    // 4. Next navigateTo(id) will trigger fresh fetch
    // Use case: Background sync detected article was updated elsewhere
    invalidate: (id: string) => {
      if (id === currentArticleId$.get()) return;
      articleCache$.set((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },

    // ─────────────────────────────────────────────────────────────
    // refresh() - Force refetch current article (hard refresh)
    // ─────────────────────────────────────────────────────────────
    // Flow:
    // 1. Remove current article from cache
    // 2. currentArticle$ recomputes:
    //    - ready() suspends (cache miss) → UI shows <Skeleton />
    // 3. effect() runs:
    //    - Cache miss detected → fetch starts
    // 4. Fetch completes → cache updated → UI shows fresh data
    // Use case: Pull-to-refresh, retry after error
    refresh() {
      articleCache$.set((prev) => {
        const { [currentArticleId$.get()]: _, ...rest } = prev;
        return rest;
      });
    },
  };
});
```

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Route: /article/:id                                        │
│  → navigateTo(id)                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  effect() detects ID change                                 │
│  → Checks cache, fetches if not cached                      │
│  → Updates articleCache$                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  currentArticle$ (derived with ready())                     │
│  → Suspends until ID is set AND article is in cache         │
│  → Returns article when both conditions met                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Components with Suspense                                   │
│  → Show loading fallback while suspended                    │
│  → Render article when ready                                │
└─────────────────────────────────────────────────────────────┘
```

#### Component Usage

```tsx
// Page component - syncs route and provides boundaries
export const ArticlePage = () => {
  const { id } = useParams();
  const { navigateTo } = articleModule();

  useEffect(() => {
    navigateTo(id);
  }, [id]);

  return (
    <ErrorBoundary fallback={<ErrorDialog />}>
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleHeader />
        <ArticleContent />
        <ArticleMeta />
      </Suspense>
    </ErrorBoundary>
  );
};

// Child components - clean, no loading/error handling needed
export const ArticleHeader = () => {
  const { currentArticle$ } = articleModule();
  const article = useSelector(currentArticle$);

  return <h1>{article.title}</h1>;
};

export const ArticleContent = () => {
  const { currentArticle$ } = articleModule();
  const article = useSelector(currentArticle$);

  return <div className="content">{article.body}</div>;
};

export const ArticleMeta = () => {
  const { currentArticle$ } = articleModule();
  const article = useSelector(currentArticle$);

  return (
    <span>
      By {article.author} • {article.date}
    </span>
  );
};
```

#### Benefits

| Benefit                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| **Clean components**     | Child components just read the atom - no loading/error handling  |
| **No prop drilling**     | All components access `currentArticle$` directly from the module |
| **Automatic suspension** | `ready()` handles the "wait for data" logic declaratively        |
| **Centralized fetching** | Effect handles when/how to fetch, components just consume        |
| **Cache management**     | Normalized cache enables invalidation and updates                |

#### When to Use `ready()`

| Use Case             | Example                                          |
| -------------------- | ------------------------------------------------ |
| Route-based entities | `/article/:id`, `/user/:userId`, `/product/:sku` |
| Auth-gated content   | Wait for `currentUser$` before showing dashboard |
| Dependent data       | Wait for parent entity before fetching children  |
| Multi-step forms     | Wait for previous step data before showing next  |

#### Important Notes

- **Only use in `derived()` or `effect()`** - `ready()` suspends computation, which only works in reactive contexts
- **Separate fetching from derivation** - Use `effect()` for side effects (fetching), `derived()` for computing values
- **Read from cache in effect** - Don't read `currentArticle$` in the effect that populates it; read `articleCache$` directly

## Usage Guide

### Atoms: The Foundation

Atoms are the building blocks of atomirx. They hold mutable state and automatically notify subscribers when the value changes.

#### Creating Atoms

```typescript
import { atom } from "atomirx";

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
import { getAtomState, isPending } from "atomirx";

// Direct access (outside reactive context)
console.log(count$.get()); // Current value (T or Promise<T>)

// Check atom state
const state = getAtomState(userData$);
if (state.status === "loading") {
  console.log("Loading...");
} else if (state.status === "error") {
  console.log("Error:", state.error);
} else {
  console.log("User:", state.value);
}

// Quick loading check
console.log(isPending(userData$.get())); // true while Promise is pending
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
console.log("User loaded:", userData$.get());

// Unsubscribe when done
unsubscribe();
```

#### Complete Atom API

**MutableAtom** (created by `atom()`):

| Property/Method | Type         | Description                                        |
| --------------- | ------------ | -------------------------------------------------- |
| `get()`         | `T`          | Current value (may be a Promise for async atoms)   |
| `set(value)`    | `void`       | Update with value, Promise, or updater function    |
| `reset()`       | `void`       | Reset to initial value                             |
| `on(listener)`  | `() => void` | Subscribe to changes, returns unsubscribe function |

**DerivedAtom** (created by `derived()`):

| Property/Method | Type             | Description                                    |
| --------------- | ---------------- | ---------------------------------------------- |
| `get()`         | `Promise<T>`     | Always returns a Promise                       |
| `staleValue`    | `T \| undefined` | Fallback or last resolved value during loading |
| `state()`       | `AtomState<T>`   | Current state (ready/error/loading)            |
| `refresh()`     | `void`           | Re-run the computation                         |
| `on(listener)`  | `() => void`     | Subscribe to changes, returns unsubscribe      |

**AtomState** (returned by `state()` or `getAtomState()`):

```typescript
type AtomState<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown }
  | { status: "loading"; promise: Promise<T> };
```

### Derived State: Computed Values

Derived atoms automatically compute values based on other atoms. They track dependencies at runtime and only recompute when those specific dependencies change.

> **Note:** For error handling in derived selectors, use `safe()` instead of try/catch. See [Error Handling: Use `safe()` Not try/catch](#error-handling-use-safe-not-trycatch).

#### Basic Derived State

```typescript
import { atom, derived } from "atomirx";

const firstName$ = atom("John");
const lastName$ = atom("Doe");

// Derived state with automatic dependency tracking
const fullName$ = derived(({ read }) => {
  return `${read(firstName$)} ${read(lastName$)}`;
});

// Derived atoms always return Promise<T> for .get()
await fullName$.get(); // "John Doe"

// Or use staleValue for synchronous access (after first resolution)
fullName$.staleValue; // "John Doe" (or undefined before first resolution)

// Check state
fullName$.state(); // { status: "ready", value: "John Doe" }

firstName$.set("Jane");
await fullName$.get(); // "Jane Doe"
```

#### Conditional Dependencies

One of atomirx's most powerful features is **conditional dependency tracking**. Dependencies are tracked based on actual runtime access, not static analysis:

```typescript
const showDetails$ = atom(false);
const summary$ = atom("Brief overview");
const details$ = atom("Detailed information...");

const content$ = derived(({ read }) => {
  // Only tracks showDetails$ initially
  if (read(showDetails$)) {
    // details$ becomes a dependency only when showDetails$ is true
    return read(details$);
  }
  return read(summary$);
});

// When showDetails$ is false:
// - Changes to details$ do NOT trigger recomputation
// - Only changes to showDetails$ or summary$ trigger recomputation
```

#### Suspense-Style Getters

The `read()` function follows React Suspense semantics for async atoms:

| Atom State | `read()` Behavior                               |
| ---------- | ----------------------------------------------- |
| Loading    | Throws the Promise (caught by derived/Suspense) |
| Error      | Throws the error                                |
| Ready      | Returns the value                               |

```typescript
const user$ = atom(fetchUser());

const userName$ = derived(({ read }) => {
  // Automatically handles loading/error states
  const user = read(user$);
  return user.name;
});

// Check state
const state = userName$.state();
if (state.status === "loading") {
  console.log("Loading...");
} else if (state.status === "error") {
  console.log("Error:", state.error);
} else {
  console.log("User name:", state.value);
}

// Or use staleValue with a fallback
const userName = derived(({ read }) => read(user$).name, { fallback: "Guest" });
userName.staleValue; // "Guest" during loading, then actual name
```

#### Derived from Multiple Async Sources

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());

const dashboard$ = derived(({ read }) => {
  const user = read(user$); // Suspends if loading
  const posts = read(posts$); // Suspends if loading

  return {
    userName: user.name,
    postCount: posts.length,
  };
});

// Check state
const state = dashboard$.state();
// state.status is "loading" until BOTH user$ and posts$ resolve

// Or use all() for explicit parallel loading
const dashboard2$ = derived(({ all }) => {
  const [user, posts] = all([user$, posts$]);
  return { userName: user.name, postCount: posts.length };
});
```

### Effects: Side Effect Management

Effects run side effects whenever their dependencies change. They use the same reactive context as `derived()`.

> **Note:** For error handling in effects, use `safe()` instead of try/catch. See [Error Handling: Use `safe()` Not try/catch](#error-handling-use-safe-not-trycatch).

#### Basic Effects

```typescript
import { atom, effect } from "atomirx";

const count$ = atom(0);

// Effect runs immediately and on every change
const dispose = effect(({ read }) => {
  console.log("Count is now:", read(count$));
});

count$.set(5); // Logs: "Count is now: 5"

// Clean up when done
dispose();
```

#### Effects with Cleanup

Use `onCleanup()` to register cleanup functions that run before the next execution or on dispose:

```typescript
const interval$ = atom(1000);

const dispose = effect(({ read, onCleanup }) => {
  const ms = read(interval$);
  const id = setInterval(() => console.log("tick"), ms);

  // Cleanup runs before next execution or on dispose
  onCleanup(() => clearInterval(id));
});

interval$.set(500); // Clears old interval, starts new one
dispose(); // Clears interval completely
```

#### Effects with Multiple Dependencies

```typescript
const user$ = atom<User | null>(null);
const settings$ = atom({ notifications: true });

effect(({ read }) => {
  const user = read(user$);
  const settings = read(settings$);

  if (user && settings.notifications) {
    analytics.identify(user.id);
    notifications.subscribe(user.id);
  }
});
```

### Async Patterns

atomirx provides powerful utilities for working with multiple async atoms through the `SelectContext`.

#### `all()` - Wait for All (like Promise.all)

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());
const comments$ = atom(fetchComments());

const dashboard$ = derived(({ all }) => {
  // Suspends until ALL atoms resolve (array-based)
  const [user, posts, comments] = all([user$, posts$, comments$]);

  return { user, posts, comments };
});
```

#### `any()` - First Ready (like Promise.any)

```typescript
const primaryApi$ = atom(fetchFromPrimary());
const fallbackApi$ = atom(fetchFromFallback());

const data$ = derived(({ any }) => {
  // Returns first successfully resolved value (object-based, returns { key, value })
  const result = any({ primary: primaryApi$, fallback: fallbackApi$ });
  return result.value;
});
```

#### `race()` - First Settled (like Promise.race)

```typescript
const cache$ = atom(checkCache());
const api$ = atom(fetchFromApi());

const data$ = derived(({ race }) => {
  // Returns first settled (ready OR error) (object-based, returns { key, value })
  const result = race({ cache: cache$, api: api$ });
  return result.value;
});
```

#### `settled()` - All Results (like Promise.allSettled)

```typescript
const user$ = atom(fetchUser());
const posts$ = atom(fetchPosts());

const results$ = derived(({ settled }) => {
  // Returns status for each atom (array-based)
  const [userResult, postsResult] = settled([user$, posts$]);

  return {
    user: userResult.status === "ready" ? userResult.value : null,
    posts: postsResult.status === "ready" ? postsResult.value : [],
    hasErrors: userResult.status === "error" || postsResult.status === "error",
  };
});
```

#### Async Utility Summary

| Utility     | Input           | Output                   | Behavior                           |
| ----------- | --------------- | ------------------------ | ---------------------------------- |
| `all()`     | Array of atoms  | Array of values          | Suspends until all ready           |
| `any()`     | Record of atoms | `{ key, value }` (first) | First to resolve wins              |
| `race()`    | Record of atoms | `{ key, value }` (first) | First to settle (ready/error) wins |
| `settled()` | Array of atoms  | Array of SettledResult   | Suspends until all settled         |

**SettledResult type:**

```typescript
type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };
```

### Batching Updates

When updating multiple atoms, use `batch()` to combine notifications:

```typescript
import { atom, batch } from "atomirx";

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
import { emitter } from "atomirx";

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
import { define, atom } from "atomirx";

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

### Atom Metadata and Middleware

atomirx supports custom metadata on atoms via the `meta` option. Combined with `onCreateHook`, you can implement cross-cutting concerns like persistence, logging, or validation.

#### Extending AtomMeta with TypeScript

Use TypeScript's module augmentation to add custom properties to `AtomMeta`:

```typescript
// Extend the meta interfaces with your custom properties
declare module "atomirx" {
  // MutableAtomMeta - for atom() specific options
  interface MutableAtomMeta {
    /** Whether the atom should be persisted to localStorage */
    persisted?: boolean;
    /**
     * Custom validation function.
     * Return true to allow the update, false to reject it.
     */
    validate?: (value: unknown) => boolean;
    /** Optional error handler for validation failures */
    onValidationError?: (value: unknown, key?: string) => void;
  }

  // DerivedAtomMeta - for derived() specific options
  interface DerivedAtomMeta {
    /** Custom cache key for memoization */
    cacheKey?: string;
  }

  // AtomMeta - base type, shared by both (key, etc.)
  // interface AtomMeta { ... }
}
```

#### Using onCreateHook for Middleware

The `onCreateHook` fires whenever an atom or module is created. Use the reducer pattern to compose multiple middlewares:

```typescript
import { onCreateHook } from "atomirx";

// Persistence middleware
onCreateHook.override((prev) => (info) => {
  // Call previous middleware first (composition)
  prev?.(info);

  // Only handle mutable atoms with persisted flag
  if (info.type === "mutable" && info.meta?.persisted && info.meta?.key) {
    const storageKey = `my-app-${info.meta.key}`;

    // Restore from localStorage on creation (if not dirty)
    if (!info.atom.dirty()) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          info.atom.set(JSON.parse(stored));
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    // Save to localStorage on every change
    info.atom.on(() => {
      localStorage.setItem(storageKey, JSON.stringify(info.atom.get()));
    });
  }
});
```

#### Creating Persisted Atoms

Now atoms with `persisted: true` automatically sync with localStorage:

```typescript
// This atom will persist across page reloads
const settings$ = atom(
  { theme: "dark", language: "en" },
  { meta: { key: "settings", persisted: true } }
);

// Changes are automatically saved
settings$.set({ theme: "light", language: "en" });

// On next page load, value is restored from localStorage
```

#### Multiple Middleware Example

Compose multiple middlewares using the reducer pattern:

```typescript
// Logging middleware
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  console.log(
    `[atomirx] Created ${info.type}: ${info.meta?.key ?? "anonymous"}`
  );
});

// Validation middleware - wraps set() to validate before applying
onCreateHook.override((prev) => (info) => {
  prev?.(info);

  if (info.type === "mutable" && info.meta?.validate) {
    const validate = info.meta.validate;
    const originalSet = info.atom.set.bind(info.atom);

    // Wrap set() with validation
    info.atom.set = (valueOrReducer) => {
      // Resolve the next value (handle both direct value and reducer)
      const nextValue =
        typeof valueOrReducer === "function"
          ? (valueOrReducer as (prev: unknown) => unknown)(info.atom.get())
          : valueOrReducer;

      // Validate before applying
      if (!validate(nextValue)) {
        console.warn(
          `[atomirx] Validation failed for ${info.meta?.key}`,
          nextValue
        );
        return; // Reject the update
      }

      originalSet(valueOrReducer);
    };
  }
});

// Usage: atom with validation
const age$ = atom(25, {
  meta: {
    key: "age",
    validate: (value) =>
      typeof value === "number" && value >= 0 && value <= 150,
  },
});

age$.set(30); // OK
age$.set(-5); // Rejected: "Validation failed for age"
age$.set(200); // Rejected: "Validation failed for age"
```

> **Note:** This validation approach intercepts `set()` at runtime. For compile-time type safety, use TypeScript's type system. This pattern is useful for runtime constraints like ranges, formats, or business rules that can't be expressed in types.

```typescript
// DevTools middleware
onCreateHook.override((prev) => (info) => {
  prev?.(info);

  if (info.type === "mutable" || info.type === "derived") {
    // Register with your devtools
    window.__ATOMIRX_DEVTOOLS__?.register(info);
  }
});
```

#### Hook Info Types

The `onCreateHook` receives different info objects based on what's being created:

```typescript
// Mutable atom
interface MutableAtomCreateInfo {
  type: "mutable";
  key: string | undefined;
  meta: AtomMeta | undefined;
  atom: MutableAtom<unknown>;
}

// Derived atom
interface DerivedAtomCreateInfo {
  type: "derived";
  key: string | undefined;
  meta: AtomMeta | undefined;
  atom: DerivedAtom<unknown, boolean>;
}

// Module (from define())
interface ModuleCreateInfo {
  type: "module";
  key: string | undefined;
  meta: ModuleMeta | undefined;
  module: unknown;
}
```

## React Integration

atomirx provides first-class React integration through the `atomirx/react` package.

### useSelector Hook

Subscribe to atom values with automatic re-rendering.

> **Note:** For error handling in selectors, use `safe()` instead of try/catch. See [Error Handling: Use `safe()` Not try/catch](#error-handling-use-safe-not-trycatch).

```tsx
import { useSelector } from "atomirx/react";
import { atom } from "atomirx";

const count$ = atom(0);
const user$ = atom<User | null>(null);

function Counter() {
  // Shorthand: pass atom directly
  const count = useSelector(count$);

  // Context selector: compute derived value
  const doubled = useSelector(({ read }) => read(count$) * 2);

  // Multiple atoms
  const display = useSelector(({ read }) => {
    const count = read(count$);
    const user = read(user$);
    return user ? `${user.name}: ${count}` : `Anonymous: ${count}`;
  });

  return <div>{display}</div>;
}
```

#### Custom Equality

```tsx
// Only re-render when specific fields change
const userName = useSelector(
  ({ read }) => read(user$)?.name,
  (prev, next) => prev === next
);
```

#### Why useSelector is Powerful

`useSelector` provides a unified API that replaces multiple hooks from other libraries:

**One hook for all use cases:**

```tsx
// 1. Single atom (shorthand)
const count = useSelector(count$);

// 2. Derived value (selector)
const doubled = useSelector(({ read }) => read(count$) * 2);

// 3. Multiple atoms (all) - array-based
const [user, posts] = useSelector(({ all }) => all([user$, posts$]));

// 4. Loadable mode (state) - no Suspense needed
const userState = useSelector(({ state }) => state(user$));
// { status: "loading" | "ready" | "error", value, error }

// 5. Error handling (safe) - preserves Suspense
const result = useSelector(({ read, safe }) => {
  const [err, data] = safe(() => JSON.parse(read(rawJson$)));
  return err ? { error: err.message } : { data };
});

// 6. First ready (any), race, allSettled
const fastest = useSelector(({ any }) => any({ cache: cache$, api: api$ }));
const results = useSelector(({ settled }) => settled([a$, b$, c$]));
```

**Comparison with other libraries:**

| Use Case            | atomirx                                    | Jotai                          | Recoil                          | Zustand                    |
| ------------------- | ------------------------------------------ | ------------------------------ | ------------------------------- | -------------------------- |
| Single atom         | `useSelector(atom$)`                       | `useAtomValue(atom)`           | `useRecoilValue(atom)`          | `useStore(s => s.value)`   |
| Derived value       | `useSelector(({ read }) => ...)`           | `useAtomValue(derivedAtom)`    | `useRecoilValue(selector)`      | `useStore(s => derive(s))` |
| Multiple atoms      | `useSelector(({ all }) => all([a$, b$]))`  | Multiple `useAtomValue` calls  | Multiple `useRecoilValue` calls | Multiple selectors         |
| Suspense mode       | Built-in (default)                         | Built-in                       | Built-in                        | Manual                     |
| Loadable mode       | `useSelector(({ state }) => state(atom$))` | `useAtomValue(loadable(atom))` | `useRecoilValueLoadable(atom)`  | Manual                     |
| Safe error handling | `safe()` in selector                       | Manual try/catch               | Manual try/catch                | Manual                     |
| Custom equality     | 2nd parameter                              | `selectAtom`                   | N/A                             | 2nd parameter              |

**Key advantages:**

1. **Single unified hook** - No need to choose between `useAtomValue`, `useAtomValueLoadable`, etc.
2. **Composable selectors** - Combine multiple atoms, derive values, handle errors in one selector
3. **Flexible async modes** - Switch between Suspense and loadable without changing atoms
4. **Built-in utilities** - `all()`, `any()`, `race()`, `settled()`, `safe()`, `state()` available in selector
5. **Type-safe** - Full TypeScript inference across all patterns

**Boilerplate comparison - Loading multiple async atoms:**

```tsx
// ❌ Jotai - Multiple hooks + loadable wrapper
const userLoadable = useAtomValue(loadable(userAtom));
const postsLoadable = useAtomValue(loadable(postsAtom));
const isLoading =
  userLoadable.state === "loading" || postsLoadable.state === "loading";
const user = userLoadable.state === "hasData" ? userLoadable.data : null;
const posts = postsLoadable.state === "hasData" ? postsLoadable.data : [];

// ❌ Recoil - Multiple hooks
const userLoadable = useRecoilValueLoadable(userAtom);
const postsLoadable = useRecoilValueLoadable(postsAtom);
const isLoading =
  userLoadable.state === "loading" || postsLoadable.state === "loading";
const user = userLoadable.state === "hasValue" ? userLoadable.contents : null;
const posts = postsLoadable.state === "hasValue" ? postsLoadable.contents : [];

// ✅ atomirx - One hook, one selector
const { isLoading, user, posts } = useSelector(({ state }) => {
  const userState = state(user$);
  const postsState = state(posts$);
  return {
    isLoading:
      userState.status === "loading" || postsState.status === "loading",
    user: userState.value,
    posts: postsState.value ?? [],
  };
});
```

### Reactive Components with rx

The `rx()` function creates inline reactive components for fine-grained updates.

> **Note:** For error handling in selectors, use `safe()` instead of try/catch. See [Error Handling: Use `safe()` Not try/catch](#error-handling-use-safe-not-trycatch).

```tsx
import { rx } from "atomirx/react";

function Dashboard() {
  return (
    <div>
      {/* Only this span re-renders when count$ changes */}
      <span>Count: {rx(count$)}</span>

      {/* Derived value */}
      <span>Doubled: {rx(({ read }) => read(count$) * 2)}</span>

      {/* Complex rendering */}
      {rx(({ read }) => {
        const user = read(user$);
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

#### Inline Loading and Error Handling

`rx()` supports optional `loading` and `error` handlers for inline async state handling without Suspense/ErrorBoundary:

```tsx
function Dashboard() {
  return (
    <div>
      {/* With loading handler - no Suspense needed */}
      {rx(userData$, {
        loading: () => <Spinner />,
      })}

      {/* With error handler - no ErrorBoundary needed */}
      {rx(userData$, {
        error: ({ error }) => <Alert>{String(error)}</Alert>,
      })}

      {/* Both handlers - fully self-contained */}
      {rx(userData$, {
        loading: () => <UserSkeleton />,
        error: ({ error }) => <UserError error={error} />,
      })}

      {/* With selector and options */}
      {rx(({ read }) => read(posts$).slice(0, 5), {
        loading: () => <PostsSkeleton count={5} />,
        error: ({ error }) => <PostsError onRetry={() => posts$.refresh()} />,
        equals: "shallow",
      })}
    </div>
  );
}
```

**When to use each approach:**

| Approach                      | Use When                                               |
| ----------------------------- | ------------------------------------------------------ |
| `rx()` with Suspense          | Shared loading UI across multiple components           |
| `rx()` with `loading`/`error` | Self-contained component with custom inline UI         |
| `rx()` with `state()`         | Complex conditional rendering based on multiple states |

#### Selector Memoization with `deps`

By default, function selectors are recreated on every render. Use `deps` to control memoization:

```tsx
function Component({ multiplier }: { multiplier: number }) {
  return (
    <div>
      {/* No memoization (default) - selector recreated every render */}
      {rx(({ read }) => read(count$) * 2)}
      {/* Stable forever - selector never recreated */}
      {rx(({ read }) => read(count$) * 2, { deps: [] })}
      {/* Recreate when multiplier changes */}
      {rx(({ read }) => read(count$) * multiplier, { deps: [multiplier] })}
      {/* Atom shorthand is always stable by reference */}
      {rx(count$)} {/* No deps needed */}
    </div>
  );
}
```

**Memoization behavior:**

| Input                           | `deps`      | Behavior                          |
| ------------------------------- | ----------- | --------------------------------- |
| Atom (`rx(atom$)`)              | (ignored)   | Always memoized by atom reference |
| Function (`rx(({ read }) => …`) | `undefined` | No memoization (recreated always) |
| Function                        | `[]`        | Stable forever (never recreated)  |
| Function                        | `[a, b]`    | Recreated when deps change        |

### Async Actions with useAction

Handle async operations with built-in loading/error states:

```tsx
import { useAction } from "atomirx/react";

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
  { lazy: false, deps: [userId] }
);

// Re-execute when atom changes
const fetchPosts = useAction(
  async ({ signal }) => fetchPostsApi(filter$.get(), { signal }),
  { lazy: false, deps: [filter$] }
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
import { useStable } from "atomirx/react";

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

atomirx is designed to work seamlessly with React Suspense:

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";

const user$ = atom(fetchUser());

function UserProfile() {
  // Suspends until user$ resolves
  const user = useSelector(user$);
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
  options?: { fallback?: T }
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
  selector: (...getters: GetterTuple<S>) => T
): Atom<T>;
```

#### `effect(fn, options?)`

Creates a side effect that runs when dependencies change.

```typescript
interface EffectContext extends SelectContext {
  onCleanup: (cleanup: VoidFunction) => void;
  onError: (handler: (error: unknown) => void) => void;
}

function effect(
  fn: (context: EffectContext) => void,
  options?: { onError?: (error: Error) => void }
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
  options?: { eager?: boolean }
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

Available in `derived()`, `effect()`, `useSelector()`, and `rx()`:

| Method    | Signature                                 | Description                                          |
| --------- | ----------------------------------------- | ---------------------------------------------------- |
| `read`    | `<T>(atom: Atom<T>) => Awaited<T>`        | Read atom value with dependency tracking             |
| `ready`   | `<T>(atom: Atom<T>) => NonNullable<T>`    | Wait for non-null value (only in derived/effect)     |
| `all`     | `(atoms[]) => values[]`                   | Wait for all atoms (Promise.all semantics)           |
| `any`     | `({ key: atom }) => { key, value }`       | First ready value (Promise.any semantics)            |
| `race`    | `({ key: atom }) => { key, value }`       | First settled value (Promise.race semantics)         |
| `settled` | `(atoms[]) => SettledResult[]`            | All results (Promise.allSettled semantics)           |
| `state`   | `(atom \| selector) => SelectStateResult` | Get async state without throwing (equality-friendly) |
| `safe`    | `(fn) => [error, result]`                 | Catch errors, preserve Suspense                      |

**Behavior:**

- `read()`: Returns value if ready, throws error if error, throws Promise if loading
- `ready()`: Returns non-null value, suspends if null/undefined (only in derived/effect)
- `all()`: Suspends until all atoms are ready, throws on first error
- `any()`: Returns first ready value, throws AggregateError if all error
- `race()`: Returns first settled (ready or error)
- `settled()`: Returns `{ status: "ready", value }` or `{ status: "error", error }` for each atom
- `state()`: Returns `AtomState<T>` without throwing - useful for inline state handling
- `safe()`: Catches errors but re-throws Promises to preserve Suspense

#### `state()` - Get Async State Without Throwing

The `state()` method returns an `AtomState<T>` object instead of throwing. This is useful when you want to handle loading/error states inline without Suspense.

**Available at every level** - derived, rx, useSelector, effect:

```typescript
// 1. In derived() - Build dashboard with partial loading
const dashboard$ = derived(({ state }) => {
  const userState = state(user$);
  const postsState = state(posts$);

  return {
    user: userState.status === 'ready' ? userState.value : null,
    posts: postsState.status === 'ready' ? postsState.value : [],
    isLoading: userState.status === 'loading' || postsState.status === 'loading',
  };
});

// 2. In rx() - Inline loading/error UI
{rx(({ state }) => {
  const dataState = state(data$);

  if (dataState.status === 'loading') return <Spinner />;
  if (dataState.status === 'error') return <Error error={dataState.error} />;
  return <Content data={dataState.value} />;
})}

// 3. In useSelector() - Get state object in component
function Component() {
  const dataState = useSelector(({ state }) => state(asyncAtom$));

  if (dataState.status === 'loading') return <Spinner />;
  // ...
}

// 4. In effect() - React to state changes
effect(({ state }) => {
  const connState = state(connection$);

  if (connState.status === 'ready') {
    console.log('Connected:', connState.value);
  }
});

// 5. With combined operations
const allData$ = derived(({ state, all }) => {
  const result = state(() => all([a$, b$, c$]));

  if (result.status === 'loading') return { loading: true };
  if (result.status === 'error') return { error: result.error };
  return { data: result.value };
});
```

**`state()` vs `read()`:**

| Method    | On Loading                                                          | On Error                                               | On Ready                                               |
| --------- | ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `read()`  | Throws Promise (Suspense)                                           | Throws Error                                           | Returns value                                          |
| `state()` | Returns `{ status: "loading", value: undefined, error: undefined }` | Returns `{ status: "error", value: undefined, error }` | Returns `{ status: "ready", value, error: undefined }` |

**Note:** `state()` returns `SelectStateResult<T>` with all properties always present (`status`, `value`, `error`). This enables easy destructuring and equality comparisons (no promise reference issues).

### React API

#### `useSelector`

```typescript
// Shorthand
function useSelector<T>(atom: Atom<T>): T;

// Context selector
function useSelector<T>(
  selector: (context: SelectContext) => T,
  equals?: (prev: T, next: T) => boolean
): T;
```

#### `rx`

```typescript
// Shorthand
function rx<T>(atom: Atom<T>): ReactNode;
function rx<T>(atom: Atom<T>, options?: RxOptions<T>): ReactNode;

// Context selector
function rx<T>(selector: (context: SelectContext) => T): ReactNode;
function rx<T>(
  selector: (context: SelectContext) => T,
  options?: Equality<T> | RxOptions<T>
): ReactNode;

interface RxOptions<T> {
  /** Equality function for value comparison */
  equals?: Equality<T>;
  /** Render function for loading state (wraps with Suspense) */
  loading?: () => ReactNode;
  /** Render function for error state (wraps with ErrorBoundary) */
  error?: (props: { error: unknown }) => ReactNode;
  /** Dependencies for selector memoization */
  deps?: unknown[];
}
```

**Selector memoization with `deps`:**

```tsx
// No memoization (default) - selector recreated every render
rx(({ read }) => read(count$) * multiplier);

// Stable forever - never recreated
rx(({ read }) => read(count$) * 2, { deps: [] });

// Recreate when multiplier changes
rx(({ read }) => read(count$) * multiplier, { deps: [multiplier] });

// Atom shorthand is always stable (deps ignored)
rx(count$);
```

**With inline loading/error handlers:**

```tsx
// Loading handler only
{
  rx(asyncAtom$, {
    loading: () => <Spinner />,
  });
}

// Error handler only
{
  rx(asyncAtom$, {
    error: ({ error }) => <Alert>{String(error)}</Alert>,
  });
}

// Both handlers
{
  rx(asyncAtom$, {
    loading: () => <Skeleton />,
    error: ({ error }) => <ErrorMessage error={error} />,
  });
}

// With selector and options
{
  rx(({ read }) => read(user$).profile, {
    loading: () => <ProfileSkeleton />,
    error: ({ error }) => <ProfileError error={error} />,
    equals: "shallow",
  });
}
```

**Behavior with options:**

| Options              | Loading State      | Error State      | Ready State  |
| -------------------- | ------------------ | ---------------- | ------------ |
| No options           | Suspense           | ErrorBoundary    | Render value |
| `{ loading }`        | Render `loading()` | ErrorBoundary    | Render value |
| `{ error }`          | Suspense           | Render `error()` | Render value |
| `{ loading, error }` | Render `loading()` | Render `error()` | Render value |

#### `useAction`

```typescript
function useAction<T, Args extends any[]>(
  action: (context: { signal: AbortSignal }, ...args: Args) => Promise<T>,
  options?: {
    lazy?: boolean;
    deps?: (Atom<any> | any)[];
  }
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
  equals?: (prev: T[keyof T], next: T[keyof T]) => boolean
): T;
```

## TypeScript Integration

atomirx is written in TypeScript and provides full type inference:

```typescript
import { atom, derived } from "atomirx";

// Types are automatically inferred
const count$ = atom(0); // MutableAtom<number>
const name$ = atom("John"); // MutableAtom<string>
const doubled$ = derived(({ read }) => read(count$) * 2); // Atom<number>

// Explicit typing when needed
interface User {
  id: string;
  name: string;
  email: string;
}

const user$ = atom<User | null>(null); // MutableAtom<User | null>
const userData$ = atom<User>(fetchUser()); // MutableAtom<User>

// Type-safe selectors
const userName$ = derived(({ read }) => {
  const user = read(user$);
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

| Feature              | atomirx     | Redux Toolkit | Zustand | Jotai       | Recoil   |
| -------------------- | ----------- | ------------- | ------- | ----------- | -------- |
| Bundle size          | ~3KB        | ~12KB         | ~3KB    | ~8KB        | ~20KB    |
| Boilerplate          | Minimal     | Low           | Minimal | Minimal     | Medium   |
| TypeScript           | First-class | First-class   | Good    | First-class | Good     |
| Async support        | Built-in    | RTK Query     | Manual  | Built-in    | Built-in |
| Fine-grained updates | Yes         | No            | Partial | Yes         | Yes      |
| Suspense support     | Native      | No            | No      | Yes         | Yes      |
| DevTools             | Planned     | Yes           | Yes     | Yes         | Yes      |
| Learning curve       | Low         | Medium        | Low     | Low         | Medium   |

### When to Use atomirx

**Choose atomirx when you want:**

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

- [GitHub Issues](https://github.com/linq2js/atomirx/issues) - Bug reports and feature requests
- [Discussions](https://github.com/linq2js/atomirx/discussions) - Questions and community support

## License

MIT License

Copyright (c) atomirx contributors

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
