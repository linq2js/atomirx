import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import { rx } from "./rx";
import { atom } from "../core/atom";
import { scheduleNotifyHook } from "../core/scheduleNotifyHook";
import { wrappers } from "./strictModeTest";

describe.each(wrappers)("rx - $mode", ({ render }) => {
  beforeEach(() => {
    // Reset to synchronous notification for predictable tests
    scheduleNotifyHook.reset();
  });

  describe("basic usage", () => {
    it("should render value from single atom with selector", () => {
      const count = atom(5);

      render(<div data-testid="result">{rx(count, (get) => get() * 2)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("10");
    });

    it("should render atom value directly when no selector provided", () => {
      const count = atom(42);

      render(<div data-testid="result">{rx(count)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("42");
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

  describe("multiple atoms (array form)", () => {
    it("should render derived value from multiple atoms", () => {
      const firstName = atom("John");
      const lastName = atom("Doe");

      render(
        <div data-testid="result">
          {rx([firstName, lastName], (first, last) => `${first()} ${last()}`)}
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
          {rx([a, b, c], (getA, getB, getC) => getA() + getB() + getC())}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("6");
    });
  });

  describe("reactivity", () => {
    it("should update when source atom changes", () => {
      const count = atom(5);

      render(<div data-testid="result">{rx(count, (get) => get() * 2)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("10");

      act(() => {
        count.set(10);
      });

      expect(screen.getByTestId("result").textContent).toBe("20");
    });

    it("should update when atom changes (no selector)", () => {
      const count = atom(1);

      render(<div data-testid="result">{rx(count)}</div>);

      expect(screen.getByTestId("result").textContent).toBe("1");

      act(() => {
        count.set(99);
      });

      expect(screen.getByTestId("result").textContent).toBe("99");
    });

    it("should update when any dependency changes (array form)", () => {
      const a = atom(1);
      const b = atom(2);

      render(
        <div data-testid="result">
          {rx([a, b], (getA, getB) => getA() + getB())}
        </div>
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

      const selectorFn = vi.fn(
        (getFlag: () => boolean, getA: () => number, getB: () => number) =>
          getFlag() ? getA() : getB()
      );

      render(<div data-testid="result">{rx([flag, a, b], selectorFn)}</div>);

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
          {rx([flag, a, b], (getFlag, getA, getB) =>
            getFlag() ? getA() : getB()
          )}
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
            {rx(user, (get) => JSON.stringify(get()))}
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

      const selector = (get: () => { name: string; age: number }) => {
        selectorCallCount.current++;
        return JSON.stringify(get());
      };

      render(<div data-testid="result">{rx(user, selector, "strict")}</div>);

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
              user,
              (get) => JSON.stringify(get()),
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
        return <div data-testid="result">{rx(count, (get) => get() * 2)}</div>;
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
        <div data-testid="result">{rx(flag, (get) => String(get()))}</div>
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
          {rx(asyncAtom, (get) => {
            try {
              return get() * 2;
            } catch {
              return "loading";
            }
          })}
        </div>
      );

      // Initially loading - selector catches and returns "loading"
      expect(screen.getByTestId("result").textContent).toBe("loading");
    });

    it("should update after async resolves", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });
      const asyncAtom = atom(promise);

      render(
        <div data-testid="result">
          {rx(asyncAtom, (get) => {
            try {
              return get() * 2;
            } catch {
              return "loading";
            }
          })}
        </div>
      );

      expect(screen.getByTestId("result").textContent).toBe("loading");

      await act(async () => {
        resolve!(5);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(screen.getByTestId("result").textContent).toBe("10");
    });
  });
});
