<div align="center">

# atomirx

### Reactive State That Just Works

[![npm](https://img.shields.io/npm/v/atomirx.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/atomirx)
[![bundle](https://img.shields.io/bundlephobia/minzip/atomirx?style=flat-square&color=green)](https://bundlephobia.com/package/atomirx)
[![typescript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)

**Atoms** · **Derived** · **Effects** · **Suspense** · **React**

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

| Feature              | atomirx                      |
| -------------------- | ---------------------------- |
| Simple atoms         | `atom(0)`                    |
| Computed values      | `derived(({ read }) => ...)` |
| Async first-class    | Built-in Suspense            |
| Side effects         | `effect(({ read }) => ...)`  |
| Fine-grained updates | `{rx(atom$)}`                |
| TypeScript           | Full inference               |
| Bundle size          | Tiny                         |

---

## Install

```bash
npm install atomirx
```

---

## The Basics

### Atoms

Reactive state containers - the foundation of everything.

```ts
const count$ = atom(0);

count$.get();              // Read current value
count$.set(5);             // Set new value
count$.set(n => n + 1);    // Update with reducer
count$.on(() => { ... });  // Subscribe to changes
```

### Derived

Computed values that auto-update when dependencies change.

```ts
// Automatically recomputes when firstName$ or lastName$ changes
const fullName$ = derived(
  ({ read }) => `${read(firstName$)} ${read(lastName$)}`
);

await fullName$.get(); // "John Doe"
```

### Effects

Side effects that run when dependencies change.

```ts
effect(({ read, onCleanup }) => {
  const count = read(count$); // Subscribe to count$ changes
  console.log("Count changed:", count);

  // Cleanup runs before each re-run and on dispose
  onCleanup(() => console.log("Cleanup"));
});
```

---

## React

### useSelector

Subscribe to atoms in React components.

```tsx
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

## Modules

Encapsulate state and actions with lazy initialization.

```ts
const counterModule = define(() => {
  const count$ = atom(0);

  return {
    count$: readonly(count$), // Expose read-only
    increment: () => count$.set((c) => c + 1), // Expose actions
  };
});

// Lazy - created on first call
const { count$, increment } = counterModule();
```

---

## Batching

Combine multiple updates into a single notification.

```ts
batch(() => {
  firstName$.set("John");
  lastName$.set("Doe");
}); // Subscribers notified once, not twice
```

---

## Pools

Parameterized atoms with automatic garbage collection.

```ts
// Create a pool - atoms are created lazily per params
const userPool = pool(
  (id: string) => fetchUser(id), // Factory function
  { gcTime: 60_000 } // Auto-cleanup after 60s of inactivity
);

// Access pool atoms via select context - never store references
derived(({ read, from }) => {
  const user$ = from(userPool, "user-123"); // Get atom for this id
  return read(user$); // Read its value
});
```

### Design Philosophy

Unlike other libraries where you might store atom references in variables:

```ts
// ❌ Other libraries - orphan atoms can leak memory
const userAtom = userFamily("user-123");
someMap.set("cached", userAtom); // Orphan reference!
```

atomirx enforces access through select context only:

```ts
// ✅ atomirx - atoms only accessible in reactive context
derived(({ read, from }) => {
  const user$ = from(userPool, "user-123");
  return read(user$);
});

// ScopedAtom throws if accessed directly
const virtual = from(userPool, "user-123");
virtual.get(); // ❌ Throws: use read(virtual) instead
virtual.on(() => {}); // ❌ Throws: use derived/effect instead
```

This prevents:

- **Memory leaks** from stale atom references
- **Orphan atoms** that bypass garbage collection
- **Inconsistent state** from multiple references to same entity

---

## Links

- [GitHub](https://github.com/linq2js/atomirx) - Source code & issues
- [Documentation](https://github.com/linq2js/atomirx/tree/main/packages/atomirx/docs) - Full docs
- [Changelog](https://github.com/linq2js/atomirx/releases) - Release notes

---

<div align="center">

**MIT License**

</div>
