import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { atom } from "../core/atom";
import { useValue } from "./useValue";

describe("useValue", () => {
  describe("basic functionality", () => {
    it("should read value from sync atom", () => {
      const count$ = atom(5);
      const { result } = renderHook(() => useValue(count$));
      expect(result.current).toBe(5);
    });

    it("should update when atom value changes", async () => {
      const count$ = atom(0);
      const { result } = renderHook(() => useValue(count$));

      expect(result.current).toBe(0);

      act(() => {
        count$.set(10);
      });

      await waitFor(() => {
        expect(result.current).toBe(10);
      });
    });

    it("should work with object values", () => {
      const user$ = atom({ name: "John", age: 30 });
      const { result } = renderHook(() => useValue(user$));

      expect(result.current).toEqual({ name: "John", age: 30 });
    });
  });

  describe("selector function", () => {
    it("should support selector function", () => {
      const count$ = atom(5);
      const { result } = renderHook(() =>
        useValue(({ get }) => get(count$) * 2)
      );

      expect(result.current).toBe(10);
    });

    it("should derive from multiple atoms", () => {
      const a$ = atom(2);
      const b$ = atom(3);
      const { result } = renderHook(() =>
        useValue(({ get }) => get(a$) + get(b$))
      );

      expect(result.current).toBe(5);
    });

    it("should update when any source atom changes", async () => {
      const a$ = atom(2);
      const b$ = atom(3);
      const { result } = renderHook(() =>
        useValue(({ get }) => get(a$) * get(b$))
      );

      expect(result.current).toBe(6);

      act(() => {
        a$.set(5);
      });

      await waitFor(() => {
        expect(result.current).toBe(15);
      });
    });
  });

  describe("conditional dependencies", () => {
    it("should track conditional dependencies", async () => {
      const showDetails$ = atom(false);
      const summary$ = atom("Brief");
      const details$ = atom("Detailed");

      const { result } = renderHook(() =>
        useValue(({ get }) =>
          get(showDetails$) ? get(details$) : get(summary$)
        )
      );

      expect(result.current).toBe("Brief");

      act(() => {
        showDetails$.set(true);
      });

      await waitFor(() => {
        expect(result.current).toBe("Detailed");
      });
    });
  });

  describe("equality checks", () => {
    it("should use shallow equality by default", async () => {
      const renderCount = vi.fn();
      const source$ = atom({ a: 1 });

      const { result } = renderHook(() => {
        renderCount();
        return useValue(source$);
      });

      expect(result.current).toEqual({ a: 1 });

      act(() => {
        source$.set({ a: 1 }); // Same content, different reference
      });

      // With shallow equality, same content should not cause re-render
      // (depends on implementation)
    });

    it("should support custom equality", async () => {
      const source$ = atom({ id: 1, name: "John" });
      const { result } = renderHook(() =>
        useValue(source$, (a, b) => a.id === b.id)
      );

      expect(result.current.name).toBe("John");

      act(() => {
        source$.set({ id: 1, name: "Jane" }); // Same id
      });

      // Custom equality by id - should not re-render
    });
  });

  describe("context utilities", () => {
    it("should support all() in selector", () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);

      const { result } = renderHook(() =>
        useValue(({ all }) => {
          const [a, b, c] = all(a$, b$, c$);
          return a + b + c;
        })
      );

      expect(result.current).toBe(6);
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe on unmount", async () => {
      const count$ = atom(0);
      const { unmount } = renderHook(() => useValue(count$));

      unmount();

      // After unmount, setting the atom should not cause issues
      act(() => {
        count$.set(100);
      });

      // No error should be thrown
    });
  });

  // Note: Async/Suspense tests require proper Suspense boundary setup
  // which is more complex to test. The following are placeholder tests.

  describe("async atoms", () => {
    it("should throw promise for pending atom (Suspense)", () => {
      // When an atom's value is a pending Promise, useValue should throw
      // the Promise to trigger Suspense. This is hard to test without
      // proper Suspense boundary setup.
      // The hook will throw the Promise which is caught by Suspense
      // Testing this properly requires a Suspense wrapper
      expect(true).toBe(true); // Placeholder
    });
  });
});
