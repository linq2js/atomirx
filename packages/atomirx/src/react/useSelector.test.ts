import { describe, it, expect, vi } from "vitest";
import { act } from "@testing-library/react";
import { useSelector } from "./useSelector";
import { atom } from "../core/atom";
import { wrappers } from "./strictModeTest";
import { SelectContext } from "../core/select";

describe.each(wrappers)("useSelector - $mode", ({ renderHook }) => {
  describe("basic usage", () => {
    it("should select value from single atom", () => {
      const count = atom(5);

      const { result } = renderHook(() =>
        useSelector(({ get }) => get(count) * 2)
      );

      expect(result.current).toBe(10);
    });

    it("should return atom value directly with shorthand", () => {
      const count = atom(42);

      // Shorthand: pass atom directly
      const { result } = renderHook(() => useSelector(count));

      expect(result.current).toBe(42);
    });

    it("should update when atom changes (shorthand)", () => {
      const count = atom(1);

      const { result } = renderHook(() => useSelector(count));

      expect(result.current).toBe(1);

      act(() => {
        count.set(99);
      });

      expect(result.current).toBe(99);
    });

    it("should return atom value directly with context selector", () => {
      const count = atom(42);

      const { result } = renderHook(() => useSelector(({ get }) => get(count)));

      expect(result.current).toBe(42);
    });

    it("should update when atom changes", () => {
      const count = atom(1);

      const { result } = renderHook(() => useSelector(({ get }) => get(count)));

      expect(result.current).toBe(1);

      act(() => {
        count.set(99);
      });

      expect(result.current).toBe(99);
    });

    it("should select value from multiple atoms", () => {
      const a = atom(1);
      const b = atom(2);

      const { result } = renderHook(() =>
        useSelector(({ get }) => get(a) + get(b))
      );

      expect(result.current).toBe(3);
    });

    it("should select value from multiple atoms (three or more)", () => {
      const a = atom(1);
      const b = atom(2);
      const c = atom(3);

      const { result } = renderHook(() =>
        useSelector(({ get }) => get(a) + get(b) + get(c))
      );

      expect(result.current).toBe(6);
    });
  });

  describe("reactivity", () => {
    it("should re-render when source atom changes", () => {
      const count = atom(5);

      const { result } = renderHook(() =>
        useSelector(({ get }) => get(count) * 2)
      );

      expect(result.current).toBe(10);

      act(() => {
        count.set(10);
      });

      expect(result.current).toBe(20);
    });

    it("should re-render when any dependency changes", () => {
      const a = atom(1);
      const b = atom(2);

      const { result } = renderHook(() =>
        useSelector(({ get }) => get(a) + get(b))
      );

      expect(result.current).toBe(3);

      act(() => {
        a.set(5);
      });

      expect(result.current).toBe(7);

      act(() => {
        b.set(10);
      });

      expect(result.current).toBe(15);
    });
  });

  describe("conditional dependencies", () => {
    it("should only subscribe to accessed dependencies", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);

      const selectorFn = vi.fn(({ get }: SelectContext) =>
        get(flag) ? get(a) : get(b)
      );

      const { result } = renderHook(() => useSelector(selectorFn));

      expect(result.current).toBe(1);
      const callCount = selectorFn.mock.calls.length;

      // Change b - should NOT trigger re-render since b is not accessed
      act(() => {
        b.set(20);
      });

      // Selector should not have been called again
      expect(selectorFn.mock.calls.length).toBe(callCount);
      expect(result.current).toBe(1);
    });

    it("should update subscriptions when dependencies change", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);

      const { result } = renderHook(() =>
        useSelector(({ get }) => (get(flag) ? get(a) : get(b)))
      );

      expect(result.current).toBe(1);

      // Change flag to false - now b should be accessed
      act(() => {
        flag.set(false);
      });

      expect(result.current).toBe(2);

      // Now change b - should trigger re-render
      act(() => {
        b.set(20);
      });

      expect(result.current).toBe(20);
    });
  });

  describe("equals", () => {
    it("should use shallow equality by default", () => {
      const user = atom({ name: "John", age: 30 });
      const renderCount = { current: 0 };

      const { result } = renderHook(() => {
        renderCount.current++;
        return useSelector(({ get }) => get(user));
      });

      expect(result.current).toEqual({ name: "John", age: 30 });
      const initialRenderCount = renderCount.current;

      // Set same content but different reference - should NOT re-render with shallow equality (default)
      act(() => {
        user.set({ name: "John", age: 30 });
      });

      expect(renderCount.current).toBe(initialRenderCount);
    });

    it("should use strict equality when specified", () => {
      const user = atom({ name: "John", age: 30 });
      const renderCount = { current: 0 };

      const { result } = renderHook(() => {
        renderCount.current++;
        return useSelector(({ get }) => get(user), "strict");
      });

      expect(result.current).toEqual({ name: "John", age: 30 });
      const initialRenderCount = renderCount.current;

      // Set same content but different reference - should re-render with strict equality
      act(() => {
        user.set({ name: "John", age: 30 });
      });

      expect(renderCount.current).toBeGreaterThan(initialRenderCount);
    });

    it("should use custom equality function", () => {
      const user = atom({ id: 1, name: "John" });
      const renderCount = { current: 0 };

      const { result } = renderHook(() => {
        renderCount.current++;
        return useSelector(
          ({ get }) => get(user),
          (a, b) => a?.id === b?.id
        );
      });

      expect(result.current).toEqual({ id: 1, name: "John" });
      const initialRenderCount = renderCount.current;

      // Same id, different name - should NOT re-render
      act(() => {
        user.set({ id: 1, name: "Jane" });
      });

      expect(renderCount.current).toBe(initialRenderCount);

      // Different id - should re-render
      act(() => {
        user.set({ id: 2, name: "Jane" });
      });

      expect(renderCount.current).toBeGreaterThan(initialRenderCount);
    });
  });

  describe("async atoms", () => {
    it("should return undefined while loading", () => {
      const asyncAtom = atom(Promise.resolve(10));

      const { result } = renderHook(() =>
        useSelector(({ get }) => {
          try {
            return get(asyncAtom) * 2;
          } catch {
            return undefined;
          }
        })
      );

      // Initially loading - selector throws, we catch and return undefined
      expect(result.current).toBeUndefined();
    });

    it("should update after async resolves", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });
      const asyncAtom = atom(promise);

      const { result } = renderHook(() =>
        useSelector(({ get }) => {
          try {
            return get(asyncAtom) * 2;
          } catch {
            return undefined;
          }
        })
      );

      expect(result.current).toBeUndefined();

      await act(async () => {
        resolve!(5);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current).toBe(10);
    });
  });

  describe("async utilities", () => {
    it("should support all() for multiple async atoms", async () => {
      const a = atom(Promise.resolve(1));
      const b = atom(Promise.resolve(2));

      const { result } = renderHook(() =>
        useSelector(({ all }) => {
          try {
            const [valA, valB] = all([a, b]);
            return valA + valB;
          } catch {
            return undefined;
          }
        })
      );

      // Initially loading
      expect(result.current).toBeUndefined();

      // Wait for resolution
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current).toBe(3);
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe on unmount", () => {
      const count = atom(5);

      const { result, unmount } = renderHook(() =>
        useSelector(({ get }) => get(count) * 2)
      );

      expect(result.current).toBe(10);

      unmount();

      // After unmount, changing the atom should not cause issues
      act(() => {
        count.set(20);
      });

      // No error should occur
    });
  });
});
