# Core Concepts

This guide covers the fundamental building blocks of atomirx.

## Table of Contents

- [Atoms](#atoms)
- [Derived Atoms](#derived-atoms)
- [Effects](#effects)
- [Pools](#pools)
- [Batching](#batching)
- [Modules (define)](#modules-define)

---

## Atoms

Atoms are the foundational primitive - reactive containers that hold a single value.

### Creating Atoms

```ts
import { atom } from 'atomirx';

// Simple value
const count$ = atom(0);
const name$ = atom('John');
const user$ = atom({ id: 1, name: 'John' });

// Lazy initialization (function is called at creation)
const timestamp$ = atom(() => Date.now());

// Async value (stores the Promise)
const data$ = atom(fetch('/api/data').then(r => r.json()));
```

### Reading Values

```ts
const count$ = atom(5);

// Synchronous read
count$.get(); // 5

// For async atoms, get() returns the Promise
const data$ = atom(fetchData());
data$.get(); // Promise<Data>
```

### Updating Values

```ts
const count$ = atom(0);

// Direct value
count$.set(5);

// Reducer function (receives previous value)
count$.set(prev => prev + 1);

// Reset to initial value
count$.reset();
```

### Subscribing to Changes

```ts
const count$ = atom(0);

// Subscribe returns unsubscribe function
const unsubscribe = count$.on(() => {
  console.log('Count changed to:', count$.get());
});

count$.set(1); // Logs: "Count changed to: 1"

// Stop listening
unsubscribe();
```

### Atom Context

When using lazy initialization, atoms receive a context object:

```ts
const data$ = atom((context) => {
  // AbortSignal - aborted when value changes or reset
  const signal = context.signal;
  
  // Register cleanup functions
  context.onCleanup(() => {
    console.log('Cleaning up...');
  });
  
  return fetchData({ signal });
});
```

### Dirty State

Track if an atom has been modified since creation or last reset:

```ts
const count$ = atom(0);

count$.dirty(); // false
count$.set(1);
count$.dirty(); // true
count$.reset();
count$.dirty(); // false
```

### Atom Options

```ts
const count$ = atom(0, {
  // Metadata for debugging/devtools
  meta: { key: 'counter' },
  
  // Equality function to prevent unnecessary notifications
  equals: 'shallow', // or 'strict', 'deep', or custom function
});
```

### Read-Only Exposure

Use `readonly()` to expose atoms without mutation methods:

```ts
import { atom, readonly } from 'atomirx';

const count$ = atom(0);

// Type is Atom<number> - no set() or reset()
export const publicCount$ = readonly(count$);
```

---

## Derived Atoms

Derived atoms compute values from other atoms with automatic dependency tracking.

### Creating Derived Atoms

```ts
import { derived } from 'atomirx';

const firstName$ = atom('John');
const lastName$ = atom('Doe');

const fullName$ = derived(({ read }) => 
  `${read(firstName$)} ${read(lastName$)}`
);
```

### Reading Derived Values

Derived atoms always return Promises:

```ts
// Async access
await fullName$.get(); // "John Doe"

// Synchronous access (may be undefined before first computation)
fullName$.staleValue; // "John Doe" | undefined
```

### State Access

```ts
const state = fullName$.state();

switch (state.status) {
  case 'loading':
    console.log('Computing...', state.promise);
    break;
  case 'ready':
    console.log('Value:', state.value);
    break;
  case 'error':
    console.log('Error:', state.error);
    break;
}
```

### Fallback Values

Provide a fallback for guaranteed synchronous access:

```ts
// Without fallback
const count$ = derived(({ read }) => read(items$).length);
count$.staleValue; // number | undefined

// With fallback
const countSafe$ = derived(
  ({ read }) => read(items$).length,
  { fallback: 0 }
);
countSafe$.staleValue; // number (always defined)
```

### Refresh

Force recomputation:

```ts
fullName$.refresh();
```

### Conditional Dependencies

Only atoms accessed via `read()` become dependencies:

```ts
const showDetails$ = atom(false);
const summary$ = atom('Brief');
const details$ = atom('Detailed');

const content$ = derived(({ read }) => {
  if (read(showDetails$)) {
    return read(details$); // Only subscribes when showDetails is true
  }
  return read(summary$);
});
```

### Boolean Operators: and() / or()

Use `and()` and `or()` for composable boolean logic with short-circuit evaluation:

```ts
// and() - all must be truthy
const canAccess$ = derived(({ and }) => 
  and([isLoggedIn$, hasPermission$, isActive$])
);

// or() - any truthy is enough
const hasData$ = derived(({ or }) => 
  or([cacheData$, apiData$, fallbackData$])
);
```

**Condition types:**
- `boolean` - Static value (no subscription)
- `Atom<T>` - Always read and subscribed
- `() => boolean | Atom<T>` - Lazy, only evaluated if needed

**Lazy evaluation for performance:**

```ts
const canDelete$ = derived(({ and }) => 
  and([
    isLoggedIn$,           // Always checked first
    () => hasDeleteRole$,  // Only checked if logged in
    () => canDeleteItem$,  // Only checked if has role
  ])
);
```

**Nested composition:**

```ts
// Complex: feature && loggedIn && (hasPermission || isAdmin)
const canAccess$ = derived(({ and, or }) => 
  and([
    FEATURE_ENABLED,       // Static config
    isLoggedIn$,
    or([hasPermission$, isAdmin$]),
  ])
);
```

---

## Effects

Effects run side effects in response to atom changes.

### Creating Effects

```ts
import { effect } from 'atomirx';

const dispose = effect(({ read }) => {
  const count = read(count$);
  localStorage.setItem('count', String(count));
});

// Stop the effect
dispose();
```

### Cleanup

Register cleanup functions that run before each re-execution and on dispose:

```ts
effect(({ read, onCleanup }) => {
  const interval = read(intervalMs$);
  
  const id = setInterval(() => {
    console.log('tick');
  }, interval);
  
  onCleanup(() => {
    clearInterval(id);
  });
});
```

### AbortSignal

Effects provide a `signal` for cancelling async operations. The signal is automatically aborted when the effect re-runs or is disposed:

```ts
effect(({ read, signal }) => {
  const userId = read(userId$);
  
  // Fetch is cancelled if userId changes or effect disposes
  fetch(`/api/users/${userId}`, { signal })
    .then(r => r.json())
    .then(user => user$.set(user))
    .catch(err => {
      // Ignore abort errors
      if (err.name !== 'AbortError') throw err;
    });
});
```

You can also manually abort using the `abort()` method:

```ts
effect(({ read, signal, abort }) => {
  const shouldCancel = read(shouldCancel$);
  if (shouldCancel) {
    abort();
    return;
  }
  
  fetch('/api/data', { signal });
});
```

### Error Handling

```ts
effect(
  ({ read }) => {
    const data = read(data$);
    riskyOperation(data);
  },
  {
    onError: (error) => {
      console.error('Effect failed:', error);
    }
  }
);
```

---

## Pools

Pools are parameterized collections of atoms with automatic garbage collection.

### Creating Pools

```ts
import { pool } from 'atomirx';

const userPool = pool(
  (id: string) => fetchUser(id),
  { 
    gcTime: 60_000, // GC after 60s of inactivity
    equals: 'shallow' // Params equality
  }
);
```

### Using Pools

```ts
// Get value
const user = userPool.get('user-1');

// Set value
userPool.set('user-1', { name: 'John' });

// Check existence
userPool.has('user-1'); // true

// Remove entry
userPool.remove('user-1');

// Clear all
userPool.clear();

// Iterate
userPool.forEach((value, params) => {
  console.log(params, value);
});
```

### Pool Events

```ts
// Value changes
userPool.onChange((id, value) => {
  console.log('Changed:', id, value);
});

// Entry removed (including by GC)
userPool.onRemove((id, value) => {
  console.log('Removed:', id, value);
});
```

### Pool in Reactive Context

Use `from()` to safely access pool entries in derived/effect/useSelector:

```ts
const userPosts$ = derived(({ read, from }) => {
  const userId = read(currentUserId$);
  const user$ = from(userPool, userId); // Creates ScopedAtom
  return read(user$).posts;
});
```

The ScopedAtom is automatically cleaned up after the computation, preventing memory leaks.

---

## Batching

Batch multiple updates into a single notification cycle.

```ts
import { batch } from 'atomirx';

const a$ = atom(0);
const b$ = atom(0);

// Without batch: 2 notifications
a$.set(1);
b$.set(2);

// With batch: 1 notification
batch(() => {
  a$.set(1);
  b$.set(2);
});
```

### Nested Batches

Inner batches are merged into the outer:

```ts
batch(() => {
  a$.set(1);
  batch(() => {
    b$.set(2);
    c$.set(3);
  });
  d$.set(4);
}); // Single notification at the end
```

### Return Values

```ts
const result = batch(() => {
  count$.set(10);
  return count$.get() * 2;
});
console.log(result); // 20
```

---

## Modules (define)

Create swappable lazy singleton stores.

### Creating Modules

```ts
import { define, atom, readonly } from 'atomirx';

const counterModule = define(() => {
  const count$ = atom(0);
  
  return {
    count$: readonly(count$),
    increment: () => count$.set(c => c + 1),
    decrement: () => count$.set(c => c - 1),
    reset: () => count$.reset(),
  };
});
```

### Using Modules

```ts
// Call to get the singleton instance
const { count$, increment } = counterModule();

increment();
console.log(count$.get()); // 1
```

### Override for Testing

```ts
// Must be called BEFORE first access
counterModule.override(() => ({
  count$: atom(999),
  increment: vi.fn(),
  decrement: vi.fn(),
  reset: vi.fn(),
}));

// Reset to original
counterModule.reset();
```

### Extend Original

```ts
counterModule.override((original) => ({
  ...original(),
  doubleIncrement: () => {
    original().increment();
    original().increment();
  },
}));
```

### Module State

```ts
counterModule.isInitialized(); // Has instance been created?
counterModule.isOverridden();  // Is override active?

// Force new instance on next access
counterModule.invalidate();
```

### Cleanup on Invalidate

If the module returns a `dispose` function, it's called on invalidate:

```ts
const connectionModule = define(() => {
  const conn = createConnection();
  
  return {
    query: (sql) => conn.query(sql),
    dispose: () => conn.close(),
  };
});

connectionModule.invalidate(); // Calls dispose(), next access creates new
```

---

## Next Steps

- [React Guide](./react-guide.md) - React integration
- [Async Patterns](./async-patterns.md) - Handling async operations
- [API Reference](./api-reference.md) - Complete API documentation
