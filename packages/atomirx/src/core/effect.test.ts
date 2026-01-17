import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { derived } from "./derived";
import { effect } from "./effect";
import { SelectContext } from "./select";

describe("effect", () => {
  describe("basic usage", () => {
    it("should run effect immediately on creation", () => {
      const count = atom(5);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(count));
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(5);
    });

    it("should run effect when source atom changes", () => {
      const count = atom(0);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(count));
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(0);

      count.set(10);

      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(effectFn).toHaveBeenCalledWith(10);
    });

    it("should receive context with get function", () => {
      const count = atom(42);
      let receivedContext: SelectContext | undefined;

      effect((ctx) => {
        receivedContext = ctx;
        ctx.get(count); // Access to track dependency
      });

      expect(typeof receivedContext?.get).toBe("function");
      expect(receivedContext!.get(count)).toBe(42);
    });
  });

  describe("multiple atoms", () => {
    it("should run effect with multiple atoms", () => {
      const a = atom(1);
      const b = atom(2);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(a), get(b));
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(1, 2);
    });

    it("should run effect when any source changes", () => {
      const a = atom(1);
      const b = atom(2);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(a), get(b));
      });

      expect(effectFn).toHaveBeenCalledTimes(1);

      a.set(10);
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(effectFn).toHaveBeenLastCalledWith(10, 2);

      b.set(20);
      expect(effectFn).toHaveBeenCalledTimes(3);
      expect(effectFn).toHaveBeenLastCalledWith(10, 20);
    });

    it("should handle three or more sources", () => {
      const a = atom("a");
      const b = atom("b");
      const c = atom("c");
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(a) + get(b) + get(c));
      });

      expect(effectFn).toHaveBeenCalledWith("abc");

      c.set("C");
      expect(effectFn).toHaveBeenLastCalledWith("abC");
    });
  });

  describe("cleanup function", () => {
    it("should call cleanup before next effect execution", () => {
      const count = atom(0);
      const cleanup = vi.fn();
      const effectFn = vi.fn(() => cleanup);

      effect(({ get }) => {
        get(count);
        return effectFn();
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      count.set(1);

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it("should call cleanup on dispose", () => {
      const count = atom(0);
      const cleanup = vi.fn();

      const dispose = effect(({ get }) => {
        get(count);
        return cleanup;
      });

      expect(cleanup).not.toHaveBeenCalled();

      dispose();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("should not call cleanup twice on dispose", () => {
      const count = atom(0);
      const cleanup = vi.fn();

      const dispose = effect(({ get }) => {
        get(count);
        return cleanup;
      });

      dispose();
      dispose(); // Second dispose should be no-op

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("should handle effect without cleanup (returns void)", () => {
      const count = atom(0);
      const effectFn = vi.fn();

      const dispose = effect(({ get }) => {
        effectFn(get(count));
        // No return - void
      });

      count.set(1);
      expect(effectFn).toHaveBeenCalledTimes(2);

      // Should not throw
      expect(() => dispose()).not.toThrow();
    });

    it("should handle effect returning undefined explicitly", () => {
      const count = atom(0);
      const effectFn = vi.fn();

      const dispose = effect(({ get }) => {
        effectFn(get(count));
        return undefined;
      });

      count.set(1);
      expect(effectFn).toHaveBeenCalledTimes(2);

      expect(() => dispose()).not.toThrow();
    });

    it("should run cleanup in correct order: cleanup -> effect", () => {
      const count = atom(0);
      const order: string[] = [];

      effect(({ get }) => {
        const value = get(count);
        order.push(`effect:${value}`);
        return () => order.push(`cleanup:${value}`);
      });

      expect(order).toEqual(["effect:0"]);

      count.set(1);
      expect(order).toEqual(["effect:0", "cleanup:0", "effect:1"]);

      count.set(2);
      expect(order).toEqual([
        "effect:0",
        "cleanup:0",
        "effect:1",
        "cleanup:1",
        "effect:2",
      ]);
    });
  });

  describe("dispose function", () => {
    it("should return a dispose function", () => {
      const count = atom(0);
      const dispose = effect(({ get }) => {
        get(count);
      });

      expect(typeof dispose).toBe("function");
    });

    it("should stop effect execution after dispose", () => {
      const count = atom(0);
      const effectFn = vi.fn();

      const dispose = effect(({ get }) => {
        effectFn(get(count));
      });

      expect(effectFn).toHaveBeenCalledTimes(1);

      dispose();

      count.set(1);
      count.set(2);
      count.set(3);

      // Effect should not run after dispose
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it("should be idempotent (multiple dispose calls are safe)", () => {
      const count = atom(0);
      const effectFn = vi.fn();
      const cleanup = vi.fn();

      const dispose = effect(({ get }) => {
        effectFn(get(count));
        return cleanup;
      });

      dispose();
      dispose();
      dispose();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("async atoms (suspense-like behavior)", () => {
    it("should wait for async atom to resolve before running effect", async () => {
      let resolve: (value: number) => void;
      const asyncAtom = atom(
        new Promise<number>((r) => {
          resolve = r;
        })
      );
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(asyncAtom));
      });

      // Effect should not run while loading
      expect(effectFn).not.toHaveBeenCalled();

      resolve!(42);
      await new Promise((r) => setTimeout(r, 0));

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(42);
    });

    it("should run effect when async atom resolves", async () => {
      const asyncAtom = atom(Promise.resolve(100));
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(asyncAtom));
      });

      // Wait for resolution
      await new Promise((r) => setTimeout(r, 0));

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(100);
    });

    it("should handle multiple async atoms - wait for all using all()", async () => {
      let resolve1: (value: number) => void;
      let resolve2: (value: string) => void;

      const a = atom(
        new Promise<number>((r) => {
          resolve1 = r;
        })
      );
      const b = atom(
        new Promise<string>((r) => {
          resolve2 = r;
        })
      );
      const effectFn = vi.fn();

      effect(({ all }) => {
        const [valA, valB] = all([a, b]);
        effectFn(valA, valB);
      });

      // Effect should not run while any atom is loading
      expect(effectFn).not.toHaveBeenCalled();

      resolve1!(10);
      await new Promise((r) => setTimeout(r, 0));

      // Still waiting for b
      expect(effectFn).not.toHaveBeenCalled();

      resolve2!("hello");
      await new Promise((r) => setTimeout(r, 0));

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(10, "hello");
    });

    it("should re-run effect when async atom value changes", async () => {
      let resolve: (value: number) => void;
      const asyncAtom = atom(
        new Promise<number>((r) => {
          resolve = r;
        })
      );
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(asyncAtom));
      });

      resolve!(10);
      await new Promise((r) => setTimeout(r, 0));

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(10);

      // Update with new value
      asyncAtom.set(20);
      await new Promise((r) => setTimeout(r, 0));

      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(effectFn).toHaveBeenLastCalledWith(20);
    });

    it("should not run effect if async atom errors", async () => {
      let reject: (error: Error) => void;
      const asyncAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(asyncAtom));
      });

      reject!(new Error("Test error"));
      await new Promise((r) => setTimeout(r, 0));

      // Effect should not run when atom has error
      expect(effectFn).not.toHaveBeenCalled();
    });
  });

  describe("fallback atoms", () => {
    it("should run effect immediately with fallback value", async () => {
      let resolve: (value: number) => void;
      const asyncAtom = atom(
        new Promise<number>((r) => {
          resolve = r;
        }),
        { fallback: 0 }
      );
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(asyncAtom));
      });

      // Effect runs immediately with fallback
      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(0);

      resolve!(42);
      await new Promise((r) => setTimeout(r, 0));

      // Effect runs again with resolved value
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(effectFn).toHaveBeenLastCalledWith(42);
    });
  });

  describe("conditional dependency tracking", () => {
    it("should only track accessed dependencies", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);
      const effectFn = vi.fn();

      effect(({ get }) => {
        // Only access a or b based on flag
        effectFn(get(flag) ? get(a) : get(b));
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(1);

      // Change a - should trigger effect (a is accessed when flag=true)
      a.set(10);
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(effectFn).toHaveBeenLastCalledWith(10);

      // Change b - should NOT trigger effect (b is not accessed when flag=true)
      effectFn.mockClear();
      b.set(20);
      expect(effectFn).not.toHaveBeenCalled();
    });

    it("should update subscriptions when dependencies change", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(flag) ? get(a) : get(b));
      });

      expect(effectFn).toHaveBeenLastCalledWith(1);

      // Change flag to false - now b should be accessed
      flag.set(false);
      expect(effectFn).toHaveBeenLastCalledWith(2);

      // Now b changes should trigger effect
      effectFn.mockClear();
      b.set(20);
      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenLastCalledWith(20);

      // And a changes should NOT trigger effect
      effectFn.mockClear();
      a.set(100);
      expect(effectFn).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid source updates", () => {
      const count = atom(0);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(count));
      });

      count.set(1);
      count.set(2);
      count.set(3);

      expect(effectFn).toHaveBeenCalledTimes(4); // initial + 3 updates
      expect(effectFn).toHaveBeenLastCalledWith(3);
    });

    it("should handle cleanup that throws (error propagates through derived)", () => {
      const count = atom(0);
      const effectFn = vi.fn();
      const cleanup = vi.fn(() => {
        throw new Error("Cleanup error");
      });

      effect(({ get }) => {
        effectFn(get(count));
        return cleanup;
      });

      // Cleanup error propagates through derived
      // When cleanup throws, the derived enters error state and effect doesn't run again
      count.set(1);
      expect(cleanup).toHaveBeenCalledTimes(1);
      // Effect only ran once (initial), cleanup error prevents second run
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it("should handle effect that throws (error caught by derived)", () => {
      const count = atom(0);
      const effectFn = vi.fn(() => {
        throw new Error("Effect error");
      });

      // Effect errors are caught by derived and stored in error state
      // The effect creation itself doesn't throw
      effect(({ get }) => {
        get(count);
        effectFn();
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it("should handle null and undefined values", () => {
      const nullable = atom<string | null>(null);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(nullable));
      });

      expect(effectFn).toHaveBeenCalledWith(null);

      nullable.set("hello");
      expect(effectFn).toHaveBeenLastCalledWith("hello");

      nullable.set(null);
      expect(effectFn).toHaveBeenLastCalledWith(null);
    });

    it("should handle effect with no dependencies", () => {
      const effectFn = vi.fn();

      // Effect with no get() calls - runs once on creation, never again
      effect(() => {
        effectFn();
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it("should handle derived atoms as source", () => {
      const count = atom(5);
      const doubled = derived(({ get }) => get(count) * 2);
      const effectFn = vi.fn();

      effect(({ get }) => {
        effectFn(get(doubled));
      });

      expect(effectFn).toHaveBeenCalledWith(10);

      count.set(10);
      expect(effectFn).toHaveBeenLastCalledWith(20);
    });
  });

  describe("use cases", () => {
    it("should work for localStorage persistence", () => {
      const storage: Record<string, string> = {};
      const mockLocalStorage = {
        setItem: vi.fn((key: string, value: string) => {
          storage[key] = value;
        }),
      };

      const count = atom(0);

      effect(({ get }) => {
        mockLocalStorage.setItem("count", String(get(count)));
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("count", "0");

      count.set(42);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("count", "42");
      expect(storage["count"]).toBe("42");
    });

    it("should work for subscription cleanup (e.g., WebSocket)", () => {
      const connections: string[] = [];
      const disconnections: string[] = [];

      const endpoint = atom("ws://server1");

      const dispose = effect(({ get }) => {
        const url = get(endpoint);
        connections.push(url);

        return () => {
          disconnections.push(url);
        };
      });

      expect(connections).toEqual(["ws://server1"]);
      expect(disconnections).toEqual([]);

      endpoint.set("ws://server2");
      expect(connections).toEqual(["ws://server1", "ws://server2"]);
      expect(disconnections).toEqual(["ws://server1"]);

      dispose();
      expect(disconnections).toEqual(["ws://server1", "ws://server2"]);
    });

    it("should work for interval cleanup", () => {
      vi.useFakeTimers();

      const intervalMs = atom(1000);
      const ticks: number[] = [];
      let intervalId: ReturnType<typeof setInterval> | undefined;

      const dispose = effect(({ get }) => {
        const ms = get(intervalMs);
        intervalId = setInterval(() => {
          ticks.push(ms);
        }, ms);

        return () => {
          clearInterval(intervalId);
        };
      });

      vi.advanceTimersByTime(3000);
      expect(ticks).toEqual([1000, 1000, 1000]);

      intervalMs.set(500);
      vi.advanceTimersByTime(1500);
      expect(ticks).toEqual([1000, 1000, 1000, 500, 500, 500]);

      dispose();
      vi.advanceTimersByTime(2000);
      // No more ticks after dispose
      expect(ticks).toEqual([1000, 1000, 1000, 500, 500, 500]);

      vi.useRealTimers();
    });

    it("should work for logging/analytics", () => {
      const logs: string[] = [];

      const user = atom({ id: 1, name: "John" });
      const page = atom("home");

      effect(({ get }) => {
        logs.push(`User ${get(user).name} viewed ${get(page)}`);
      });

      expect(logs).toEqual(["User John viewed home"]);

      page.set("profile");
      expect(logs).toEqual([
        "User John viewed home",
        "User John viewed profile",
      ]);

      user.set({ id: 2, name: "Jane" });
      expect(logs).toEqual([
        "User John viewed home",
        "User John viewed profile",
        "User Jane viewed profile",
      ]);
    });
  });

  describe("memory behavior after dispose", () => {
    it("should not execute effect after dispose even if source changes", () => {
      const count = atom(0);
      const effectFn = vi.fn();
      const cleanup = vi.fn();

      const dispose = effect(({ get }) => {
        effectFn(get(count));
        return cleanup;
      });

      expect(effectFn).toHaveBeenCalledTimes(1);

      dispose();

      // Source changes after dispose
      count.set(1);
      count.set(2);

      // Effect should not run
      expect(effectFn).toHaveBeenCalledTimes(1);
      // Cleanup should have been called once on dispose
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("batched updates", () => {
    it("should batch multiple atom updates within effect", () => {
      const trigger = atom(0);
      const a = atom(0);
      const b = atom(0);
      const aListener = vi.fn();
      const bListener = vi.fn();

      a.on(aListener);
      b.on(bListener);

      effect(({ get }) => {
        get(trigger); // Track trigger
        // Update multiple atoms - should be batched
        a.set((v) => v + 1);
        b.set((v) => v + 1);
      });

      // Initial effect run - both atoms updated
      expect(a.value).toBe(1);
      expect(b.value).toBe(1);
      // Due to batching, listeners should be called once (after batch completes)
      expect(aListener).toHaveBeenCalledTimes(1);
      expect(bListener).toHaveBeenCalledTimes(1);

      aListener.mockClear();
      bListener.mockClear();

      // Trigger effect again
      trigger.set(1);

      expect(a.value).toBe(2);
      expect(b.value).toBe(2);
      // Again, batched - one notification each
      expect(aListener).toHaveBeenCalledTimes(1);
      expect(bListener).toHaveBeenCalledTimes(1);
    });

    it("should batch updates and notify derived atoms once", () => {
      const trigger = atom(0);
      const a = atom(0);
      const b = atom(0);
      const sum = derived(({ get }) => get(a) + get(b));
      const sumListener = vi.fn();

      sum.on(sumListener);

      effect(({ get }) => {
        get(trigger);
        a.set((v) => v + 1);
        b.set((v) => v + 1);
      });

      // Initial: sum = 1 + 1 = 2
      expect(sum.value).toBe(2);
      // Derived should only be notified once due to batching
      expect(sumListener).toHaveBeenCalledTimes(1);

      sumListener.mockClear();

      trigger.set(1);
      expect(sum.value).toBe(4);
      expect(sumListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("async utilities", () => {
    it("should support all() for waiting on multiple atoms", async () => {
      const a = atom(Promise.resolve(1));
      const b = atom(Promise.resolve(2));
      const effectFn = vi.fn();

      effect(({ all }) => {
        const [valA, valB] = all([a, b]);
        effectFn(valA + valB);
      });

      // Wait for resolution
      await new Promise((r) => setTimeout(r, 0));

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledWith(3);
    });
  });
});
