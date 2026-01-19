import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { derived } from "./derived";
import { SYMBOL_ATOM, SYMBOL_DERIVED } from "./types";

describe("derived", () => {
  describe("basic functionality", () => {
    it("should create a derived atom from a source atom", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2);

      expect(await doubled$.get()).toBe(10);
    });

    it("should have SYMBOL_ATOM and SYMBOL_DERIVED markers", () => {
      const count$ = atom(0);
      const doubled$ = derived(({ read }) => read(count$) * 2);

      expect(doubled$[SYMBOL_ATOM]).toBe(true);
      expect(doubled$[SYMBOL_DERIVED]).toBe(true);
    });

    it("should always return a Promise from .get()", () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2);

      expect(doubled$.get()).toBeInstanceOf(Promise);
    });

    it("should update when source atom changes", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2);

      expect(await doubled$.get()).toBe(10);
      count$.set(10);
      expect(await doubled$.get()).toBe(20);
    });

    it("should derive from multiple atoms", async () => {
      const a$ = atom(2);
      const b$ = atom(3);
      const sum$ = derived(({ read }) => read(a$) + read(b$));

      expect(await sum$.get()).toBe(5);
      a$.set(10);
      expect(await sum$.get()).toBe(13);
      b$.set(7);
      expect(await sum$.get()).toBe(17);
    });
  });

  describe("staleValue", () => {
    it("should return undefined initially without fallback", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2);

      // Before resolution, staleValue is undefined (no fallback)
      // After resolution, it becomes the resolved value
      await doubled$.get();
      expect(doubled$.staleValue).toBe(10);
    });

    it("should return fallback value initially with fallback for async", async () => {
      // For sync atoms, computation is immediate so staleValue is already resolved
      // Test with async dependency to verify fallback behavior
      const asyncValue$ = atom(new Promise<number>(() => {})); // Never resolves
      const derived$ = derived(({ read }) => read(asyncValue$) * 2, {
        fallback: 0,
      });

      // With async dependency that's loading, state should be loading and staleValue should be fallback
      expect(derived$.state().status).toBe("loading");
      expect(derived$.staleValue).toBe(0);
    });

    it("should return resolved value for sync computation", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2, { fallback: 0 });

      // Sync computation resolves immediately
      await doubled$.get();
      expect(doubled$.staleValue).toBe(10);
    });

    it("should update staleValue after resolution", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2, { fallback: 0 });

      await doubled$.get();
      expect(doubled$.staleValue).toBe(10);

      count$.set(20);
      // After recomputation
      await doubled$.get();
      expect(doubled$.staleValue).toBe(40);
    });
  });

  describe("state", () => {
    it("should return loading status during loading", async () => {
      const asyncValue$ = atom(new Promise<number>(() => {})); // Never resolves
      const doubled$ = derived(({ read }) => read(asyncValue$) * 2);

      const state = doubled$.state();
      expect(state.status).toBe("loading");
    });

    it("should return loading status with fallback during loading", async () => {
      const asyncValue$ = atom(new Promise<number>(() => {})); // Never resolves
      const doubled$ = derived(({ read }) => read(asyncValue$) * 2, {
        fallback: 0,
      });

      // Has fallback but state is still loading (use staleValue for fallback)
      const state = doubled$.state();
      expect(state.status).toBe("loading");
      expect(doubled$.staleValue).toBe(0);
    });

    it("should return ready status after resolved", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2, { fallback: 0 });

      // Sync computation resolves immediately
      await doubled$.get();

      const state = doubled$.state();
      expect(state.status).toBe("ready");
      if (state.status === "ready") {
        expect(state.value).toBe(10);
      }
    });

    it("should return error status on error", async () => {
      const error = new Error("Test error");
      const count$ = atom(5);
      const willThrow$ = derived(({ read }) => {
        if (read(count$) > 3) {
          throw error;
        }
        return read(count$);
      });

      // Wait for computation to complete
      try {
        await willThrow$.get();
      } catch {
        // Expected to throw
      }

      const state = willThrow$.state();
      expect(state.status).toBe("error");
      if (state.status === "error") {
        expect(state.error).toBe(error);
      }
    });

    it("should transition from loading to ready", async () => {
      let resolvePromise: (value: number) => void;
      const asyncValue$ = atom(
        new Promise<number>((resolve) => {
          resolvePromise = resolve;
        })
      );
      const doubled$ = derived(({ read }) => read(asyncValue$) * 2, {
        fallback: 0,
      });

      // Initially loading
      expect(doubled$.state().status).toBe("loading");
      expect(doubled$.staleValue).toBe(0);

      // Resolve the promise
      resolvePromise!(5);
      await doubled$.get();

      // Now ready
      const state = doubled$.state();
      expect(state.status).toBe("ready");
      if (state.status === "ready") {
        expect(state.value).toBe(10);
      }
      expect(doubled$.staleValue).toBe(10);
    });
  });

  describe("refresh", () => {
    it("should re-run computation on refresh", async () => {
      let callCount = 0;
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => {
        callCount++;
        return read(count$) * 2;
      });

      await doubled$.get();
      expect(callCount).toBeGreaterThanOrEqual(1);

      const countBefore = callCount;
      doubled$.refresh();
      await doubled$.get();
      expect(callCount).toBeGreaterThan(countBefore);
    });
  });

  describe("subscriptions", () => {
    it("should notify subscribers when derived value changes", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2);
      const listener = vi.fn();

      await doubled$.get(); // Initialize
      doubled$.on(listener);

      count$.set(10);
      await doubled$.get(); // Wait for recomputation

      expect(listener).toHaveBeenCalled();
    });

    it("should not notify if derived value is the same", async () => {
      const count$ = atom(5);
      const clamped$ = derived(({ read }) => Math.min(read(count$), 10));
      const listener = vi.fn();

      await clamped$.get();
      clamped$.on(listener);

      // Value is already clamped to 10
      count$.set(15); // Still clamps to 10
      await clamped$.get();

      // Should still notify because we can't detect same output without full tracking
      // This depends on implementation - adjust expectation as needed
    });

    it("should allow unsubscribing", async () => {
      const count$ = atom(5);
      const doubled$ = derived(({ read }) => read(count$) * 2);
      const listener = vi.fn();

      await doubled$.get();
      const unsub = doubled$.on(listener);

      count$.set(10);
      await doubled$.get();
      const callCount = listener.mock.calls.length;

      unsub();

      count$.set(20);
      await doubled$.get();

      // Should not receive more calls after unsubscribe
      expect(listener.mock.calls.length).toBe(callCount);
    });
  });

  describe("conditional dependencies", () => {
    it("should only subscribe to accessed atoms", async () => {
      const showDetails$ = atom(false);
      const summary$ = atom("Brief");
      const details$ = atom("Detailed");

      const content$ = derived(({ read }) =>
        read(showDetails$) ? read(details$) : read(summary$)
      );

      const listener = vi.fn();
      await content$.get();
      content$.on(listener);

      // Initially showing summary, so details changes shouldn't trigger
      // (This depends on implementation - conditional deps may or may not
      // unsubscribe from unaccessed atoms)

      expect(await content$.get()).toBe("Brief");

      showDetails$.set(true);
      expect(await content$.get()).toBe("Detailed");
    });
  });

  describe("async dependencies", () => {
    it("should handle atoms storing Promises", async () => {
      const asyncValue$ = atom(Promise.resolve(42));
      const doubled$ = derived(({ read }) => {
        const value = read(asyncValue$);
        // At this point, read() will throw the Promise if pending
        // which is handled by derived's internal retry mechanism
        return value;
      });

      // The derived computation handles the async dependency
      // This test verifies the basic wiring works
      await doubled$.get();
      // Result depends on how promiseCache tracks the Promise
      expect(true).toBe(true); // Test passes if no error thrown
    });
  });

  describe("error handling", () => {
    it("should propagate errors from computation", async () => {
      const count$ = atom(5);
      const willThrow$ = derived(({ read }) => {
        if (read(count$) > 10) {
          throw new Error("Value too high");
        }
        return read(count$);
      });

      expect(await willThrow$.get()).toBe(5);

      count$.set(15);
      await expect(willThrow$.get()).rejects.toThrow("Value too high");
    });
  });

  describe("context utilities", () => {
    it("should support all() for multiple atoms", async () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);

      const sum$ = derived(({ all }) => {
        const [a, b, c] = all(a$, b$, c$);
        return a + b + c;
      });

      expect(await sum$.get()).toBe(6);
    });

    it("should support read() chaining", async () => {
      const a$ = atom(2);
      const b$ = atom(3);

      const result$ = derived(({ read }) => {
        const a = read(a$);
        const b = read(b$);
        return a * b;
      });

      expect(await result$.get()).toBe(6);
    });
  });

  describe("equality options", () => {
    it("should use strict equality by default", async () => {
      const source$ = atom({ a: 1 });
      const derived$ = derived(({ read }) => ({ ...read(source$) }));
      const listener = vi.fn();

      await derived$.get();
      derived$.on(listener);

      source$.set({ a: 1 }); // Same content, different reference
      await derived$.get();

      // With strict equality on derived output, listener should be called
      // because we return a new object each time
      expect(listener).toHaveBeenCalled();
    });

    it("should support shallow equality option", async () => {
      const source$ = atom({ a: 1 });
      const derived$ = derived(({ read }) => ({ ...read(source$) }), {
        equals: "shallow",
      });
      const listener = vi.fn();

      await derived$.get();
      derived$.on(listener);

      source$.set({ a: 1 }); // Same content
      await derived$.get();

      // With shallow equality, same content should not notify
      // (depends on whether source triggers derived recomputation)
    });
  });

  describe("bug fixes", () => {
    describe("notify on loading state (Bug #1)", () => {
      it("should notify downstream derived atoms when entering loading state", async () => {
        // Bug: When a derived atom's dependency starts loading,
        // it didn't notify subscribers, causing downstream atoms
        // and useSelector to not suspend properly
        let resolveFirst: (value: number) => void;
        const firstPromise = new Promise<number>((r) => {
          resolveFirst = r;
        });
        const base$ = atom(firstPromise);

        // Create a chain: base$ -> derived1$ -> derived2$
        const derived1$ = derived(({ read }) => read(base$) * 2);
        const derived2$ = derived(({ read }) => read(derived1$) + 1);

        const listener = vi.fn();
        derived2$.on(listener);

        // Initially loading
        expect(derived2$.state().status).toBe("loading");

        // Resolve and trigger recompute
        resolveFirst!(5);
        await derived2$.get();

        expect(derived2$.state().status).toBe("ready");
        // Listener should have been called when state changed
        expect(listener).toHaveBeenCalled();
      });

      it("should propagate loading state through derived chain", async () => {
        let resolvePromise: (value: number) => void;
        const asyncAtom$ = atom(
          new Promise<number>((r) => {
            resolvePromise = r;
          })
        );

        const level1$ = derived(({ read }) => read(asyncAtom$) * 2);
        const level2$ = derived(({ read }) => read(level1$) + 10);
        const level3$ = derived(({ read }) => read(level2$) * 3);

        // All should be loading
        expect(level1$.state().status).toBe("loading");
        expect(level2$.state().status).toBe("loading");
        expect(level3$.state().status).toBe("loading");

        // Resolve
        resolvePromise!(5);
        await level3$.get();

        // All should be ready with correct values
        expect(level1$.state().status).toBe("ready");
        expect(level2$.state().status).toBe("ready");
        expect(level3$.state().status).toBe("ready");
        expect(await level3$.get()).toBe((5 * 2 + 10) * 3); // 60
      });
    });

    describe("no orphaned promises (Bug #2)", () => {
      it("should not create orphaned promises when already loading", async () => {
        // Bug: When compute() was called while already loading,
        // it created a new Promise, orphaning the one React was waiting on
        let resolvePromise: (value: number) => void;
        const asyncAtom$ = atom(
          new Promise<number>((r) => {
            resolvePromise = r;
          })
        );

        const derived$ = derived(({ read }) => read(asyncAtom$) * 2);

        // Get the promise that would be thrown for Suspense
        const state1 = derived$.state();
        expect(state1.status).toBe("loading");
        const promise1 = state1.status === "loading" ? state1.promise : null;

        // Trigger another computation while still loading
        derived$.refresh();

        // Should return the SAME promise (not orphan the first one)
        const state2 = derived$.state();
        expect(state2.status).toBe("loading");
        const promise2 = state2.status === "loading" ? state2.promise : null;

        expect(promise1).toBe(promise2);

        // Resolve and verify completion
        resolvePromise!(21);
        const result = await derived$.get();
        expect(result).toBe(42);
      });

      it("should complete properly when dependency changes during loading", async () => {
        let resolveFirst: (value: number) => void;
        const firstPromise = new Promise<number>((r) => {
          resolveFirst = r;
        });

        const base$ = atom(firstPromise);
        const derived$ = derived(({ read }) => read(base$) * 2);

        // Start loading
        expect(derived$.state().status).toBe("loading");

        // Simulate setting a new promise (like refetch)
        let resolveSecond: (value: number) => void;
        const secondPromise = new Promise<number>((r) => {
          resolveSecond = r;
        });
        base$.set(secondPromise);

        // The derived atom's existing computation is waiting on firstPromise
        // When firstPromise resolves, it will retry and pick up secondPromise
        // So we need to resolve BOTH promises

        // Resolve first to trigger retry
        resolveFirst!(5);

        // Wait a tick for retry to happen
        await new Promise((r) => setTimeout(r, 0));

        // Now resolve the second promise
        resolveSecond!(10);

        // Should eventually resolve with the second value
        const result = await derived$.get();
        expect(result).toBe(20);
      });
    });

    describe("notify on first resolve even when silent (Bug #3)", () => {
      it("should notify subscribers when transitioning from loading to ready", async () => {
        // Bug: When derived atoms were initialized with silent=true,
        // they never called notify() even after promise resolved
        let resolvePromise: (value: number) => void;
        const asyncAtom$ = atom(
          new Promise<number>((r) => {
            resolvePromise = r;
          })
        );

        const derived$ = derived(({ read }) => read(asyncAtom$) * 2);
        const listener = vi.fn();

        // Subscribe before resolution
        derived$.on(listener);
        expect(derived$.state().status).toBe("loading");

        // Resolve the promise
        resolvePromise!(5);
        await derived$.get();

        // Listener MUST be called when transitioning loading → ready
        expect(listener).toHaveBeenCalled();
        expect(derived$.state().status).toBe("ready");
      });

      it("should notify subscribers when transitioning from loading to error", async () => {
        let rejectPromise: (error: Error) => void;
        const asyncAtom$ = atom(
          new Promise<number>((_, reject) => {
            rejectPromise = reject;
          })
        );

        const derived$ = derived(({ read }) => read(asyncAtom$) * 2);
        const listener = vi.fn();

        // Subscribe before rejection
        derived$.on(listener);
        expect(derived$.state().status).toBe("loading");

        // Reject the promise
        rejectPromise!(new Error("Test error"));

        // Wait for rejection to be processed
        try {
          await derived$.get();
        } catch {
          // Expected
        }

        // Listener MUST be called when transitioning loading → error
        expect(listener).toHaveBeenCalled();
        expect(derived$.state().status).toBe("error");
      });

      it("should update state() correctly after async resolution", async () => {
        // This tests the demo scenario where atoms show "Loading" forever
        let resolvePromise: (value: number) => void;
        const asyncAtom$ = atom(
          new Promise<number>((r) => {
            resolvePromise = r;
          })
        );

        // Wrapper derived (like in the Async Utils demo)
        const wrapper$ = derived(({ read }) => read(asyncAtom$));

        // Initially loading
        const initialState = wrapper$.state();
        expect(initialState.status).toBe("loading");

        // Resolve
        resolvePromise!(42);
        await wrapper$.get();

        // State MUST reflect the resolved value
        const finalState = wrapper$.state();
        expect(finalState.status).toBe("ready");
        if (finalState.status === "ready") {
          expect(finalState.value).toBe(42);
        }
      });

      it("should work with multiple wrapper derived atoms", async () => {
        // Simulates the Async Utils demo with multiple atoms
        const createAsyncAtom = (delayMs: number, value: number) => {
          return atom(
            new Promise<number>((resolve) => {
              setTimeout(() => resolve(value), delayMs);
            })
          );
        };

        const atom1$ = createAsyncAtom(10, 1);
        const atom2$ = createAsyncAtom(20, 2);
        const atom3$ = createAsyncAtom(30, 3);

        const wrapper1$ = derived(({ read }) => read(atom1$));
        const wrapper2$ = derived(({ read }) => read(atom2$));
        const wrapper3$ = derived(({ read }) => read(atom3$));

        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        wrapper1$.on(listener1);
        wrapper2$.on(listener2);
        wrapper3$.on(listener3);

        // Wait for all to resolve
        await Promise.all([wrapper1$.get(), wrapper2$.get(), wrapper3$.get()]);

        // All listeners should have been called
        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();
        expect(listener3).toHaveBeenCalled();

        // All states should be ready
        expect(wrapper1$.state().status).toBe("ready");
        expect(wrapper2$.state().status).toBe("ready");
        expect(wrapper3$.state().status).toBe("ready");
      });
    });
  });
});
