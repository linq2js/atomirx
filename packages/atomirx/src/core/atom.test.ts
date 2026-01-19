import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { SYMBOL_ATOM } from "./types";

describe("atom", () => {
  describe("basic functionality", () => {
    it("should create an atom with initial value", () => {
      const count$ = atom(0);
      expect(count$.get()).toBe(0);
    });

    it("should have SYMBOL_ATOM marker", () => {
      const count$ = atom(0);
      expect(count$[SYMBOL_ATOM]).toBe(true);
    });

    it("should set value directly", () => {
      const count$ = atom(0);
      count$.set(5);
      expect(count$.get()).toBe(5);
    });

    it("should set value with reducer", () => {
      const count$ = atom(0);
      count$.set((prev) => prev + 1);
      expect(count$.get()).toBe(1);
      count$.set((prev) => prev * 2);
      expect(count$.get()).toBe(2);
    });

    it("should reset to initial value", () => {
      const count$ = atom(10);
      count$.set(42);
      expect(count$.get()).toBe(42);
      count$.reset();
      expect(count$.get()).toBe(10);
    });

    it("should store objects", () => {
      const user$ = atom({ name: "John", age: 30 });
      expect(user$.get()).toEqual({ name: "John", age: 30 });
      user$.set({ name: "Jane", age: 25 });
      expect(user$.get()).toEqual({ name: "Jane", age: 25 });
    });

    it("should store null and undefined", () => {
      const nullable$ = atom<string | null>(null);
      expect(nullable$.get()).toBe(null);
      nullable$.set("hello");
      expect(nullable$.get()).toBe("hello");
      nullable$.set(null);
      expect(nullable$.get()).toBe(null);

      const undef$ = atom<string | undefined>(undefined);
      expect(undef$.get()).toBe(undefined);
      undef$.set("world");
      expect(undef$.get()).toBe("world");
    });

    it("should store arrays", () => {
      const items$ = atom<number[]>([1, 2, 3]);
      expect(items$.get()).toEqual([1, 2, 3]);
      items$.set((prev) => [...prev, 4]);
      expect(items$.get()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("subscriptions", () => {
    it("should notify subscribers on value change", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      count$.on(listener);
      count$.set(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify if value is the same (strict equality)", () => {
      const count$ = atom(5);
      const listener = vi.fn();
      count$.on(listener);
      count$.set(5);
      expect(listener).not.toHaveBeenCalled();
    });

    it("should allow unsubscribing", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      const unsub = count$.on(listener);
      count$.set(1);
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
      count$.set(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support multiple subscribers", () => {
      const count$ = atom(0);
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      count$.on(listener1);
      count$.on(listener2);
      count$.set(1);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should notify on reset if value changed", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      count$.set(5);
      count$.on(listener);
      count$.reset();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify on reset if already at initial value", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      count$.on(listener);
      count$.reset();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("dirty", () => {
    it("should return false when just initialized", () => {
      const count$ = atom(42);
      expect(count$.dirty()).toBe(false);
    });

    it("should return true after value is set", () => {
      const count$ = atom(0);
      expect(count$.dirty()).toBe(false);

      count$.set(10);
      expect(count$.dirty()).toBe(true);
    });

    it("should return false after reset", () => {
      const count$ = atom(0);
      count$.set(10);
      expect(count$.dirty()).toBe(true);

      count$.reset();
      expect(count$.dirty()).toBe(false);
    });

    it("should stay dirty after multiple sets", () => {
      const count$ = atom(0);
      count$.set(1);
      count$.set(2);
      count$.set(3);
      expect(count$.dirty()).toBe(true);
    });

    it("should not become dirty if set to same value (equality check)", () => {
      const count$ = atom(42);
      count$.set(42); // Same value, equality check prevents change
      expect(count$.dirty()).toBe(false);
    });

    it("should work with objects and shallow equality", () => {
      const obj$ = atom({ a: 1 }, { equals: "shallow" });
      expect(obj$.dirty()).toBe(false);

      obj$.set({ a: 1 }); // Shallow equal, no change
      expect(obj$.dirty()).toBe(false);

      obj$.set({ a: 2 }); // Different value
      expect(obj$.dirty()).toBe(true);

      obj$.reset();
      expect(obj$.dirty()).toBe(false);
    });

    it("should be useful for tracking unsaved changes", () => {
      const form$ = atom({ name: "", email: "" });

      expect(form$.dirty()).toBe(false); // No changes yet

      form$.set({ name: "John", email: "" });
      expect(form$.dirty()).toBe(true); // Has unsaved changes

      form$.reset();
      expect(form$.dirty()).toBe(false); // Changes discarded
    });
  });

  describe("equality options", () => {
    it("should use strict equality by default", () => {
      const obj$ = atom({ a: 1 });
      const listener = vi.fn();
      obj$.on(listener);
      obj$.set({ a: 1 }); // Different object, same content
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support shallow equality", () => {
      const obj$ = atom({ a: 1 }, { equals: "shallow" });
      const listener = vi.fn();
      obj$.on(listener);
      obj$.set({ a: 1 }); // Same content
      expect(listener).not.toHaveBeenCalled();
      obj$.set({ a: 2 }); // Different content
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support custom equality function", () => {
      const user$ = atom(
        { id: 1, name: "John" },
        { equals: (a, b) => a.id === b.id }
      );
      const listener = vi.fn();
      user$.on(listener);
      user$.set({ id: 1, name: "Jane" }); // Same id
      expect(listener).not.toHaveBeenCalled();
      user$.set({ id: 2, name: "Jane" }); // Different id
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("Promise storage (raw)", () => {
    it("should store Promise as-is", () => {
      const promise = Promise.resolve(42);
      const data$ = atom(promise);
      expect(data$.get()).toBe(promise);
    });

    it("should store a new Promise on set", () => {
      const promise1 = Promise.resolve(1);
      const promise2 = Promise.resolve(2);
      const data$ = atom(promise1);
      expect(data$.get()).toBe(promise1);
      data$.set(promise2);
      expect(data$.get()).toBe(promise2);
    });

    it("should reset to original Promise object", () => {
      const originalPromise = Promise.resolve(42);
      const data$ = atom(originalPromise);
      data$.set(Promise.resolve(100));
      expect(data$.get()).not.toBe(originalPromise);
      data$.reset();
      expect(data$.get()).toBe(originalPromise);
    });
  });

  describe("reducer errors", () => {
    it("should throw synchronously if reducer throws", () => {
      const count$ = atom(0);
      const error = new Error("Reducer failed");
      expect(() => {
        count$.set(() => {
          throw error;
        });
      }).toThrow(error);
      // Value should remain unchanged
      expect(count$.get()).toBe(0);
    });
  });

  describe("lazy initialization", () => {
    it("should support lazy initializer function", () => {
      const initializer = vi.fn(() => 42);
      const count$ = atom(initializer);
      expect(initializer).toHaveBeenCalledTimes(1);
      expect(count$.get()).toBe(42);
    });

    it("should only call initializer once", () => {
      const initializer = vi.fn(() => ({ data: "expensive" }));
      const obj$ = atom(initializer);
      expect(initializer).toHaveBeenCalledTimes(1);
      // Access value multiple times
      obj$.get();
      obj$.get();
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it("should re-run initializer on reset", () => {
      let callCount = 0;
      const initializer = () => {
        callCount++;
        return callCount; // Returns different value each call
      };
      const count$ = atom(initializer);
      expect(count$.get()).toBe(1); // First call returns 1
      expect(callCount).toBe(1);

      count$.set(100);
      expect(count$.get()).toBe(100);

      count$.reset();
      expect(count$.get()).toBe(2); // Re-runs initializer, gets fresh value
      expect(callCount).toBe(2); // Initializer called again
    });

    it("should work with lazy initializer returning object", () => {
      const obj$ = atom(() => ({ count: 0, items: [] as number[] }));
      expect(obj$.get()).toEqual({ count: 0, items: [] });
      obj$.set((prev) => ({ ...prev, count: 1 }));
      expect(obj$.get()).toEqual({ count: 1, items: [] });
    });

    it("should work with lazy initializer returning Promise", () => {
      const promise = Promise.resolve(42);
      const data$ = atom(() => promise);
      expect(data$.get()).toBe(promise);
    });

    it("should still work with direct value (non-function)", () => {
      const count$ = atom(10);
      expect(count$.get()).toBe(10);
    });
  });

  describe("metadata", () => {
    it("should store meta", () => {
      const count$ = atom(0, { meta: { key: "count" } });
      expect(count$.meta).toEqual({ key: "count" });
    });

    it("should have undefined meta if not provided", () => {
      const count$ = atom(0);
      expect(count$.meta).toBe(undefined);
    });
  });

  describe("AtomContext (init function with context)", () => {
    describe("signal", () => {
      it("should pass context with signal to init function", () => {
        let receivedSignal: AbortSignal | undefined;
        atom((ctx) => {
          receivedSignal = ctx.signal;
          return 42;
        });
        expect(receivedSignal).toBeInstanceOf(AbortSignal);
        expect(receivedSignal!.aborted).toBe(false);
      });

      it("should abort signal when set() is called", () => {
        let receivedSignal: AbortSignal | undefined;
        const count$ = atom((ctx) => {
          receivedSignal = ctx.signal;
          return 0;
        });
        expect(receivedSignal!.aborted).toBe(false);

        count$.set(1);
        expect(receivedSignal!.aborted).toBe(true);
      });

      it("should abort signal when reset() is called", () => {
        const signals: AbortSignal[] = [];
        const count$ = atom((ctx) => {
          signals.push(ctx.signal);
          return 0;
        });
        expect(signals[0].aborted).toBe(false);

        count$.reset();
        // Original signal should be aborted
        expect(signals[0].aborted).toBe(true);
      });

      it("should provide fresh signal on reset", () => {
        const signals: AbortSignal[] = [];
        const count$ = atom((ctx) => {
          signals.push(ctx.signal);
          return signals.length;
        });

        expect(signals).toHaveLength(1);
        expect(signals[0].aborted).toBe(false);

        count$.reset();
        expect(signals).toHaveLength(2);
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
      });

      it("should not create new signal on subsequent set() calls", () => {
        let signalRef: AbortSignal | undefined;
        const count$ = atom((ctx) => {
          signalRef = ctx.signal;
          return 0;
        });

        const firstSignal = signalRef;
        count$.set(1);
        expect(firstSignal!.aborted).toBe(true);

        // After set, the signal is already aborted, no new context is created
        // because set() doesn't re-run the initializer
        count$.set(2);
        expect(firstSignal!.aborted).toBe(true);
      });

      it("should abort with reason", () => {
        let receivedSignal: AbortSignal | undefined;
        const count$ = atom((ctx) => {
          receivedSignal = ctx.signal;
          return 0;
        });

        count$.set(1);
        expect(receivedSignal!.aborted).toBe(true);
        expect(receivedSignal!.reason).toBe("value changed");
      });

      it("should abort with 'reset' reason on reset", () => {
        const signals: AbortSignal[] = [];
        const count$ = atom((ctx) => {
          signals.push(ctx.signal);
          return 0;
        });

        count$.reset();
        // Original signal should be aborted with 'reset' reason
        expect(signals[0].aborted).toBe(true);
        expect(signals[0].reason).toBe("reset");
      });
    });

    describe("onCleanup", () => {
      it("should call cleanup when set() is called", () => {
        const cleanup = vi.fn();
        const count$ = atom((ctx) => {
          ctx.onCleanup(cleanup);
          return 0;
        });

        expect(cleanup).not.toHaveBeenCalled();
        count$.set(1);
        expect(cleanup).toHaveBeenCalledTimes(1);
      });

      it("should call cleanup when reset() is called", () => {
        const cleanup = vi.fn();
        const count$ = atom((ctx) => {
          ctx.onCleanup(cleanup);
          return 0;
        });

        expect(cleanup).not.toHaveBeenCalled();
        count$.reset();
        expect(cleanup).toHaveBeenCalledTimes(1);
      });

      it("should call multiple cleanups in FIFO order", () => {
        const order: number[] = [];
        const count$ = atom((ctx) => {
          ctx.onCleanup(() => order.push(1));
          ctx.onCleanup(() => order.push(2));
          ctx.onCleanup(() => order.push(3));
          return 0;
        });

        count$.set(1);
        expect(order).toEqual([1, 2, 3]);
      });

      it("should clear cleanups after calling them", () => {
        const cleanup = vi.fn();
        const count$ = atom((ctx) => {
          ctx.onCleanup(cleanup);
          return 0;
        });

        count$.set(1);
        expect(cleanup).toHaveBeenCalledTimes(1);

        // Second set should not call cleanup again (cleanup was from init, not from set)
        count$.set(2);
        expect(cleanup).toHaveBeenCalledTimes(1);
      });

      it("should call cleanup from reset, then register new cleanups on next reset", () => {
        let cleanupCallCount = 0;
        const count$ = atom((ctx) => {
          ctx.onCleanup(() => cleanupCallCount++);
          return cleanupCallCount;
        });

        expect(cleanupCallCount).toBe(0);

        count$.reset();
        expect(cleanupCallCount).toBe(1); // First cleanup called

        count$.reset();
        expect(cleanupCallCount).toBe(2); // Second cleanup called (registered in previous reset)
      });

      it("should work with async operations that check signal", async () => {
        let cleanupCalled = false;
        let operationAborted = false;

        const data$ = atom((ctx) => {
          ctx.onCleanup(() => {
            cleanupCalled = true;
          });

          // Simulate an async operation that respects the signal
          const timeoutId = setTimeout(() => {
            if (!ctx.signal.aborted) {
              // Would do something here
            } else {
              operationAborted = true;
            }
          }, 100);

          ctx.onCleanup(() => clearTimeout(timeoutId));

          return "initial";
        });

        // Trigger abort
        data$.set("changed");

        expect(cleanupCalled).toBe(true);

        // Wait for the timeout to potentially fire
        await new Promise((r) => setTimeout(r, 150));

        // The operation should have been cleaned up/aborted
        expect(operationAborted).toBe(false); // timeout was cleared by cleanup
      });
    });

    describe("combined signal and cleanup", () => {
      it("should abort signal and call cleanup on set", () => {
        let signal: AbortSignal | undefined;
        const cleanup = vi.fn();

        const count$ = atom((ctx) => {
          signal = ctx.signal;
          ctx.onCleanup(cleanup);
          return 0;
        });

        expect(signal!.aborted).toBe(false);
        expect(cleanup).not.toHaveBeenCalled();

        count$.set(1);

        expect(signal!.aborted).toBe(true);
        expect(cleanup).toHaveBeenCalledTimes(1);
      });

      it("should abort signal and call cleanup on reset, then provide fresh context", () => {
        const signals: AbortSignal[] = [];
        const cleanups: number[] = [];
        let callCount = 0;

        const count$ = atom((ctx) => {
          callCount++;
          signals.push(ctx.signal);
          ctx.onCleanup(() => cleanups.push(callCount));
          return callCount;
        });

        expect(signals).toHaveLength(1);
        expect(cleanups).toEqual([]);

        count$.reset();

        expect(signals).toHaveLength(2);
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
        expect(cleanups).toEqual([1]); // cleanup from first init was called
      });
    });

    describe("non-function initializer (no context)", () => {
      it("should work normally with direct value", () => {
        const count$ = atom(42);
        expect(count$.get()).toBe(42);

        count$.set(100);
        expect(count$.get()).toBe(100);

        count$.reset();
        expect(count$.get()).toBe(42);
      });

      it("should not have cleanup issues with direct value", () => {
        const count$ = atom(0);
        // These should not throw
        count$.set(1);
        count$.set(2);
        count$.reset();
        count$.reset();
      });
    });
  });

  describe("plugin system (use)", () => {
    it("should support .use() for extensions", () => {
      // Note: Don't use ...source spread as it copies values, not getters
      // Instead, access source properties through the reference
      const base$ = atom(0);
      const count$ = base$.use((source) => ({
        get: source.get,
        set: source.set,
        reset: source.reset,
        on: source.on,
        increment: () => source.set((v) => v + 1),
      }));

      expect(count$.get()).toBe(0);
      count$.increment();
      expect(count$.get()).toBe(1);
    });

    it("should support .use() with source reference pattern", () => {
      // Simpler pattern: just reference the original atom
      const base$ = atom(0);
      const enhanced$ = base$.use(() => ({
        get: () => base$.get(),
        increment: () => base$.set((v) => v + 1),
        decrement: () => base$.set((v) => v - 1),
      }));

      expect(enhanced$.get()).toBe(0);
      enhanced$.increment();
      expect(enhanced$.get()).toBe(1);
      enhanced$.increment();
      expect(enhanced$.get()).toBe(2);
      enhanced$.decrement();
      expect(enhanced$.get()).toBe(1);
    });
  });
});
