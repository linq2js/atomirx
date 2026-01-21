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
  const count = useSelector(count$);
  return (
    <button onClick={() => count$.set((c) => c + 1)}>
      {count} × 2 = {useSelector(doubled$)}
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

```ts
const count$ = atom(0);

count$.get();              // 0
count$.set(5);             // set to 5
count$.set(n => n + 1);    // increment
count$.on(() => { ... });  // subscribe
```

### Derived

```ts
const fullName$ = derived(
  ({ read }) => `${read(firstName$)} ${read(lastName$)}`
);

await fullName$.get(); // "John Doe"
```

### Effects

```ts
effect(({ read, onCleanup }) => {
  const count = read(count$); // Read synchronously, subscribes to changes
  console.log("Count changed:", count);
  onCleanup(() => console.log("Cleanup before next run"));
});
```

---

## React

### useSelector

```tsx
function Counter() {
  const count = useSelector(count$);
  const doubled = useSelector(({ read }) => read(count$) * 2);
  return (
    <span>
      {count} / {doubled}
    </span>
  );
}
```

### rx - Inline Reactive

```tsx
function App() {
  return (
    <div>
      Count: {rx(count$)}
      Double: {rx(({ read }) => read(count$) * 2)}
    </div>
  );
}
```

---

## Async Atoms

```tsx
const user$ = atom(fetchUser());

function Profile() {
  const user = useSelector(user$); // Suspends until loaded
  return <h1>{user.name}</h1>;
}

// Wrap with Suspense
<Suspense fallback={<Loading />}>
  <Profile />
</Suspense>;
```

### Multiple Async

```ts
derived(({ all }) => {
  const [user, posts] = all(user$, posts$);
  return { user, posts };
});
```

---

## Modules

```ts
const counterModule = define(() => {
  const count$ = atom(0);
  return {
    count$: readonly(count$),
    increment: () => count$.set((c) => c + 1),
  };
});

const { count$, increment } = counterModule();
```

---

## Batching

```ts
batch(() => {
  firstName$.set("John");
  lastName$.set("Doe");
}); // Single notification
```

---

## Links

- [GitHub](https://github.com/linq2js/atomirx) - Source code & issues
- [Documentation](https://github.com/linq2js/atomirx/tree/main/packages/atomirx/docs) - Full docs
- [Changelog](https://github.com/linq2js/atomirx/releases) - Release notes

---

<div align="center">

**MIT License**

</div>
