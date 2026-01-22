# Async Patterns

Guide to handling asynchronous operations in atomirx.

## Table of Contents

- [Async Atoms](#async-atoms)
- [Derived from Async](#derived-from-async)
- [Async Utilities](#async-utilities)
- [Promise State Tracking](#promise-state-tracking)
- [Suspense Integration](#suspense-integration)
- [Common Patterns](#common-patterns)

---

## Async Atoms

### Storing Promises

Atoms store values as-is, including Promises:

```ts
const user$ = atom(fetchUser());

// get() returns the Promise
user$.get(); // Promise<User>
```

### Refetching

Set a new Promise to refetch:

```ts
// Create new fetch
user$.set(fetchUser());

// Reset restores original Promise (does NOT refetch)
user$.reset();
```

### Lazy Refetch on Reset

Use lazy initialization for refetch on reset:

```ts
const user$ = atom(() => fetchUser());

// Now reset() calls fetchUser() again
user$.reset(); // Triggers new fetch
```

### Async with Context

Access AbortSignal for cancellation:

```ts
const data$ = atom((context) => {
  return fetch("/api/data", { signal: context.signal }).then((r) => r.json());
});

// When value changes or reset, signal is aborted
data$.set(newPromise); // Aborts previous fetch
```

---

## Derived from Async

### Basic Async Derived

```ts
const posts$ = atom(fetchPosts());

const postCount$ = derived(({ read }) => {
  const posts = read(posts$); // Waits for posts
  return posts.length;
});

// Access
await postCount$.get(); // number
postCount$.staleValue; // number | undefined
```

### Fallback Values

Provide guaranteed synchronous access:

```ts
const postCount$ = derived(({ read }) => read(posts$).length, { fallback: 0 });

postCount$.staleValue; // number (always defined)
```

### Chained Async

```ts
const userId$ = atom("user-1");
const user$ = atom((ctx) => fetchUser(userId$.get()));
const posts$ = derived(({ read }) => {
  const user = read(user$);
  return fetchPostsByAuthor(user.id);
});
```

---

## Async Utilities

The select context provides utilities mirroring Promise methods.

### all() - Wait for All

Like `Promise.all`:

```ts
const dashboard$ = derived(({ all }) => {
  const [user, posts, notifications] = all(user$, posts$, notifications$);
  return { user, posts, notifications };
});
```

Behavior:

- All ready → returns array of values
- Any error → throws first error
- Any loading → throws Promise (suspends)

### race() - First Settled

Like `Promise.race`:

```ts
const fastest$ = derived(({ race }) => {
  return race(primaryApi$, fallbackApi$);
});
```

Behavior:

- Returns first ready value
- Throws first error
- All loading → throws Promise

### any() - First Success

Like `Promise.any`:

```ts
const anySuccess$ = derived(({ any }) => {
  return any(source1$, source2$, source3$);
});
```

Behavior:

- Returns first ready value (ignores errors)
- All loading → throws Promise
- All errored → throws AggregateError

### settled() - All with Status

Like `Promise.allSettled`:

```ts
const results$ = derived(({ settled }) => {
  const results = settled(atom1$, atom2$, atom3$);

  return results.map((r) => {
    if (r.status === "ready") return r.value;
    return null; // Error case
  });
});
```

Behavior:

- Returns array of `{ status: 'ready', value } | { status: 'error', error }`
- Any loading → throws Promise

### Summary Table

| Method      | Returns           | On Error            | On Loading     |
| ----------- | ----------------- | ------------------- | -------------- |
| `read()`    | Single value      | Throws              | Throws Promise |
| `all()`     | Array of values   | Throws first        | Throws Promise |
| `race()`    | First value       | Throws first        | Throws Promise |
| `any()`     | First success     | Throws if all error | Throws Promise |
| `settled()` | Array with status | Captures in result  | Throws Promise |

---

## Promise State Tracking

### Check Promise State

```ts
import { isPending, isFulfilled, isRejected, trackPromise } from "atomirx";

const promise = fetchData();
const state = trackPromise(promise);

// Type-safe state checks
if (isPending(promise)) {
  console.log("Loading...");
}

if (isFulfilled(promise)) {
  console.log("Value:", state.value);
}

if (isRejected(promise)) {
  console.log("Error:", state.error);
}
```

### Promise State Types

```ts
type PromiseState<T> =
  | { status: "pending"; promise: Promise<T> }
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; error: unknown };
```

### Atom State

```ts
import { getAtomState } from "atomirx";

const state = getAtomState(myAtom$);

switch (state.status) {
  case "ready":
    console.log(state.value);
    break;
  case "loading":
    console.log("Loading...", state.promise);
    break;
  case "error":
    console.log("Error:", state.error);
    break;
}
```

---

## Suspense Integration

### Basic Suspense

```tsx
const user$ = atom(fetchUser());

function UserProfile() {
  const user = useSelector(user$); // Suspends
  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile />
    </Suspense>
  );
}
```

### Error Boundaries

```tsx
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

### Nested Suspense

```tsx
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<Skeleton />}>
        <Header />
      </Suspense>

      <div className="content">
        <Suspense fallback={<Skeleton />}>
          <MainContent />
        </Suspense>

        <Suspense fallback={<Skeleton />}>
          <Sidebar />
        </Suspense>
      </div>
    </div>
  );
}
```

### rx with Inline Loading

```tsx
{
  rx(({ read }) => read(user$).name, {
    loading: () => <Spinner />,
    error: ({ error }) => <ErrorMessage error={error} />,
  });
}
```

---

## Common Patterns

### Refresh Button

```tsx
const data$ = atom(() => fetchData());

function DataView() {
  const data = useSelector(data$);

  return (
    <div>
      <pre>{JSON.stringify(data)}</pre>
      <button onClick={() => data$.reset()}>Refresh</button>
    </div>
  );
}
```

### Polling

```ts
const data$ = atom(() => fetchData());
const pollInterval$ = atom(30000);

effect(({ read, onCleanup }) => {
  const interval = read(pollInterval$); // Subscribe to interval changes
  
  const id = setInterval(() => {
    data$.reset(); // Refetch - access atom directly, not via read()
  }, interval);

  onCleanup(() => clearInterval(id));
});
```

### Optimistic Updates

```ts
const items$ = atom<Item[]>([]);

async function addItem(item: Item) {
  // Optimistic update
  items$.set((prev) => [...prev, item]);

  try {
    const saved = await api.createItem(item);
    // Replace with server response
    items$.set((prev) => prev.map((i) => (i.id === item.id ? saved : i)));
  } catch (error) {
    // Rollback on error
    items$.set((prev) => prev.filter((i) => i.id !== item.id));
    throw error;
  }
}
```

### Dependent Fetches

```ts
const userId$ = atom<string | null>(null);

const user$ = derived(({ read }) => {
  const id = read(userId$);
  if (!id) return null;
  return fetchUser(id);
});

const posts$ = derived(({ read }) => {
  const user = read(user$);
  if (!user) return [];
  return fetchPosts(user.id);
});
```

### Parallel Fetches with all()

```ts
const dashboard$ = derived(({ all, read }) => {
  const userId = read(userId$);

  // Fetch in parallel
  const [user, posts, notifications] = all(
    atom(fetchUser(userId)),
    atom(fetchPosts(userId)),
    atom(fetchNotifications(userId))
  );

  return { user, posts, notifications };
});
```

### Race Conditions

Use AbortSignal to handle race conditions and cancel stale requests.

#### In Effects

Effects provide a built-in `signal` that aborts when the effect re-runs:

```ts
const searchQuery$ = atom("");
const searchResults$ = atom<SearchResult[]>([]);

effect(({ read, signal }) => {
  const query = read(searchQuery$);
  if (!query) {
    searchResults$.set([]);
    return;
  }

  // Previous fetch is automatically cancelled when query changes
  fetch(`/api/search?q=${query}`, { signal })
    .then(r => r.json())
    .then(results => searchResults$.set(results))
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });
});
```

#### In Atoms

Use atom context's signal for cancellation:

```ts
const searchQuery$ = atom("");

const searchResults$ = derived(({ read }) => {
  const query = read(searchQuery$);
  if (!query) return [];

  // Create atom with AbortSignal support
  const results$ = atom((ctx) => searchApi(query, { signal: ctx.signal }));

  return read(results$);
});
```

### Retry Logic

```ts
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}

const data$ = atom(() => fetchWithRetry(() => fetchData()));
```

### Debounced Search

```tsx
const searchInput$ = atom("");
const debouncedSearch$ = atom("");

// Debounce effect
effect(({ read, onCleanup }) => {
  const input = read(searchInput$);

  const timeout = setTimeout(() => {
    debouncedSearch$.set(input);
  }, 300);

  onCleanup(() => clearTimeout(timeout));
});

const searchResults$ = derived(({ read }) => {
  const query = read(debouncedSearch$);
  if (!query) return [];
  return search(query);
});
```

---

## Next Steps

- [React Guide](./react-guide.md) - React integration
- [Testing](./testing.md) - Testing async code
- [API Reference](./api-reference.md) - Complete API docs
