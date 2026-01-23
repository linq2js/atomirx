import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAction } from "./useAction";
import { atom } from "../core/atom";
import { act } from "react";
import { wrappers } from "./strictModeTest";

describe.each(wrappers)("useAction - $mode", ({ mode, renderHook }) => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start with idle status when lazy is true (default)", () => {
      const fn = vi.fn(() => "result");

      const { result } = renderHook(() => useAction(fn));

      expect(result.current.status).toBe("idle");
      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(fn).not.toHaveBeenCalled();
    });

    it("should execute on mount when lazy is false", () => {
      const fn = vi.fn(() => "result");

      const { result } = renderHook(() => useAction(fn, { lazy: false }));

      // Sync function completes immediately, so status is success
      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe("result");
      // In strict mode, effects run twice
      expect(fn).toHaveBeenCalledTimes(mode === "strict" ? 2 : 1);
    });

    it("should start with loading status when lazy is false with async fn", () => {
      const fn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("result"), 1000);
          })
      );

      const { result } = renderHook(() => useAction(fn, { lazy: false }));

      expect(result.current.status).toBe("loading");
      // In strict mode, effects run twice
      expect(fn).toHaveBeenCalledTimes(mode === "strict" ? 2 : 1);
    });
  });

  describe("return shape", () => {
    it("should return callable function with status, result, error, abort, reset properties", () => {
      const fn = vi.fn(() => "result");

      const { result } = renderHook(() => useAction(fn));

      // Should be callable
      expect(typeof result.current).toBe("function");
      // Should have state properties
      expect(result.current).toHaveProperty("status");
      expect(result.current).toHaveProperty("result");
      expect(result.current).toHaveProperty("error");
      // Should have API methods
      expect(result.current).toHaveProperty("abort");
      expect(typeof result.current.abort).toBe("function");
      expect(result.current).toHaveProperty("reset");
      expect(typeof result.current.reset).toBe("function");
    });
  });

  describe("synchronous actions", () => {
    it("should transition to success on sync function", () => {
      const fn = vi.fn(() => "sync-result");

      const { result } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe("sync-result");
      expect(result.current.error).toBeUndefined();
    });

    it("should transition to error when sync function throws", async () => {
      const error = new Error("sync-error");
      const fn = vi.fn((): void => {
        throw error;
      });

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        // calling action returns rejected promise, doesn't throw
        const promise = result.current();
        await expect(promise).rejects.toBe(error);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toBe(error);
    });

    it("should return rejected promise for sync errors (no re-throw)", async () => {
      const error = new Error("sync-error");
      const fn = vi.fn((): string => {
        throw error;
      });

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        // Does not throw synchronously
        const promise = result.current();
        // But the promise rejects
        await expect(promise).rejects.toBe(error);
      });
    });

    it("should return promise that resolves with sync result", async () => {
      const fn = vi.fn(() => 42);

      const { result } = renderHook(() => useAction(fn));

      let returnValue: number | undefined;
      await act(async () => {
        returnValue = await result.current();
      });

      expect(returnValue).toBe(42);
    });

    it("should return abortable promise even for sync functions", () => {
      const fn = vi.fn(() => 42);

      const { result } = renderHook(() => useAction(fn));

      let promise: PromiseLike<number> & { abort: () => void };
      act(() => {
        promise = result.current();
      });

      expect(promise!).toHaveProperty("abort");
      expect(typeof promise!.abort).toBe("function");
      expect(typeof promise!.then).toBe("function");
    });
  });

  describe("asynchronous actions", () => {
    it("should transition through loading to success", async () => {
      let resolve: (value: string) => void;
      const promise = new Promise<string>((r) => {
        resolve = r;
      });
      const fn = vi.fn(() => promise);

      const { result } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(result.current.status).toBe("loading");
      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toBeUndefined();

      await act(async () => {
        resolve!("async-result");
        await promise;
      });

      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe("async-result");
      expect(result.current.error).toBeUndefined();
    });

    it("should transition through loading to error on rejection", async () => {
      const error = new Error("async-error");
      let reject: (error: Error) => void;
      const promise = new Promise<string>((_, r) => {
        reject = r;
      });
      const fn = vi.fn(() => promise);

      const { result } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(result.current.status).toBe("loading");

      await act(async () => {
        reject!(error);
        await promise.catch(() => {});
      });

      expect(result.current.status).toBe("error");
      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toBe(error);
    });

    it("should return abortable promise from action call", async () => {
      let resolve: (value: string) => void;
      const promise = new Promise<string>((r) => {
        resolve = r;
      });
      const fn = vi.fn(() => promise);

      const { result } = renderHook(() => useAction(fn));

      let returnValue: PromiseLike<string> & { abort: () => void };
      act(() => {
        returnValue = result.current() as any;
      });

      expect(returnValue!).toHaveProperty("abort");
      expect(typeof returnValue!.abort).toBe("function");
      expect(typeof returnValue!.then).toBe("function");

      await act(async () => {
        resolve!("result");
        await returnValue;
      });
    });
  });

  describe("AbortSignal", () => {
    it("should pass AbortSignal to the function", () => {
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return "result";
      });

      const { result } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should create new AbortSignal per call", () => {
      const signals: AbortSignal[] = [];
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return "result";
      });

      const { result } = renderHook(() => useAction(fn, { exclusive: false }));

      act(() => {
        result.current();
        result.current();
      });

      expect(signals).toHaveLength(2);
      expect(signals[0]).not.toBe(signals[1]);
    });

    it("should abort previous signal when exclusive is true (default)", async () => {
      const signals: AbortSignal[] = [];
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(signals[0].aborted).toBe(false);

      act(() => {
        result.current();
      });

      expect(signals[0].aborted).toBe(true);
      expect(signals[1].aborted).toBe(false);
    });

    it("should NOT abort previous signal when exclusive is false", () => {
      const signals: AbortSignal[] = [];
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result } = renderHook(() => useAction(fn, { exclusive: false }));

      act(() => {
        result.current();
        result.current();
      });

      expect(signals[0].aborted).toBe(false);
      expect(signals[1].aborted).toBe(false);
    });

    it("should abort on unmount when exclusive is true", () => {
      let capturedSignal: AbortSignal;
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result, unmount } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(capturedSignal!.aborted).toBe(false);

      unmount();

      expect(capturedSignal!.aborted).toBe(true);
    });

    it("should NOT abort on unmount when exclusive is false", () => {
      let capturedSignal: AbortSignal;
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result, unmount } = renderHook(() =>
        useAction(fn, { exclusive: false })
      );

      act(() => {
        result.current();
      });

      expect(capturedSignal!.aborted).toBe(false);

      unmount();

      expect(capturedSignal!.aborted).toBe(false);
    });

    it("should allow manual abort via abort() method", () => {
      let capturedSignal: AbortSignal;
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result } = renderHook(() => useAction(fn, { exclusive: false }));

      act(() => {
        result.current();
      });

      expect(capturedSignal!.aborted).toBe(false);

      act(() => {
        result.current.abort();
      });

      expect(capturedSignal!.aborted).toBe(true);
    });

    it("should allow manual abort via returned promise.abort()", () => {
      let capturedSignal: AbortSignal;
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result } = renderHook(() => useAction(fn, { exclusive: false }));

      let returnedPromise: PromiseLike<string> & { abort: () => void };
      act(() => {
        returnedPromise = result.current() as any;
      });

      expect(capturedSignal!.aborted).toBe(false);

      act(() => {
        returnedPromise.abort();
      });

      expect(capturedSignal!.aborted).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset state to idle after success", async () => {
      const fn = vi.fn(() => "result");

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        await result.current();
      });

      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe("result");

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it("should reset state to idle after error", async () => {
      const error = new Error("test-error");
      const fn = vi.fn(() => {
        throw error;
      });

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        await result.current().then(
          () => {},
          () => {}
        );
      });

      expect(result.current.status).toBe("error");
      expect(result.current.error).toBe(error);

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it("should abort in-flight request when reset is called with exclusive: true", () => {
      let capturedSignal: AbortSignal;
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result } = renderHook(() => useAction(fn));

      act(() => {
        result.current();
      });

      expect(result.current.status).toBe("loading");
      expect(capturedSignal!.aborted).toBe(false);

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(capturedSignal!.aborted).toBe(true);
    });

    it("should NOT abort in-flight request when reset is called with exclusive: false", () => {
      let capturedSignal: AbortSignal;
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { result } = renderHook(() => useAction(fn, { exclusive: false }));

      act(() => {
        result.current();
      });

      expect(result.current.status).toBe("loading");
      expect(capturedSignal!.aborted).toBe(false);

      act(() => {
        result.current.reset();
      });

      // State is reset but request continues
      expect(result.current.status).toBe("idle");
      expect(capturedSignal!.aborted).toBe(false);
    });

    it("should allow re-dispatch after reset", async () => {
      let counter = 0;
      const fn = vi.fn(() => ++counter);

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        await result.current();
      });

      expect(result.current.result).toBe(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");

      await act(async () => {
        await result.current();
      });

      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe(2);
    });
  });

  describe("eager execution (lazy: false)", () => {
    it("should execute on mount when lazy is false", () => {
      const fn = vi.fn(() => "result");

      renderHook(() => useAction(fn, { lazy: false }));

      // In strict mode, effects run twice
      expect(fn).toHaveBeenCalledTimes(mode === "strict" ? 2 : 1);
    });

    it("should re-execute when deps change", () => {
      const fn = vi.fn(() => "result");

      const { rerender } = renderHook(
        ({ dep }) => useAction(fn, { lazy: false, deps: [dep] }),
        { initialProps: { dep: 1 } }
      );

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);

      rerender({ dep: 2 });

      // +1 for dep change
      expect(fn).toHaveBeenCalledTimes(initialCalls + 1);
    });

    it("should NOT re-execute when deps are the same", () => {
      const fn = vi.fn(() => "result");

      const { rerender } = renderHook(
        ({ dep }) => useAction(fn, { lazy: false, deps: [dep] }),
        { initialProps: { dep: 1 } }
      );

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);

      rerender({ dep: 1 });

      // No additional calls when deps are the same
      expect(fn).toHaveBeenCalledTimes(initialCalls);
    });

    it("should abort previous when deps change and exclusive is true", async () => {
      const signals: AbortSignal[] = [];
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 1000);
        });
      });

      const { rerender } = renderHook(
        ({ dep }) => useAction(fn, { lazy: false, deps: [dep] }),
        { initialProps: { dep: 1 } }
      );

      // In strict mode, first signal is aborted by second mount effect
      const firstSignalIndex = mode === "strict" ? 1 : 0;
      expect(signals[firstSignalIndex].aborted).toBe(false);

      rerender({ dep: 2 });

      // Previous signal should be aborted
      expect(signals[firstSignalIndex].aborted).toBe(true);
      // New signal should not be aborted
      expect(signals[signals.length - 1].aborted).toBe(false);
    });
  });

  describe("stale closure prevention", () => {
    it("should ignore stale async results", async () => {
      let resolvers: Array<(value: string) => void> = [];
      const fn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolvers.push(resolve);
          })
      );

      const { result } = renderHook(() => useAction(fn));

      // First call
      act(() => {
        result.current();
      });

      // Second call (should abort first)
      act(() => {
        result.current();
      });

      // Resolve first (stale) - should be ignored
      await act(async () => {
        resolvers[0]("first-result");
        await Promise.resolve();
      });

      // State should still be loading (waiting for second)
      expect(result.current.status).toBe("loading");

      // Resolve second
      await act(async () => {
        resolvers[1]("second-result");
        await Promise.resolve();
      });

      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe("second-result");
    });
  });

  describe("edge cases", () => {
    it("should handle rapid calls", async () => {
      let counter = 0;
      const fn = vi.fn(
        () =>
          new Promise<number>((resolve) => {
            const current = ++counter;
            setTimeout(() => resolve(current), 100);
          })
      );

      const { result } = renderHook(() => useAction(fn));

      // Rapid fire calls
      act(() => {
        result.current();
        result.current();
        result.current();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      // Only the last result should be used
      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe(3);
    });

    it("should handle re-call after error", async () => {
      let shouldFail = true;
      const fn = vi.fn(() => {
        if (shouldFail) {
          throw new Error("fail");
        }
        return "success";
      });

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        // First call returns rejected promise
        await result.current().then(
          () => {},
          () => {}
        );
      });

      expect(result.current.status).toBe("error");

      shouldFail = false;

      await act(async () => {
        await result.current();
      });

      expect(result.current.status).toBe("success");
      expect(result.current.result).toBe("success");
    });

    it("should handle re-call after success", async () => {
      let counter = 0;
      const fn = vi.fn(() => ++counter);

      const { result } = renderHook(() => useAction(fn));

      await act(async () => {
        await result.current();
      });

      expect(result.current.result).toBe(1);

      await act(async () => {
        await result.current();
      });

      expect(result.current.result).toBe(2);
    });
  });

  describe("chaining operations", () => {
    it("should support async/await chaining with sync functions", async () => {
      const fn1 = vi.fn(() => 1);
      const fn2 = vi.fn(() => 2);

      const { result: result1 } = renderHook(() => useAction(fn1));
      const { result: result2 } = renderHook(() => useAction(fn2));

      let values: number[] = [];
      await act(async () => {
        const value1 = await result1.current();
        values.push(value1);
        const value2 = await result2.current();
        values.push(value2);
      });

      expect(values).toEqual([1, 2]);
    });

    it("should support async/await chaining with async functions", async () => {
      const fn1 = vi.fn(async () => {
        return 1;
      });
      const fn2 = vi.fn(async () => {
        return 2;
      });

      const { result: result1 } = renderHook(() => useAction(fn1));
      const { result: result2 } = renderHook(() => useAction(fn2));

      let values: number[] = [];
      await act(async () => {
        values.push(await result1.current());
        values.push(await result2.current());
      });

      expect(values).toEqual([1, 2]);
    });

    it("should stop chain on error with try/catch", async () => {
      const error = new Error("chain-error");
      const fn1 = vi.fn(() => {
        throw error;
      });
      const fn2 = vi.fn(() => "should not run");

      const { result: result1 } = renderHook(() => useAction(fn1));
      const { result: result2 } = renderHook(() => useAction(fn2));

      let caughtError: unknown;
      await act(async () => {
        try {
          await result1.current();
          await result2.current();
        } catch (e) {
          caughtError = e;
        }
      });

      expect(caughtError).toBe(error);
      expect(fn2).not.toHaveBeenCalled();
    });
  });

  describe("atom deps", () => {
    it("should execute when atom in deps changes", () => {
      const userId = atom(1);
      const fn = vi.fn(() => `user-${userId.get()}`);

      const { result } = renderHook(() =>
        useAction(fn, { lazy: false, deps: [userId] })
      );

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);
      expect(result.current.result).toBe("user-1");

      // Change atom value
      act(() => {
        userId.set(2);
      });

      expect(fn).toHaveBeenCalledTimes(initialCalls + 1);
      expect(result.current.result).toBe("user-2");
    });

    it("should NOT re-execute when atom value is shallowly equal", () => {
      // Use atom with shallow equals so it doesn't notify on shallow equal values
      const config = atom({ page: 1 }, { equals: "shallow" });
      const fn = vi.fn(() => `page-${config.get()?.page}`);

      renderHook(() => useAction(fn, { lazy: false, deps: [config] }));

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);

      // Set same value (different reference but shallow equal)
      // Atom with equals: "shallow" won't notify
      act(() => {
        config.set({ page: 1 });
      });

      // Should NOT re-execute because atom didn't notify (shallow equal)
      expect(fn).toHaveBeenCalledTimes(initialCalls);
    });

    it("should NOT re-execute when selected atom values are shallowly equal", () => {
      // Even if atom notifies, if the selected values are shallow equal,
      // the effect should not re-run
      const userId = atom(1);
      const fn = vi.fn(() => `user-${userId.get()}`);

      renderHook(() => useAction(fn, { lazy: false, deps: [userId] }));

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);

      // Set same primitive value - atom won't notify (strict equal)
      act(() => {
        userId.set(1);
      });

      // Should NOT re-execute
      expect(fn).toHaveBeenCalledTimes(initialCalls);
    });

    it("should re-execute when atom value changes (not shallow equal)", () => {
      const config = atom({ page: 1 });
      const fn = vi.fn(() => `page-${config.get()?.page}`);

      const { result } = renderHook(() =>
        useAction(fn, { lazy: false, deps: [config] })
      );

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);
      expect(result.current.result).toBe("page-1");

      // Set different value
      act(() => {
        config.set({ page: 2 });
      });

      expect(fn).toHaveBeenCalledTimes(initialCalls + 1);
      expect(result.current.result).toBe("page-2");
    });

    it("should work with mixed deps (atoms and regular values)", () => {
      const userId = atom(1);
      const fn = vi.fn(() => "result");

      const { rerender } = renderHook(
        ({ extraDep }) =>
          useAction(fn, { lazy: false, deps: [userId, extraDep] }),
        { initialProps: { extraDep: "a" } }
      );

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);

      // Change atom
      act(() => {
        userId.set(2);
      });

      expect(fn).toHaveBeenCalledTimes(initialCalls + 1);

      // Change regular dep
      rerender({ extraDep: "b" });

      expect(fn).toHaveBeenCalledTimes(initialCalls + 2);
    });

    it("should NOT track atoms when lazy is true (default)", () => {
      const userId = atom(1);
      const fn = vi.fn(() => `user-${userId.get()}`);

      renderHook(() => useAction(fn, { lazy: true, deps: [userId] }));

      // Should not execute at all
      expect(fn).not.toHaveBeenCalled();

      // Change atom - should still not execute
      act(() => {
        userId.set(2);
      });

      expect(fn).not.toHaveBeenCalled();
    });

    it("should abort previous request when atom changes and exclusive is true", () => {
      const userId = atom(1);
      const signals: AbortSignal[] = [];
      const fn = vi.fn(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(`user-${userId.get()}`), 1000);
        });
      });

      renderHook(() => useAction(fn, { lazy: false, deps: [userId] }));

      // In strict mode, first signal is aborted by second mount effect
      const firstSignalIndex = mode === "strict" ? 1 : 0;
      expect(signals[firstSignalIndex].aborted).toBe(false);

      // Change atom - should abort previous
      act(() => {
        userId.set(2);
      });

      expect(signals[firstSignalIndex].aborted).toBe(true);
      expect(signals[signals.length - 1].aborted).toBe(false);
    });

    it("should work with multiple atoms in deps", () => {
      const userId = atom(1);
      const orgId = atom(100);
      const fn = vi.fn(() => `user-${userId.get()}-org-${orgId.get()}`);

      const { result } = renderHook(() =>
        useAction(fn, { lazy: false, deps: [userId, orgId] })
      );

      // In strict mode, effects run twice on mount
      const initialCalls = mode === "strict" ? 2 : 1;
      expect(fn).toHaveBeenCalledTimes(initialCalls);
      expect(result.current.result).toBe("user-1-org-100");

      // Change first atom
      act(() => {
        userId.set(2);
      });

      expect(fn).toHaveBeenCalledTimes(initialCalls + 1);
      expect(result.current.result).toBe("user-2-org-100");

      // Change second atom
      act(() => {
        orgId.set(200);
      });

      expect(fn).toHaveBeenCalledTimes(initialCalls + 2);
      expect(result.current.result).toBe("user-2-org-200");
    });
  });
});
