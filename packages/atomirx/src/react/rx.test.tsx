import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import { rx } from "./rx";
import { atom } from "../core/atom";
import { derived } from "../core/derived";
import { scheduleNotifyHook } from "../core/scheduleNotifyHook";
import { wrappers } from "./strictModeTest";
import { SelectContext } from "../core/select";

describe.each(wrappers)("rx - $mode", ({ render }) => {
  beforeEach(() => {
    // Reset to synchronous notification for predictable tests
    scheduleNotifyHook.reset();
  });

  describe("basic usage", () => {
    it("should render value from single atom (shorthand)", () => {
      const count = atom(42);

      render(<div data-testid="result">{rx(count)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("42");
    });

    it("should render derived value with context selector", () => {
      const count = atom(5);

      render(
        <div data-testid="result">{rx(({ get }) => get(count) * 2)}</div>
      );

      expect(screen.getByTestId("result").textContent).toBe("10");
    });

    it("should render string values", () => {
      const name = atom("John");

      render(<div data-testid="result">{rx(name)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("John");
    });

    it("should render null/undefined as empty", () => {
      const value = atom<string | null>(null);

      render(<div data-testid="result">{rx(value)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("");
    });

    it("should render undefined as empty", () => {
      const value = atom<string | undefined>(undefined);

      render(<div data-testid="result">{rx(value)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("");
    });
  });

  describe("multiple atoms with context selector", () => {
    it("should render derived value from multiple atoms", () => {
      const firstName = atom("John");
      const lastName = atom("Doe");

      render(
        <div data-testid="result">
          {rx(({ get }) => `${get(firstName)} ${get(lastName)}`)}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("John Doe");
    });

    it("should render computed value from multiple numeric atoms", () => {
      const a = atom(1);
      const b = atom(2);
      const c = atom(3);

      render(
        <div data-testid="result">
          {rx(({ get }) => get(a) + get(b) + get(c))}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("6");
    });
  });

  describe("reactivity", () => {
    it("should update when source atom changes (shorthand)", () => {
      const count = atom(5);

      render(<div data-testid="result">{rx(count)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("5");

      act(() => {
        count.set(10);
      });

      expect(screen.getByTestId("result").textContent).toBe("10");
    });

    it("should update when source atom changes (context selector)", () => {
      const count = atom(5);

      render(
        <div data-testid="result">{rx(({ get }) => get(count) * 2)}</div>
      );

      expect(screen.getByTestId("result").textContent).toBe("10");

      act(() => {
        count.set(10);
      });

      expect(screen.getByTestId("result").textContent).toBe("20");
    });

    it("should update when any dependency changes", () => {
      const a = atom(1);
      const b = atom(2);

      render(
        <div data-testid="result">{rx(({ get }) => get(a) + get(b))}</div>
      );

      expect(screen.getByTestId("result").textContent).toBe("3");

      act(() => {
        a.set(5);
      });

      expect(screen.getByTestId("result").textContent).toBe("7");

      act(() => {
        b.set(10);
      });

      expect(screen.getByTestId("result").textContent).toBe("15");
    });
  });

  describe("conditional dependencies", () => {
    it("should only re-render when accessed dependencies change", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);

      const selectorFn = vi.fn(({ get }: SelectContext) =>
        get(flag) ? get(a) : get(b)
      );

      render(<div data-testid="result">{rx(selectorFn)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("1");
      const callCount = selectorFn.mock.calls.length;

      // Change b - should NOT trigger re-render since b is not accessed
      act(() => {
        b.set(20);
      });

      // Selector should not have been called again
      expect(selectorFn.mock.calls.length).toBe(callCount);
      expect(screen.getByTestId("result").textContent).toBe("1");
    });

    it("should update subscriptions when dependencies change", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);

      render(
        <div data-testid="result">
          {rx(({ get }) => (get(flag) ? get(a) : get(b)))}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("1");

      // Change flag to false - now b should be accessed
      act(() => {
        flag.set(false);
      });

      expect(screen.getByTestId("result").textContent).toBe("2");

      // Now change b - should trigger re-render
      act(() => {
        b.set(20);
      });

      expect(screen.getByTestId("result").textContent).toBe("20");
    });
  });

  describe("equals option", () => {
    it("should use shallow equality by default", () => {
      const user = atom({ name: "John", age: 30 });
      const renderCount = { current: 0 };

      const TestComponent = () => {
        renderCount.current++;
        return (
          <div data-testid="result">
            {rx(({ get }) => JSON.stringify(get(user)))}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId("result").textContent).toBe(
        '{"name":"John","age":30}'
      );
      const initialRenderCount = renderCount.current;

      // Set same content but different reference - should NOT re-render with shallow equality
      act(() => {
        user.set({ name: "John", age: 30 });
      });

      expect(renderCount.current).toBe(initialRenderCount);
    });

    it("should use strict equality when specified", () => {
      const user = atom({ name: "John", age: 30 });
      const selectorCallCount = { current: 0 };

      const selector = ({ get }: SelectContext) => {
        selectorCallCount.current++;
        return JSON.stringify(get(user));
      };

      render(<div data-testid="result">{rx(selector, "strict")}</div>);

      expect(screen.getByTestId("result").textContent).toBe(
        '{"name":"John","age":30}'
      );
      const initialCallCount = selectorCallCount.current;

      // Set same content but different reference - with strict equality,
      // the selector result (string) will be different reference, causing re-render
      act(() => {
        user.set({ name: "John", age: 30 });
      });

      // Selector should have been called again due to atom change
      expect(selectorCallCount.current).toBeGreaterThan(initialCallCount);
    });

    it("should use custom equality function", () => {
      const user = atom({ id: 1, name: "John" });
      const renderCount = { current: 0 };

      const TestComponent = () => {
        renderCount.current++;
        return (
          <div data-testid="result">
            {rx(
              ({ get }) => JSON.stringify(get(user)),
              (a, b) => a === b // Compare stringified values
            )}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId("result").textContent).toBe(
        '{"id":1,"name":"John"}'
      );
      const initialRenderCount = renderCount.current;

      // Same stringified value - should NOT re-render
      act(() => {
        user.set({ id: 1, name: "John" });
      });

      expect(renderCount.current).toBe(initialRenderCount);
    });
  });

  describe("memoization", () => {
    it("should not re-render parent when only rx value changes", () => {
      const count = atom(5);
      const parentRenderCount = { current: 0 };

      const Parent = () => {
        parentRenderCount.current++;
        return (
          <div data-testid="result">{rx(({ get }) => get(count) * 2)}</div>
        );
      };

      render(<Parent />);

      expect(screen.getByTestId("result").textContent).toBe("10");
      const initialParentRenderCount = parentRenderCount.current;

      act(() => {
        count.set(10);
      });

      expect(screen.getByTestId("result").textContent).toBe("20");
      // Parent should not re-render - only the memoized Rx component should
      expect(parentRenderCount.current).toBe(initialParentRenderCount);
    });
  });

  describe("edge cases", () => {
    it("should handle zero value", () => {
      const count = atom(0);

      render(<div data-testid="result">{rx(count)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("0");
    });

    it("should handle false value", () => {
      const flag = atom(false);

      render(
        <div data-testid="result">{rx(({ get }) => String(get(flag)))}</div>
      );

      expect(screen.getByTestId("result").textContent).toBe("false");
    });

    it("should handle empty string", () => {
      const text = atom("");

      render(<div data-testid="result">{rx(text)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("");
    });

    it("should handle rapid updates", () => {
      const count = atom(0);

      render(<div data-testid="result">{rx(count)}</div>);

      act(() => {
        for (let i = 1; i <= 100; i++) {
          count.set(i);
        }
      });

      expect(screen.getByTestId("result").textContent).toBe("100");
    });
  });

  describe("async atoms", () => {
    it("should handle selector that catches loading state", () => {
      const asyncAtom = atom(Promise.resolve(10));

      render(
        <div data-testid="result">
          {rx(({ get }) => {
            try {
              return get(asyncAtom) * 2;
            } catch {
              return "loading";
            }
          })}
        </div>
      );

      // Initially loading - selector catches and returns "loading"
      expect(screen.getByTestId("result").textContent).toBe("loading");
    });

    it("should update when source atom changes", async () => {
      // v2: Test with sync atoms - derived atoms have async behavior
      // For simpler reactivity testing, use sync atoms directly
      const sourceAtom = atom(5);

      render(
        <div data-testid="result">
          {rx(({ get }) => get(sourceAtom) * 2)}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("10");

      // Update source and verify updates
      await act(async () => {
        sourceAtom.set(10);
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("result").textContent).toBe("20");
    });
  });

  describe("async utilities", () => {
    it("should support all() for multiple atoms", async () => {
      // v2: Use sync atoms or derived atoms for proper reactivity
      const a = atom(1);
      const b = atom(2);

      render(
        <div data-testid="result">
          {rx(({ all }) => {
            const [valA, valB] = all(a, b);
            return valA + valB;
          })}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("3");

      // Update and verify
      await act(async () => {
        a.set(10);
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("result").textContent).toBe("12");
    });
  });
});
