# Pool Patterns - Parameterized State with Automatic GC

A `pool` is a collection of atoms indexed by params with automatic garbage collection.
Similar to `atomFamily` in Jotai/Recoil, but with built-in GC and memory-safe ScopedAtom pattern.

## Overview

| Feature              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| **Auto GC**          | Entries are removed after `gcTime` of inactivity          |
| **Promise-aware GC** | GC pauses while value is a pending Promise                |
| **ScopedAtom**       | Prevents memory leaks from stale atom references          |
| **Value API**        | Public API works with values, not atoms                   |
| **Reactive API**     | Use `from(pool, params)` in derived/effect for reactivity |

## Creating a Pool

```typescript
import { pool } from "atomirx";

// Basic pool with object params
const userPool = pool((params: { id: string }) => fetchUser(params.id), {
  gcTime: 60_000,
  meta: { key: "users" },
});

// Pool with primitive params
const articlePool = pool((id: string) => fetchArticle(id), {
  gcTime: 300_000,
  meta: { key: "articles" },
});

// Pool with context (signal for abort, onCleanup for cleanup)
const dataPool = pool(
  (params: { id: string }, context) => {
    const controller = new AbortController();
    context.onCleanup(() => controller.abort());
    return fetchData(params.id, { signal: controller.signal });
  },
  { gcTime: 60_000 }
);
```

## PoolOptions

```typescript
interface PoolOptions<P> {
  /** Time in ms before unused entry is GC'd (required) */
  gcTime: number;

  /** Equality for params comparison (default: "shallow") */
  equals?: Equality<P>;

  /** Metadata for debugging */
  meta?: { key?: string };
}
```

## Public API (Value-based)

The public API works with values directly, not atoms:

```typescript
const userPool = pool((id: string) => ({ name: "", email: "" }), { gcTime: 60_000 });

// Get current value (creates entry if not exists)
const user = userPool.get("user-1");

// Set value (creates entry if not exists)
userPool.set("user-1", { name: "John", email: "john@example.com" });
userPool.set("user-1", prev => ({ ...prev, name: "Jane" })); // Reducer

// Check existence
if (userPool.has("user-1")) { ... }

// Remove entry (triggers onRemove listeners)
userPool.remove("user-1");

// Clear all entries
userPool.clear();

// Iterate all entries
userPool.forEach((value, params) => {
  console.log(`${params}: ${value.name}`);
});

// Subscribe to value changes (any entry)
const unsub = userPool.onChange((params, value) => {
  console.log(`Changed: ${params}`, value);
});

// Subscribe to removals
const unsub2 = userPool.onRemove((params, value) => {
  console.log(`Removed: ${params}`, value);
});
```

## Reactive API (via SelectContext.from())

In `derived`, `effect`, or `useSelector`, use `from()` to get a `ScopedAtom`:

```typescript
// In derived
const userPosts$ = derived(({ read, from }) => {
  const user$ = from(userPool, "user-1"); // ScopedAtom<User>
  return read(user$).posts;
});

// In effect
effect(({ read, from }) => {
  const user$ = from(userPool, currentUserId);
  console.log("User changed:", read(user$));
});

// In useSelector
const user = useSelector(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$);
});
```

## ScopedAtom Pattern (CRITICAL)

`ScopedAtom` is a temporary wrapper that:

1. **ONLY** exists during the select context execution
2. **THROWS** if accessed outside context (prevents memory leaks)
3. **MUST** be used with `read()`, **NEVER** with `.get()`

```typescript
// ❌ FORBIDDEN: Can't access ScopedAtom directly
derived(({ from }) => {
  const user$ = from(userPool, "user-1");
  return user$.get(); // THROWS error!
});

// ❌ FORBIDDEN: Can't store ScopedAtom
let cached: ScopedAtom<User>;
derived(({ from }) => {
  cached = from(userPool, "user-1"); // Works here...
});
// cached._getAtom(); // THROWS after context ends!

// ✅ REQUIRED: Use read() with ScopedAtom
derived(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$); // Correct!
});
```

## GC Behavior

The GC timer resets on:

- Entry creation
- Value change
- Access (get/set)

GC is paused while the entry's value is a pending Promise:

```typescript
const asyncPool = pool(
  (id: string) => fetchData(id), // Returns Promise
  { gcTime: 5000 }
);

asyncPool.get("1"); // GC timer starts AFTER Promise resolves
```

## Params Equality

Default equality is `"shallow"` - property order doesn't matter:

```typescript
const pool1 = pool((p: { a: number; b: number }) => p.a + p.b, {
  gcTime: 60_000,
});

pool1.get({ a: 1, b: 2 }); // Creates entry
pool1.get({ b: 2, a: 1 }); // Same entry (shallow equal)

// Custom equality
const pool2 = pool(
  (p: { id: string; version?: number }) => fetchData(p.id, p.version),
  {
    gcTime: 60_000,
    equals: (a, b) => a.id === b.id, // Only compare by id
  }
);
```

## Common Patterns

### Entity Cache

```typescript
const userCache = pool(
  async (id: string) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  },
  { gcTime: 300_000, meta: { key: "userCache" } }
);

// Usage in component
const user = useSelector(({ read, from }) => read(from(userCache, userId)));
```

### Form State per Entity

```typescript
interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  dirty: boolean;
}

const formPool = pool(
  (entityId: string): FormState => ({
    values: {},
    errors: {},
    dirty: false,
  }),
  { gcTime: 600_000, meta: { key: "forms" } }
);

// Update form
formPool.set(entityId, (prev) => ({
  ...prev,
  values: { ...prev.values, [field]: value },
  dirty: true,
}));
```

### Optimistic Updates

```typescript
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000 });

async function updateUserName(id: string, name: string) {
  // Optimistic update
  userPool.set(id, (prev) => ({ ...prev, name }));

  try {
    await api.updateUser(id, { name });
  } catch (error) {
    // Rollback on error
    const fresh = await fetchUser(id);
    userPool.set(id, fresh);
    throw error;
  }
}
```

### Derived from Pool

```typescript
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000 });
const currentUserId$ = atom<string | null>(null);

// Derived that depends on pool entry
const currentUserPosts$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$); // Wait for ID
  const user$ = from(userPool, userId);
  return read(user$).posts;
});
```

### Multiple Pool Dependencies

```typescript
const userPool = pool((id: string) => fetchUser(id), { gcTime: 60_000 });
const postsPool = pool((userId: string) => fetchPosts(userId), {
  gcTime: 60_000,
});

const userDashboard$ = derived(({ read, from, all }) => {
  const userId = "user-1";

  const user$ = from(userPool, userId);
  const posts$ = from(postsPool, userId);

  const [user, posts] = all([user$, posts$]);

  return { user, posts };
});
```

## Pool vs Manual Map

| Feature           | pool()                      | Manual Map<string, Atom>     |
| ----------------- | --------------------------- | ---------------------------- |
| **GC**            | Automatic with `gcTime`     | Manual cleanup required      |
| **Memory safety** | ScopedAtom prevents leaks   | Easy to leak references      |
| **Promise-aware** | GC waits for pending        | Must handle manually         |
| **Event hooks**   | `onChange`, `onRemove`      | Must implement manually      |
| **Reactive**      | Works with `from()` context | Manual subscription handling |
| **Testing**       | Easy to mock via `define()` | Harder to isolate            |

## When to Use Pool (IMPORTANT)

✅ **MUST use pool when:**

- You have parameterized/keyed state (users, articles, forms)
- Entries have natural TTL (cache, session data)
- You need reactive subscriptions per entry
- Memory management matters

❌ **NEVER use pool when:**

- You need a single global atom (use `atom` instead)
- State doesn't vary by key
- Entries should NEVER be GC'd (use regular Map)
