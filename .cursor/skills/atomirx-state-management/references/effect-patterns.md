# Effect Patterns - Side Effects on State Changes

The `effect()` function creates side-effects that run when accessed atoms change. Effects are for actions (logging, syncing, persisting), NOT computed values.

## Overview

| Feature               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **Automatic cleanup** | Previous cleanup runs before next execution              |
| **Suspense-aware**    | Waits for async atoms to resolve before running          |
| **Batched updates**   | Atom updates within effect are automatically batched     |
| **Conditional deps**  | Only tracks atoms actually accessed via `read()`         |
| **Eager execution**   | Runs immediately on creation (unlike lazy `derived`)     |

## Core API

```typescript
interface Effect {
  dispose: VoidFunction;  // Stop effect and run final cleanup
  meta?: EffectMeta;      // Metadata for debugging
}

interface EffectContext extends SelectContext, WithReadyContext, WithAbortContext {
  onCleanup: (cleanup: VoidFunction) => void;
}
```

## Basic Usage

```typescript
import { effect } from "atomirx";

// Simple effect - runs when count$ changes
const e = effect(({ read }) => {
  console.log("Count changed:", read(count$));
});

// With cleanup - runs before next execution or dispose
const e = effect(({ read, onCleanup }) => {
  const interval = setInterval(() => console.log("tick"), 1000);
  onCleanup(() => clearInterval(interval));
});

// Stop the effect
e.dispose();
```

## EffectContext Methods

All `SelectContext` methods plus cleanup utilities:

| Method       | Signature                 | Description                        |
| ------------ | ------------------------- | ---------------------------------- |
| `read()`     | `(atom$) => T`            | Read atom value, track dependency  |
| `ready()`    | `(atom$) => NonNull<T>`   | Wait for non-null value            |
| `from()`     | `(pool, params) => Scoped`| Get ScopedAtom from pool           |
| `track()`    | `(atom$) => void`         | Track without reading              |
| `safe()`     | `(fn) => [err, result]`   | Catch errors, preserve Suspense    |
| `state()`    | `(atom$) => AtomState`    | Get state without throwing         |
| `all()`      | `([...atoms]) => [...]`   | Wait for all                       |
| `any()`      | `({...atoms}) => {k,v}`   | First ready                        |
| `race()`     | `({...atoms}) => {k,v}`   | First settled                      |
| `settled()`  | `([...atoms]) => [...]`   | All results                        |
| `and()`      | `([...conds]) => boolean` | Logical AND                        |
| `or()`       | `([...conds]) => boolean` | Logical OR                         |
| `onCleanup()`| `(fn) => void`            | Register cleanup function          |
| `signal`     | `AbortSignal`             | Aborted on re-run or dispose       |

## CRITICAL Rules

### MUST Be Synchronous - NEVER Use async

```typescript
// ❌ FORBIDDEN - Don't use async function
effect(async ({ read }) => {
  const data = await fetch("/api");
  console.log(data);
});

// ✅ REQUIRED - Create async atom and use read()
const data$ = atom(fetch("/api").then((r) => r.json()));
effect(({ read }) => {
  console.log(read(data$)); // Suspends until resolved
});
```

### NEVER Use try/catch with read() - ALWAYS Use safe()

```typescript
// ❌ FORBIDDEN - Catches Suspense Promise, BREAKS loading state
effect(({ read }) => {
  try {
    const data = read(asyncAtom$);
    riskyOperation(data);
  } catch (e) {
    console.error(e); // BREAKS Suspense - catches BOTH errors AND promises!
  }
});

// ✅ REQUIRED - Use safe() to catch errors but preserve Suspense
effect(({ read, safe }) => {
  const [err, data] = safe(() => {
    const raw = read(asyncAtom$); // Can throw Promise (Suspense)
    return riskyOperation(raw); // Can throw Error
  });

  if (err) {
    console.error("Operation failed:", err);
    return;
  }
  // Use data safely
});
```

### MUST Define meta.key for Debugging

```typescript
// ✅ REQUIRED - Always define meta.key
effect(
  ({ read }) => {
    localStorage.setItem("count", String(read(count$)));
  },
  { meta: { key: "persist.count" } }
);

// ❌ FORBIDDEN - Missing meta.key (hard to debug)
effect(({ read }) => {
  localStorage.setItem("count", String(read(count$)));
});
```

### Single Effect, Single Workflow

```typescript
// ❌ FORBIDDEN - Multiple workflows in one effect
effect(({ read }) => {
  // Workflow 1: persist to localStorage
  localStorage.setItem("count", String(read(count$)));
  // Workflow 2: sync to server
  syncToServer(read(count$));
  // Workflow 3: analytics
  trackEvent("count_changed", read(count$));
});

// ✅ REQUIRED - Separate effects for each workflow
effect(
  ({ read }) => localStorage.setItem("count", String(read(count$))),
  { meta: { key: "persist.count" } }
);

effect(
  ({ read }) => syncToServer(read(count$)),
  { meta: { key: "sync.count" } }
);

effect(
  ({ read }) => trackEvent("count_changed", read(count$)),
  { meta: { key: "analytics.count" } }
);
```

## Cleanup Patterns

### Basic Cleanup

```typescript
effect(({ read, onCleanup }) => {
  const id = setInterval(() => console.log(read(count$)), 1000);
  onCleanup(() => clearInterval(id));
});
```

### Multiple Cleanup Functions (FIFO order)

```typescript
effect(({ read, onCleanup }) => {
  const sub1 = eventBus.subscribe("a", handler1);
  const sub2 = eventBus.subscribe("b", handler2);

  onCleanup(() => sub1.unsubscribe()); // Runs first
  onCleanup(() => sub2.unsubscribe()); // Runs second
});
```

### With AbortSignal

```typescript
effect(({ read, signal, onCleanup }) => {
  const userId = read(userId$);

  // Fetch with abort signal
  fetch(`/api/user/${userId}`, { signal })
    .then((res) => res.json())
    .then((data) => userDetails$.set(data))
    .catch((err) => {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    });

  // Alternative: use onCleanup for manual abort
  const controller = new AbortController();
  onCleanup(() => controller.abort());
});
```

### WebSocket Connection

```typescript
effect(({ read, onCleanup }) => {
  const url = read(wsUrl$);
  const socket = new WebSocket(url);

  socket.onmessage = (e) => messages$.set((prev) => [...prev, e.data]);
  socket.onerror = (e) => console.error("WS Error:", e);

  onCleanup(() => {
    socket.close();
    console.log("WebSocket closed");
  });
});
```

## Common Patterns

### LocalStorage Sync

```typescript
effect(
  ({ read }) => {
    const settings = read(settings$);
    localStorage.setItem("settings", JSON.stringify(settings));
  },
  { meta: { key: "persist.settings" } }
);
```

### Analytics Tracking

```typescript
effect(
  ({ read }) => {
    const page = read(currentPage$);
    analytics.track("page_view", { page });
  },
  { meta: { key: "analytics.pageView" } }
);
```

### Debug Logging (Development Only)

```typescript
if (process.env.NODE_ENV === "development") {
  effect(
    ({ read }) => {
      console.log("[DEBUG] State:", {
        user: read(user$),
        cart: read(cart$),
      });
    },
    { meta: { key: "debug.state" } }
  );
}
```

### Conditional Effect Execution

```typescript
effect(
  ({ read }) => {
    const isEnabled = read(featureFlag$);
    if (!isEnabled) return; // Skip if feature disabled

    const data = read(data$);
    syncToExternalService(data);
  },
  { meta: { key: "sync.external" } }
);
```

### Debounced Persistence

```typescript
effect(
  ({ read, onCleanup }) => {
    const data = read(formData$);

    const timeoutId = setTimeout(() => {
      localStorage.setItem("draft", JSON.stringify(data));
    }, 500);

    onCleanup(() => clearTimeout(timeoutId));
  },
  { meta: { key: "persist.formDraft" } }
);
```

### Cross-Tab Sync

```typescript
effect(
  ({ read, onCleanup }) => {
    const settings = read(settings$);

    // Broadcast to other tabs
    const channel = new BroadcastChannel("settings");
    channel.postMessage(settings);

    // Listen for changes from other tabs
    const handler = (e: MessageEvent) => settings$.set(e.data);
    channel.addEventListener("message", handler);

    onCleanup(() => {
      channel.removeEventListener("message", handler);
      channel.close();
    });
  },
  { meta: { key: "sync.crossTab" } }
);
```

### Document Title Update

```typescript
effect(
  ({ read }) => {
    const count = read(unreadCount$);
    document.title = count > 0 ? `(${count}) My App` : "My App";
  },
  { meta: { key: "ui.documentTitle" } }
);
```

## Effect Options

```typescript
interface EffectOptions {
  /** Metadata for debugging - MUST define key */
  meta?: { key?: string };

  /** Error callback for effect errors */
  onError?: (error: unknown) => void;
}
```

### Error Handling with onError

```typescript
effect(
  ({ read }) => {
    const data = read(data$);
    riskyOperation(data); // May throw
  },
  {
    meta: { key: "risky.operation" },
    onError: (error) => {
      console.error("Effect error:", error);
      Sentry.captureException(error);
    },
  }
);
```

## Effect vs Derived

| Aspect          | effect()                    | derived()                   |
| --------------- | --------------------------- | --------------------------- |
| **Returns**     | void (side effects only)    | Computed value              |
| **Execution**   | Eager (runs immediately)    | Lazy (on first access)      |
| **Purpose**     | Side effects (sync, log)    | Compute/transform data      |
| **Can set atoms**| Yes (use `batch`)          | No                          |
| **Subscription**| Always active               | When accessed               |
| **Use case**    | Persist, sync, track        | Filter, map, combine        |

```typescript
// Effect: side effect (sync to localStorage)
effect(({ read }) => {
  localStorage.setItem("count", String(read(count$)));
});

// Derived: compute value
const doubled$ = derived(({ read }) => read(count$) * 2);
```

## Lifecycle

```
effect created
       │
       ▼
  Initial run
       │
       ▼
┌──────────────────┐
│ Dependency       │◄─── atom$.set() triggers
│ changed          │
└──────────────────┘
       │
       ▼
  Run cleanup(s)    ◄─── onCleanup functions in FIFO order
       │
       ▼
  Re-run effect
       │
       ▼
  (repeat on changes)
       │
       ▼
  e.dispose()
       │
       ▼
  Final cleanup(s)  ◄─── onCleanup functions in FIFO order
       │
       ▼
  Effect stopped
```

## Testing Effects

```typescript
describe("persistEffect", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should persist count to localStorage", () => {
    const count$ = atom(0, { meta: { key: "test.count" } });

    const e = effect(
      ({ read }) => {
        localStorage.setItem("count", String(read(count$)));
      },
      { meta: { key: "test.persist" } }
    );

    expect(localStorage.getItem("count")).toBe("0");

    count$.set(5);
    expect(localStorage.getItem("count")).toBe("5");

    e.dispose();
  });

  it("should cleanup on dispose", () => {
    const cleanupSpy = vi.fn();
    const count$ = atom(0);

    const e = effect(({ read, onCleanup }) => {
      read(count$);
      onCleanup(cleanupSpy);
    });

    expect(cleanupSpy).not.toHaveBeenCalled();

    e.dispose();
    expect(cleanupSpy).toHaveBeenCalledOnce();
  });

  it("should run cleanup before re-run", () => {
    const cleanupCalls: number[] = [];
    const count$ = atom(0);

    const e = effect(({ read, onCleanup }) => {
      const value = read(count$);
      onCleanup(() => cleanupCalls.push(value));
    });

    count$.set(1); // Cleanup(0) called
    count$.set(2); // Cleanup(1) called

    expect(cleanupCalls).toEqual([0, 1]);

    e.dispose(); // Cleanup(2) called
    expect(cleanupCalls).toEqual([0, 1, 2]);
  });
});
```

## When to Use Effect (IMPORTANT)

✅ **MUST use effect when:**

- Syncing state to external storage (localStorage, IndexedDB)
- Sending analytics events
- Logging/debugging state changes
- Managing subscriptions (WebSocket, EventSource)
- Updating document title or other DOM properties
- Cross-tab synchronization

❌ **NEVER use effect when:**

- Computing derived values (use `derived` instead)
- Transforming data (use `derived` instead)
- You need a return value (use `derived` instead)
- The operation should only happen on-demand (use action in store)
