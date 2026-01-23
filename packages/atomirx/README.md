<div align="center">

# atomirx

### Reactive State That Just Works

[![npm](https://img.shields.io/npm/v/atomirx.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/atomirx)
[![bundle](https://img.shields.io/bundlephobia/minzip/atomirx?style=flat-square&color=green)](https://bundlephobia.com/package/atomirx)
[![typescript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)

**Atoms** · **Derived** · **Effects** · **Suspense** · **DevTools**

</div>

---

```tsx
import { atom, derived } from "atomirx";
import { useSelector } from "atomirx/react";

const count$ = atom(0);
const doubled$ = derived(({ read }) => read(count$) * 2);

function App() {
  // Read multiple atoms in one selector = one subscription, one re-render
  const { count, doubled } = useSelector(({ read }) => ({
    count: read(count$),
    doubled: read(doubled$),
  }));

  return (
    <button onClick={() => count$.set((c) => c + 1)}>
      {count} × 2 = {doubled}
    </button>
  );
}
```

---

## Why atomirx?

| Feature               | atomirx                      | Others (Recoil/Jotai/etc)       |
| --------------------- | ---------------------------- | ------------------------------- |
| **Philosophy**        | **Mutable & Synchronous**    | often Immutable or Async-forced |
| **Simple atoms**      | `atom(0)`                    | `atom(0)`                       |
| **Computed values**   | `derived(({ read }) => ...)` | `atom((get) => ...)`            |
| **Async first-class** | **Built-in Suspense**        | Plugin / Add-on                 |
| **Side effects**      | `effect(({ read }) => ...)`  | often `useEffect`               |
| **Leak-free Pools**   | **Yes (Auto GC)**            | Manual management               |
| **DevTools**          | **Zero-config**              | Additional setup                |
| **Bundle size**       | **Tiny**                     | Varies                          |

---

## Install

<div align="center">

| Package Manager | Command               |
| :-------------- | :-------------------- |
| **npm**         | `npm install atomirx` |
| **pnpm**        | `pnpm add atomirx`    |
| **yarn**        | `yarn add atomirx`    |
| **bun**         | `bun add atomirx`     |

</div>

---

## The Basics

### Atoms

Reactive state containers - the foundation of everything.

```ts
import { atom } from "atomirx";

const count$ = atom(0);

count$.get();              // Read current value
count$.set(5);             // Set new value
count$.set(n => n + 1);    // Update with reducer
count$.on(() => { ... });  // Subscribe to changes
```

### Derived

Computed values that auto-update when dependencies change.

```ts
import { atom, derived } from "atomirx";

// Automatically recomputes when firstName$ or lastName$ changes
const fullName$ = derived(
  ({ read }) => `${read(firstName$)} ${read(lastName$)}`,
);

await fullName$.get(); // "John Doe"
```

### Effects

Side effects that run when dependencies change.

```ts
import { effect } from "atomirx";

effect(({ read, onCleanup }) => {
  const config = read(config$); // Subscribe to config changes

  // Set up connection based on reactive config
  const socket = connectToSocket(config.url);
  console.log("Connected to", config.url);

  // Cleanup runs before next run and on dispose
  onCleanup(() => {
    socket.disconnect();
    console.log("Disconnected");
  });
});
```

---

## React

### useSelector

Subscribe to atoms in React components.

```tsx
import { useSelector } from "atomirx/react";

function Counter() {
  // Single atom - component re-renders when count$ changes
  const count = useSelector(count$);

  // Selector function - derive values inline
  const doubled = useSelector(({ read }) => read(count$) * 2);

  return (
    <span>
      {count} / {doubled}
    </span>
  );
}
```

### rx - Inline Reactive

Fine-grained updates without re-rendering the parent component.

```tsx
import { rx } from "atomirx/react";

function App() {
  return (
    <div>
      {/* Only this span re-renders when count$ changes */}
      Count: {rx(count$)}
      Double: {rx(({ read }) => read(count$) * 2)}
    </div>
  );
}
```

---

## Async Atoms

First-class async support with React Suspense.

```tsx
// Atom holds a Promise - Suspense handles loading state
const user$ = atom(fetchUser());

function Profile() {
  const user = useSelector(user$); // Suspends until resolved
  return <h1>{user.name}</h1>;
}

// Wrap with Suspense for loading fallback
<Suspense fallback={<Loading />}>
  <Profile />
</Suspense>;
```

### Multiple Async

Wait for multiple atoms with `all()`.

```ts
derived(({ read, all }) => {
  // Waits for both to resolve (like Promise.all)
  const [user, posts] = all([user$, posts$]);
  return { user, posts };
});
```

---

## Pools (Memory-Safe Families)

Parameterized atoms with automatic garbage collection.

**Problem:** Standard "atom families" (atoms created per ID) often leak memory because they leave orphan atoms behind when no longer needed.

**Solution:** `atomirx` Pools automatically garbage collect entries that haven't been used for a specific time (`gcTime`).

```ts
import { pool } from "atomirx";

// Create a pool - atoms are created lazily per params
const userPool = pool(
  (id: string) => fetchUser(id), // Factory function
  { gcTime: 60_000 }, // Auto-cleanup after 60s of inactivity
);
```

### Usage in Components

Use the `from` helper in `useSelector` (or `derived`/`effect`) to safely access pool atoms.

```tsx
function UserCard({ id }) {
  // ✅ Safe: "from" ensures the atom is marked as used
  const user = useSelector(({ read, from }) => {
    const user$ = from(userPool, id);
    return read(user$);
  });

  return <div>{user.name}</div>;
}
```

---

## DevTools

Atomirx comes with a powerful DevTools suite for debugging.

### 1. Setup (App Entry)

Initialize the devtools registry in your app's entry point (e.g., `main.tsx` or `index.ts`).

```ts
import { setupDevtools } from "atomirx/devtools";

// Enable devtools tracking
if (process.env.NODE_ENV === "development") {
  setupDevtools();
}
```

### 2. React UI Component

Add the `<DevToolsPanel />` to your root component.

```tsx
import { DevToolsPanel } from "atomirx/react-devtools";

function App() {
  return (
    <>
      <YourApp />

      {/* Renders a floating dockable panel */}
      {process.env.NODE_ENV === "development" && (
        <DevToolsPanel defaultPosition="bottom-right" />
      )}
    </>
  );
}
```

---

## API Reference

### Core (`atomirx`)

- `atom(initialValue, options?)`: Create a mutable atom.
- `derived(calculator, options?)`: Create a computed atom.
- `effect(runner, options?)`: Run side effects.
- `pool(factory, options)`: Create a garbage-collected atom pool.
- `batch(fn)`: Batch multiple updates.

### React (`atomirx/react`)

- `useSelector(atom | selector)`: Subscribe to state.
- `rx(atom | selector)`: Renderless component for fine-grained updates.

### Select Context (inside `derived`, `effect`, `useSelector`)

- `read(atom)`: Get value and subscribe.
- `from(pool, params)`: Get atom from pool safely.
- `all([atoms])`: Wait for all promises.
- `race({ key: atom })`: Race promises.
- `state(atom)`: Get `{ status, value, error }` without suspending.

---

## Links

- [GitHub](https://github.com/linq2js/atomirx) - Source code & issues
- [Changelog](https://github.com/linq2js/atomirx/releases) - Release notes

---

<div align="center">

**MIT License**

</div>
