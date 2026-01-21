# Testing Guide

Strategies for testing atomirx applications.

## Table of Contents

- [Testing Atoms](#testing-atoms)
- [Testing Derived Atoms](#testing-derived-atoms)
- [Testing Effects](#testing-effects)
- [Testing React Components](#testing-react-components)
- [Mocking with define()](#mocking-with-define)
- [Testing Async Code](#testing-async-code)

---

## Testing Atoms

### Basic Atom Tests

```ts
import { atom } from "atomirx";

describe("atom", () => {
  it("should hold initial value", () => {
    const count$ = atom(0);
    expect(count$.get()).toBe(0);
  });

  it("should update value", () => {
    const count$ = atom(0);
    count$.set(5);
    expect(count$.get()).toBe(5);
  });

  it("should support reducer updates", () => {
    const count$ = atom(0);
    count$.set((prev) => prev + 1);
    expect(count$.get()).toBe(1);
  });

  it("should reset to initial value", () => {
    const count$ = atom(0);
    count$.set(5);
    count$.reset();
    expect(count$.get()).toBe(0);
  });

  it("should notify subscribers", () => {
    const count$ = atom(0);
    const listener = vi.fn();

    count$.on(listener);
    count$.set(1);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

### Testing with Equality

```ts
it("should not notify if equal (shallow)", () => {
  const user$ = atom({ name: "John" }, { equals: "shallow" });
  const listener = vi.fn();

  user$.on(listener);
  user$.set({ name: "John" }); // Same content

  expect(listener).not.toHaveBeenCalled();
});
```

---

## Testing Derived Atoms

### Basic Derived Tests

```ts
import { atom, derived } from "atomirx";

describe("derived", () => {
  it("should compute value from source", async () => {
    const count$ = atom(5);
    const doubled$ = derived(({ read }) => read(count$) * 2);

    expect(await doubled$.get()).toBe(10);
  });

  it("should update when source changes", async () => {
    const count$ = atom(5);
    const doubled$ = derived(({ read }) => read(count$) * 2);

    await doubled$.get(); // Initialize
    count$.set(10);

    expect(await doubled$.get()).toBe(20);
  });

  it("should provide fallback value", () => {
    const items$ = atom<number[]>([]);
    const total$ = derived(
      ({ read }) => read(items$).reduce((a, b) => a + b, 0),
      { fallback: 0 }
    );

    expect(total$.staleValue).toBe(0);
  });
});
```

### Testing State

```ts
it("should report state correctly", async () => {
  const data$ = atom(Promise.resolve("done"));
  const derived$ = derived(({ read }) => read(data$));

  // Initially loading
  expect(derived$.state().status).toBe("loading");

  // After resolution
  await derived$.get();
  expect(derived$.state().status).toBe("ready");
  expect(derived$.state().value).toBe("done");
});
```

---

## Testing Effects

### Basic Effect Tests

```ts
import { atom, effect } from "atomirx";

describe("effect", () => {
  it("should run on atom change", () => {
    const count$ = atom(0);
    const sideEffect = vi.fn();

    effect(({ read }) => {
      sideEffect(read(count$));
    });

    count$.set(1);

    expect(sideEffect).toHaveBeenCalledWith(1);
  });

  it("should run cleanup on dispose", () => {
    const cleanup = vi.fn();

    const dispose = effect(({ onCleanup }) => {
      onCleanup(cleanup);
    });

    dispose();

    expect(cleanup).toHaveBeenCalled();
  });

  it("should run cleanup before next execution", () => {
    const count$ = atom(0);
    const cleanup = vi.fn();

    effect(({ read, onCleanup }) => {
      read(count$);
      onCleanup(cleanup);
    });

    count$.set(1);

    expect(cleanup).toHaveBeenCalled();
  });
});
```

---

## Testing React Components

### Testing useSelector

```tsx
import { render, screen } from "@testing-library/react";
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";

const count$ = atom(0);

function Counter() {
  const count = useSelector(count$);
  return <div data-testid="count">{count}</div>;
}

describe("useSelector", () => {
  it("should render atom value", () => {
    render(<Counter />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("should update on atom change", () => {
    render(<Counter />);

    act(() => {
      count$.set(5);
    });

    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });
});
```

### Testing with Suspense

```tsx
import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";

const user$ = atom(Promise.resolve({ name: "John" }));

function UserName() {
  const user = useSelector(user$);
  return <div data-testid="name">{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserName />
    </Suspense>
  );
}

describe("async useSelector", () => {
  it("should show loading then content", async () => {
    render(<App />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("John");
    });
  });
});
```

### Testing rx

```tsx
import { rx } from "atomirx/react";

function Counter() {
  return <div data-testid="count">{rx(count$)}</div>;
}

describe("rx", () => {
  it("should render atom value", () => {
    render(<Counter />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
```

---

## Mocking with define()

### Override for Testing

```ts
import { define, atom } from "atomirx";

const userModule = define(() => {
  const user$ = atom<User | null>(null);

  return {
    user$,
    login: async (credentials: Credentials) => {
      const user = await api.login(credentials);
      user$.set(user);
    },
    logout: () => user$.set(null),
  };
});

describe("userModule", () => {
  beforeEach(() => {
    userModule.override(() => ({
      user$: atom<User | null>(null),
      login: vi.fn(),
      logout: vi.fn(),
    }));
  });

  afterEach(() => {
    userModule.reset();
  });

  it("should login user", async () => {
    const { login } = userModule();

    await login({ email: "test@example.com", password: "123" });

    expect(login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "123",
    });
  });
});
```

### Extending Original

```ts
userModule.override((original) => ({
  ...original(),
  login: vi.fn().mockResolvedValue({ id: "1", name: "Test" }),
}));
```

### Fresh Instance Each Test

```ts
afterEach(() => {
  userModule.invalidate(); // Creates fresh instance next access
});
```

---

## Testing Async Code

### Testing Async Atoms

```ts
describe("async atoms", () => {
  it("should resolve promise", async () => {
    const data$ = atom(Promise.resolve("hello"));

    const result = await data$.get();

    expect(result).toBe("hello");
  });

  it("should handle rejection", async () => {
    const error = new Error("Failed");
    const data$ = atom(Promise.reject(error));

    await expect(data$.get()).rejects.toThrow("Failed");
  });
});
```

### Testing Promise State

```ts
import { isPending, isFulfilled, isRejected, trackPromise } from "atomirx";

describe("promise state", () => {
  it("should track pending state", () => {
    const promise = new Promise(() => {}); // Never resolves
    trackPromise(promise);

    expect(isPending(promise)).toBe(true);
    expect(isFulfilled(promise)).toBe(false);
    expect(isRejected(promise)).toBe(false);
  });

  it("should track fulfilled state", async () => {
    const promise = Promise.resolve("done");
    trackPromise(promise);

    await promise;

    expect(isPending(promise)).toBe(false);
    expect(isFulfilled(promise)).toBe(true);
    expect(isRejected(promise)).toBe(false);
  });
});
```

### Testing Derived with Async

```ts
describe("derived with async", () => {
  it("should wait for async source", async () => {
    const data$ = atom(Promise.resolve([1, 2, 3]));
    const sum$ = derived(({ read }) => {
      const data = read(data$);
      return data.reduce((a, b) => a + b, 0);
    });

    expect(await sum$.get()).toBe(6);
  });

  it("should use all() for multiple async", async () => {
    const a$ = atom(Promise.resolve(1));
    const b$ = atom(Promise.resolve(2));

    const sum$ = derived(({ all }) => {
      const [a, b] = all(a$, b$);
      return a + b;
    });

    expect(await sum$.get()).toBe(3);
  });
});
```

### Mocking Fetch

```ts
describe("data fetching", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: "John" }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and store data", async () => {
    const user$ = atom(fetch("/api/user").then((r) => r.json()));

    const user = await user$.get();

    expect(user).toEqual({ name: "John" });
    expect(fetch).toHaveBeenCalledWith("/api/user");
  });
});
```

### Testing Batching

```ts
describe("batch", () => {
  it("should batch multiple updates", () => {
    const a$ = atom(0);
    const b$ = atom(0);
    const listener = vi.fn();

    // Subscribe to both
    a$.on(listener);
    b$.on(listener);

    batch(() => {
      a$.set(1);
      b$.set(2);
    });

    // Listener called once per atom, but in same tick
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
```

---

## Test Utilities

### Helper for Waiting

```ts
async function waitForState<T>(
  atom: DerivedAtom<T>,
  status: "ready" | "error" | "loading"
): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (atom.state().status === status) {
        resolve();
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

// Usage
await waitForState(derived$, "ready");
```

### Helper for Subscriptions

```ts
function collectEmissions<T>(atom: Atom<T>, count: number): Promise<T[]> {
  return new Promise((resolve) => {
    const values: T[] = [];
    const unsubscribe = atom.on(() => {
      values.push(atom.get());
      if (values.length >= count) {
        unsubscribe();
        resolve(values);
      }
    });
  });
}

// Usage
const emissions = await collectEmissions(count$, 3);
expect(emissions).toEqual([1, 2, 3]);
```

---

## Next Steps

- [Core Concepts](./core-concepts.md) - Review fundamentals
- [Async Patterns](./async-patterns.md) - Async testing patterns
- [API Reference](./api-reference.md) - Complete API docs
