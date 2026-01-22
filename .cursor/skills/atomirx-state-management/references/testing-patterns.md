# Testing Patterns

Guide for testing atomirx stores, services, and components.

## Overview

| Pattern                 | Use Case                       | Key Method                   |
| ----------------------- | ------------------------------ | ---------------------------- |
| `define().override()`   | Mock entire module             | `store.override(() => mock)` |
| `define().invalidate()` | Fresh instance per test        | `store.invalidate()`         |
| `define().reset()`      | Clear override, fresh original | `store.reset()`              |
| `hook.reset()`          | Clear global hooks             | `onCreateHook.reset()`       |
| Direct atom testing     | Test atom behavior             | `atom$.set()`, `atom$.get()` |

## Testing Stores with define()

### Basic Test Setup

```typescript
import { counterStore } from "./counter.store";

describe("counterStore", () => {
  // Reset to fresh instance before each test
  beforeEach(() => {
    counterStore.invalidate();
  });

  it("should start at 0", () => {
    const store = counterStore();
    expect(store.count$.get()).toBe(0);
  });

  it("should increment", () => {
    const store = counterStore();
    store.increment();
    expect(store.count$.get()).toBe(1);
  });
});
```

### invalidate() vs reset()

| Method         | Clears Override | Creates Fresh Instance |
| -------------- | --------------- | ---------------------- |
| `invalidate()` | Yes             | Yes                    |
| `reset()`      | Yes             | Yes                    |

Both methods:

1. Clear any override set via `.override()`
2. Dispose current instance (calls `dispose()` if exists)
3. Next access creates fresh instance

```typescript
afterEach(() => {
  counterStore.invalidate();
});

// Each test gets fresh store
it("test 1", () => {
  counterStore().increment(); // count = 1
});

it("test 2", () => {
  expect(counterStore().count$.get()).toBe(0); // Fresh start
});
```

## Mocking with override()

### Full Mock Replacement

```typescript
import { authStore } from "./auth.store";

describe("feature using auth", () => {
  beforeEach(() => {
    authStore.override(() => ({
      user$: { get: () => ({ id: "1", name: "Test" }) },
      isLoggedIn$: { get: () => true },
      login: vi.fn(),
      logout: vi.fn(),
    }));
  });

  afterEach(() => {
    authStore.reset();
  });

  it("should work with mocked auth", () => {
    const auth = authStore();
    expect(auth.isLoggedIn$.get()).toBe(true);
  });
});
```

### Extend Original with Mocks

```typescript
apiService.override((original) => ({
  ...original(),
  fetch: vi.fn().mockResolvedValue({ data: "mocked" }),
}));
```

### Conditional Mocking

```typescript
beforeEach(() => {
  if (process.env.USE_MOCK) {
    storageService.override(() => createMockStorage());
  }
});
```

## Testing Hooks

### Isolating Hook Tests

```typescript
import { onCreateHook, onErrorHook } from "atomirx";

describe("MyStore", () => {
  beforeEach(() => {
    onCreateHook.reset();
    onErrorHook.reset();
  });

  afterEach(() => {
    onCreateHook.reset();
    onErrorHook.reset();
  });

  it("should track created atoms", () => {
    const created: string[] = [];

    onCreateHook.override((prev) => (info) => {
      prev?.(info);
      if (info.key) created.push(info.key);
    });

    // Create store - triggers hook
    const store = myStore();

    expect(created).toContain("myStore.counter");
  });
});
```

### Testing Error Hook

```typescript
it("should call error hook on derived error", async () => {
  const errors: ErrorInfo[] = [];

  onErrorHook.override((prev) => (info) => {
    prev?.(info);
    errors.push(info);
  });

  const buggy$ = derived(
    ({ read }) => {
      throw new Error("test");
    },
    { meta: { key: "buggy" } }
  );

  // Trigger computation
  try {
    await buggy$.get();
  } catch {}

  expect(errors).toHaveLength(1);
  expect(errors[0].source.key).toBe("buggy");
});
```

## Testing Atoms Directly

### Mutable Atom

```typescript
it("should track dirty state", () => {
  const form$ = atom({ name: "", email: "" });

  expect(form$.dirty()).toBe(false);

  form$.set({ name: "John", email: "" });
  expect(form$.dirty()).toBe(true);

  form$.reset();
  expect(form$.dirty()).toBe(false);
});
```

### Derived Atom

```typescript
it("should compute derived value", async () => {
  const count$ = atom(5);
  const doubled$ = derived(({ read }) => read(count$) * 2);

  expect(await doubled$.get()).toBe(10);

  count$.set(10);
  expect(await doubled$.get()).toBe(20);
});
```

### Async Atom

```typescript
it("should handle async values", async () => {
  const data$ = atom(Promise.resolve({ value: 42 }));
  const computed$ = derived(({ read }) => read(data$).value);

  // Wait for resolution
  const result = await computed$.get();
  expect(result).toBe(42);
});
```

## Testing Effects

```typescript
it("should run effect on atom change", () => {
  const log: number[] = [];
  const count$ = atom(0);

  const e = effect(({ read }) => {
    log.push(read(count$));
  });

  // Initial run
  expect(log).toEqual([0]);

  // Update triggers re-run
  count$.set(1);
  expect(log).toEqual([0, 1]);

  // Cleanup
  e.dispose();
  count$.set(2);
  expect(log).toEqual([0, 1]); // No more runs
});
```

### Effect with Cleanup

```typescript
it("should call cleanup before re-run", () => {
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
```

## Testing Pools

```typescript
describe("userPool", () => {
  let pool: Pool<string, User>;

  beforeEach(() => {
    pool = createUserPool();
  });

  it("should create entries on get", () => {
    expect(pool.has("user-1")).toBe(false);
    pool.get("user-1");
    expect(pool.has("user-1")).toBe(true);
  });

  it("should remove entries", () => {
    pool.get("user-1");
    pool.remove("user-1");
    expect(pool.has("user-1")).toBe(false);
  });

  it("should notify on change", () => {
    const changes: [string, User][] = [];
    pool.onChange((params, value) => changes.push([params, value]));

    pool.set("user-1", { name: "John" });

    expect(changes).toHaveLength(1);
    expect(changes[0][0]).toBe("user-1");
  });
});
```

## Testing React Components

### With useSelector

```typescript
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";

describe("Counter", () => {
  beforeEach(() => {
    counterStore.invalidate();
  });

  it("should display count", async () => {
    render(
      <Suspense fallback={<div>Loading</div>}>
        <Counter />
      </Suspense>
    );

    expect(await screen.findByText("Count: 0")).toBeInTheDocument();
  });

  it("should increment on click", async () => {
    render(
      <Suspense fallback={<div>Loading</div>}>
        <Counter />
      </Suspense>
    );

    const button = await screen.findByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });
});
```

### With Mocked Store

```typescript
it("should display user name", async () => {
  authStore.override(() => ({
    user$: { get: () => ({ name: "Test User" }) },
    isLoggedIn$: { get: () => true },
  }));

  render(
    <Suspense fallback={<div>Loading</div>}>
      <UserProfile />
    </Suspense>
  );

  expect(await screen.findByText("Test User")).toBeInTheDocument();
});
```

### Testing useAction

```typescript
it("should show loading state", async () => {
  const { result } = renderHook(() =>
    useAction(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return "done";
    })
  );

  expect(result.current.status).toBe("idle");

  act(() => {
    result.current();
  });

  expect(result.current.status).toBe("loading");

  await waitFor(() => {
    expect(result.current.status).toBe("success");
  });
});
```

## Test Utilities

### Wait for Derived

```typescript
async function waitForDerived<T>(derived$: DerivedAtom<T>): Promise<T> {
  return derived$.get();
}

it("should compute value", async () => {
  const result = await waitForDerived(computedValue$);
  expect(result).toBe(expectedValue);
});
```

### Create Test Store

```typescript
function createTestStore(overrides?: Partial<StoreType>) {
  return {
    count$: atom(0),
    user$: atom(null),
    increment: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  myStore.override(() => createTestStore());
});
```

### Mock Service Pattern

```typescript
// services/api.service.mock.ts
export const createMockApiService = () => ({
  fetch: vi.fn().mockResolvedValue({ data: [] }),
  post: vi.fn().mockResolvedValue({ success: true }),
  delete: vi.fn().mockResolvedValue({ success: true }),
});

// In tests
apiService.override(() => createMockApiService());
```

## Best Practices (CRITICAL)

### MUST DO

- **MUST** use `invalidate()` in `beforeEach` for store isolation
- **MUST** reset hooks in `afterEach` for hook tests
- **MUST** test atoms directly when possible
- **MUST** use `waitFor` for async assertions
- **MUST** mock at service layer, not atom layer

### NEVER DO

- **NEVER** share store state between tests
- **NEVER** forget to clean up effects
- **NEVER** test implementation details
- **NEVER** mock atoms when you can mock services
- **NEVER** use real timers in tests (use fake timers)

```typescript
// ❌ FORBIDDEN: Shared state between tests
const store = counterStore(); // Created once, shared - BREAKS test isolation!

// ✅ REQUIRED: Fresh state per test
beforeEach(() => counterStore.invalidate());
```
