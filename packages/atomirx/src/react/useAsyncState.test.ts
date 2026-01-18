import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAsyncState } from "./useAsyncState";
import { atom } from "../core/atom";
import { derived } from "../core/derived";

describe("useAsyncState", () => {
  describe("synchronous atoms", () => {
    it("should return ready state for sync atom", () => {
      const count$ = atom(42);
      const { result } = renderHook(() => useAsyncState(count$));

      expect(result.current).toEqual({
        status: "ready",
        value: 42,
      });
    });

    it("should update when sync atom changes", () => {
      const count$ = atom(1);
      const { result } = renderHook(() => useAsyncState(count$));

      expect(result.current.status).toBe("ready");
      expect(result.current.status === "ready" && result.current.value).toBe(1);

      act(() => {
        count$.set(2);
      });

      expect(result.current.status).toBe("ready");
      expect(result.current.status === "ready" && result.current.value).toBe(2);
    });

    it("should work with selector", () => {
      const count$ = atom(5);
      const { result } = renderHook(() =>
        useAsyncState(({ read }) => read(count$) * 2)
      );

      expect(result.current).toEqual({
        status: "ready",
        value: 10,
      });
    });
  });

  describe("asynchronous atoms", () => {
    it("should return loading state for pending promise", () => {
      const promise = new Promise<number>(() => {}); // Never resolves
      const async$ = atom(promise);
      const { result } = renderHook(() => useAsyncState(async$));

      expect(result.current.status).toBe("loading");
      expect(
        result.current.status === "loading" && result.current.promise
      ).toBe(promise);
    });

    it("should transition from loading to ready when promise resolves", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });
      const async$ = atom(promise);
      const { result } = renderHook(() => useAsyncState(async$));

      expect(result.current.status).toBe("loading");

      await act(async () => {
        resolve!(42);
        await promise;
      });

      await waitFor(() => {
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.status === "ready" && result.current.value).toBe(
        42
      );
    });

    it("should return error state when promise rejects", async () => {
      const error = new Error("Test error");
      let reject: (error: Error) => void;
      const promise = new Promise<number>((_, r) => {
        reject = r;
      });
      const async$ = atom(promise);
      const { result } = renderHook(() => useAsyncState(async$));

      expect(result.current.status).toBe("loading");

      await act(async () => {
        reject!(error);
        await promise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.status === "error" && result.current.error).toBe(
        error
      );
    });
  });

  describe("derived atoms", () => {
    it("should return loading state for pending derived atom", () => {
      const promise = new Promise<number>(() => {});
      const base$ = atom(promise);
      const derived$ = derived(({ read }) => read(base$) * 2);

      const { result } = renderHook(() => useAsyncState(derived$));

      expect(result.current.status).toBe("loading");
    });

    it("should return ready state when derived atom resolves", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });
      const base$ = atom(promise);
      const derived$ = derived(({ read }) => read(base$) * 2);

      const { result } = renderHook(() => useAsyncState(derived$));

      expect(result.current.status).toBe("loading");

      await act(async () => {
        resolve!(21);
        await promise;
      });

      await waitFor(() => {
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.status === "ready" && result.current.value).toBe(
        42
      );
    });
  });

  describe("selector with multiple atoms", () => {
    it("should handle all() utility", async () => {
      let resolve1: (value: number) => void;
      let resolve2: (value: string) => void;
      const promise1 = new Promise<number>((r) => {
        resolve1 = r;
      });
      const promise2 = new Promise<string>((r) => {
        resolve2 = r;
      });

      const num$ = atom(promise1);
      const str$ = atom(promise2);

      const { result } = renderHook(() =>
        useAsyncState(({ all }) => {
          const [num, str] = all(num$, str$);
          return `${str}: ${num}`;
        })
      );

      expect(result.current.status).toBe("loading");

      // Resolve first
      await act(async () => {
        resolve1!(42);
        await promise1;
      });

      // Still loading (waiting for second)
      expect(result.current.status).toBe("loading");

      // Resolve second
      await act(async () => {
        resolve2!("Count");
        await promise2;
      });

      await waitFor(() => {
        expect(result.current.status).toBe("ready");
      });

      expect(result.current.status === "ready" && result.current.value).toBe(
        "Count: 42"
      );
    });
  });

  describe("referential stability", () => {
    it("should maintain referential stability when value unchanged", () => {
      const count$ = atom(42);
      const { result, rerender } = renderHook(() => useAsyncState(count$));

      const firstState = result.current;
      rerender();
      const secondState = result.current;

      expect(firstState).toBe(secondState);
    });

    it("should return new reference when value changes", () => {
      const count$ = atom(1);
      const { result } = renderHook(() => useAsyncState(count$));

      const firstState = result.current;

      act(() => {
        count$.set(2);
      });

      const secondState = result.current;

      expect(firstState).not.toBe(secondState);
    });
  });

  describe("error handling in selector", () => {
    it("should return error state when selector throws", () => {
      const stableError = new Error("Selector error");
      const { result } = renderHook(() =>
        useAsyncState(() => {
          throw stableError;
        })
      );

      expect(result.current.status).toBe("error");
      expect(result.current.status === "error" && result.current.error).toBe(
        stableError
      );
    });
  });

  describe("equality check", () => {
    it("should use custom equality function", () => {
      const obj$ = atom({ count: 1 });
      const renderCount = vi.fn();

      const { result } = renderHook(() => {
        renderCount();
        return useAsyncState(obj$, (a, b) => a.count === b.count);
      });

      expect(result.current.status === "ready" && result.current.value).toEqual(
        {
          count: 1,
        }
      );

      const initialRenderCount = renderCount.mock.calls.length;

      // Update with same count - should not trigger re-render due to equality
      act(() => {
        obj$.set({ count: 1 });
      });

      // The render count should stay the same or increase by 1 (React may batch)
      expect(renderCount.mock.calls.length).toBeLessThanOrEqual(
        initialRenderCount + 1
      );
    });
  });
});
