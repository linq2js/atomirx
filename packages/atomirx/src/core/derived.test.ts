import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { derived } from "./derived";

describe("derived", () => {
  describe("single source atom", () => {
    it("should derive value from a single atom", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);

      expect(doubled.value).toBe(10);
    });

    it("should update when source atom changes", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);

      expect(doubled.value).toBe(10);

      count.set(10);
      expect(doubled.value).toBe(20);
    });

    it("should notify listeners when derived value changes", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);
      const listener = vi.fn();

      doubled.on(listener);
      count.set(10);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify when derived value is the same", () => {
      const count = atom(5);
      // Always returns 10 regardless of input
      const constant = derived(count, () => 10);
      const listener = vi.fn();

      constant.on(listener);
      count.set(10); // derived still returns 10

      expect(listener).not.toHaveBeenCalled();
    });

    it("should be read-only (no set method)", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);

      expect((doubled as any).set).toBeUndefined();
    });

    it("should handle complex derivations", () => {
      const user = atom({ name: "John", age: 30 });
      const greeting = derived(
        user,
        (get) => `Hello, ${get()?.name}! You are ${get()?.age} years old.`
      );

      expect(greeting.value).toBe("Hello, John! You are 30 years old.");

      user.set({ name: "Jane", age: 25 });
      expect(greeting.value).toBe("Hello, Jane! You are 25 years old.");
    });
  });

  describe("array source (multiple atoms)", () => {
    it("should derive from multiple atoms using array form", () => {
      const firstName = atom("John");
      const lastName = atom("Doe");

      const fullName = derived(
        [firstName, lastName],
        (first, last) => `${first()} ${last()}`
      );

      expect(fullName.value).toBe("John Doe");
    });

    it("should update when any source atom changes", () => {
      const a = atom(1);
      const b = atom(2);

      const sum = derived([a, b], (getA, getB) => getA() + getB());

      expect(sum.value).toBe(3);

      a.set(5);
      expect(sum.value).toBe(7);

      b.set(10);
      expect(sum.value).toBe(15);
    });

    it("should notify once when multiple sources change", () => {
      const a = atom(1);
      const b = atom(2);

      const sum = derived([a, b], (getA, getB) => getA() + getB());
      const listener = vi.fn();

      sum.on(listener);

      a.set(5);
      expect(listener).toHaveBeenCalledTimes(1);

      b.set(10);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should handle empty array", () => {
      const constant = derived([] as const, () => 42);
      expect(constant.value).toBe(42);
    });
  });

  describe("array source (tuple of atoms)", () => {
    it("should derive from multiple atoms using tuple form", () => {
      const a = atom(1);
      const b = atom(2);
      const c = atom(3);

      const sum = derived(
        [a, b, c],
        (getA, getB, getC) => getA() + getB() + getC()
      );

      expect(sum.value).toBe(6);
    });

    it("should update when any source atom changes (product)", () => {
      const a = atom(1);
      const b = atom(2);

      const product = derived([a, b], (getA, getB) => getA() * getB());

      expect(product.value).toBe(2);

      a.set(3);
      expect(product.value).toBe(6);

      b.set(4);
      expect(product.value).toBe(12);
    });

    it("should preserve type safety with tuple", () => {
      const num = atom(5);
      const str = atom("hello");

      const combined = derived([num, str], (getNum, getStr) => {
        return `${getStr()} ${getNum()}`;
      });

      expect(combined.value).toBe("hello 5");
    });

    it("should handle single element array", () => {
      const count = atom(5);
      const doubled = derived([count], (get) => get() * 2);

      expect(doubled.value).toBe(10);
    });
  });

  describe("async source atoms (suspense-like behavior)", () => {
    it("should be in loading state when source is loading", async () => {
      const asyncAtom = atom(Promise.resolve(10));
      const doubled = derived(asyncAtom, (get) => get() * 2);

      // Initially loading - getter throws promise, derived catches it
      expect(asyncAtom.loading).toBe(true);
      expect(doubled.loading).toBe(true);
      expect(doubled.value).toBeUndefined();

      // Wait for resolution
      await asyncAtom;
      await new Promise((r) => setTimeout(r, 0));

      expect(doubled.loading).toBe(false);
      expect(doubled.value).toBe(20);
    });

    it("should propagate loading state from source", () => {
      const asyncAtom = atom(Promise.resolve(10));
      const doubled = derived(asyncAtom, (get) => get());

      // Derived should reflect source loading state
      expect(asyncAtom.loading).toBe(true);
      expect(doubled.loading).toBe(true);
    });

    it("should recompute after async source resolves", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });

      const asyncAtom = atom(promise);
      const doubled = derived(asyncAtom, (get) => get() * 2);

      const listener = vi.fn();
      doubled.on(listener);

      expect(doubled.loading).toBe(true);

      resolve!(5);
      await new Promise((r) => setTimeout(r, 0));

      expect(doubled.loading).toBe(false);
      expect(doubled.value).toBe(10);
      expect(listener).toHaveBeenCalled();
    });

    it("should enter error state when source has error", async () => {
      let reject: (error: Error) => void;
      const promise = new Promise<number>((_, r) => {
        reject = r;
      });

      const asyncAtom = atom(promise);
      const doubled = derived(asyncAtom, (get) => get() * 2);

      expect(doubled.loading).toBe(true);

      const error = new Error("Source failed");
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(doubled.loading).toBe(false);
      expect(doubled.error).toBe(error);
      expect(doubled.value).toBeUndefined();
    });

    it("should handle race condition - ignore stale promise resolution", async () => {
      let resolve1: (value: number) => void;
      const promise1 = new Promise<number>((r) => {
        resolve1 = r;
      });

      const asyncAtom = atom(promise1);
      const doubled = derived(asyncAtom, (get) => get() * 2);
      const listener = vi.fn();
      doubled.on(listener);

      expect(doubled.loading).toBe(true);

      // Set a new value before first promise resolves
      asyncAtom.set(100);
      await new Promise((r) => setTimeout(r, 0));

      expect(doubled.loading).toBe(false);
      expect(doubled.value).toBe(200);

      // Now resolve the old promise - should be ignored
      resolve1!(5);
      await new Promise((r) => setTimeout(r, 0));

      // Value should still be 200, not 10
      expect(doubled.value).toBe(200);
    });

    it("should handle multiple async sources", async () => {
      let resolve1: (value: number) => void;
      let resolve2: (value: number) => void;
      const promise1 = new Promise<number>((r) => {
        resolve1 = r;
      });
      const promise2 = new Promise<number>((r) => {
        resolve2 = r;
      });

      const a = atom(promise1);
      const b = atom(promise2);
      const sum = derived([a, b], (getA, getB) => getA() + getB());

      expect(sum.loading).toBe(true);

      // Resolve first
      resolve1!(10);
      await new Promise((r) => setTimeout(r, 0));

      // Still loading because b is not resolved
      expect(sum.loading).toBe(true);

      // Resolve second
      resolve2!(20);
      await new Promise((r) => setTimeout(r, 0));

      expect(sum.loading).toBe(false);
      expect(sum.value).toBe(30);
    });
  });

  describe("subscriptions", () => {
    it("should return unsubscribe function", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);
      const listener = vi.fn();

      const unsubscribe = doubled.on(listener);
      count.set(10);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      count.set(20);
      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should support multiple listeners", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      doubled.on(listener1);
      doubled.on(listener2);

      count.set(10);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("thenable (await support)", () => {
    it("should be awaitable for sync derived", async () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);

      const value = await doubled;
      expect(value).toBe(10);
    });

    it("should be awaitable for async source", async () => {
      const asyncAtom = atom(Promise.resolve(5));
      const doubled = derived(asyncAtom, (get) => get() * 2);

      const value = await doubled;
      expect(value).toBe(10);
    });

    it("should reject when source has error", async () => {
      const error = new Error("Test error");
      const asyncAtom = atom(Promise.reject(error));
      const doubled = derived(asyncAtom, (get) => get() * 2);

      await expect(doubled).rejects.toBe(error);
    });
  });

  describe("chained derivations", () => {
    it("should support deriving from derived atoms", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);
      const quadrupled = derived(doubled, (get) => get() * 2);

      expect(quadrupled.value).toBe(20);

      count.set(10);
      expect(doubled.value).toBe(20);
      expect(quadrupled.value).toBe(40);
    });

    it("should propagate changes through chain", () => {
      const count = atom(1);
      const doubled = derived(count, (get) => get() * 2);
      const quadrupled = derived(doubled, (get) => get() * 2);
      const listener = vi.fn();

      quadrupled.on(listener);
      count.set(2);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(quadrupled.value).toBe(8);
    });
  });

  describe("key option", () => {
    it("should support key for debugging", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);

      // Derived atoms don't have key option in current API
      // This test documents the current behavior
      expect(doubled.key).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle null values", () => {
      const nullable = atom<string | null>(null);
      const length = derived(nullable, (get) => get()?.length ?? 0);

      expect(length.value).toBe(0);

      nullable.set("hello");
      expect(length.value).toBe(5);
    });

    it("should handle undefined values", () => {
      const undef = atom<number | undefined>(undefined);
      const doubled = derived(undef, (get) => {
        const val = get();
        return val !== undefined ? val * 2 : -1;
      });

      expect(doubled.value).toBe(-1);

      undef.set(5);
      expect(doubled.value).toBe(10);
    });

    it("should handle derivation that throws", () => {
      const count = atom(0);
      const risky = derived(count, (get) => {
        if (get() === 0) throw new Error("Cannot be zero");
        return 100 / get();
      });

      expect(risky.error).toBeInstanceOf(Error);
      expect(risky.value).toBeUndefined();

      count.set(10);
      expect(risky.value).toBe(10);
      expect(risky.error).toBeUndefined();
    });

    it("should handle rapid source updates", () => {
      const count = atom(0);
      const doubled = derived(count, (get) => get() * 2);
      const listener = vi.fn();

      doubled.on(listener);

      count.set(1);
      count.set(2);
      count.set(3);

      expect(doubled.value).toBe(6);
      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("conditional dependency tracking", () => {
    it("should only subscribe to accessed dependencies", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);
      const aListener = vi.fn();
      const bListener = vi.fn();

      // Track when a and b are accessed
      a.on(aListener);
      b.on(bListener);

      const result = derived([flag, a, b], (getFlag, getA, getB) => {
        // Only access a or b based on flag
        return getFlag() ? getA() : getB();
      });

      // Initialize
      expect(result.value).toBe(1); // flag is true, so a() is accessed

      // Clear mocks after initialization
      aListener.mockClear();
      bListener.mockClear();

      // Change a - should trigger recompute since a is a dependency
      a.set(10);
      expect(result.value).toBe(10);

      // Change b - should NOT trigger recompute since b is not accessed when flag=true
      bListener.mockClear();
      b.set(20);
      // Result should still be 10 (b change doesn't trigger recompute)
      expect(result.value).toBe(10);
    });

    it("should update subscriptions when dependencies change", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);
      const listener = vi.fn();

      const result = derived([flag, a, b], (getFlag, getA, getB) => {
        return getFlag() ? getA() : getB();
      });

      result.on(listener);

      // Initially flag=true, so a is accessed
      expect(result.value).toBe(1);
      listener.mockClear();

      // Change flag to false - now b should be accessed instead of a
      flag.set(false);
      expect(result.value).toBe(2);
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // Now change b - should trigger recompute
      b.set(20);
      expect(result.value).toBe(20);
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // Change a - should NOT trigger recompute since a is no longer accessed
      a.set(100);
      // Value should still be 20
      expect(result.value).toBe(20);
    });

    it("should handle empty dependencies", () => {
      const a = atom(1);
      const b = atom(2);

      // Derived that doesn't access any atoms
      const constant = derived([a, b], () => 42);

      expect(constant.value).toBe(42);

      // Changes to a or b should not trigger recompute
      const listener = vi.fn();
      constant.on(listener);

      a.set(10);
      b.set(20);

      // No notifications since no deps were accessed
      expect(listener).not.toHaveBeenCalled();
      expect(constant.value).toBe(42);
    });
  });

  describe("fallback atoms as sources", () => {
    it("should not suspend when source has fallback", () => {
      const asyncAtom = atom(
        new Promise<number>((resolve) => setTimeout(() => resolve(42), 100)),
        { fallback: 0 }
      );

      const doubled = derived(asyncAtom, (get) => get() * 2);

      // Should NOT be loading - fallback atom provides value immediately
      expect(doubled.loading).toBe(false);
      expect(doubled.value).toBe(0); // 0 * 2 = 0
    });

    it("should update when fallback atom resolves", async () => {
      let resolve: (value: number) => void;
      const asyncAtom = atom(
        new Promise<number>((r) => {
          resolve = r;
        }),
        { fallback: 0 }
      );

      const doubled = derived(asyncAtom, (get) => get() * 2);

      // Initially uses fallback
      expect(doubled.value).toBe(0);

      // Resolve
      resolve!(21);
      await new Promise((r) => setTimeout(r, 0));

      // Should update to use resolved value
      expect(doubled.value).toBe(42);
    });

    it("should work with mixed fallback and non-fallback sources", async () => {
      const syncAtom = atom(10);
      let resolve: (value: number) => void;
      const asyncAtom = atom(
        new Promise<number>((r) => {
          resolve = r;
        }),
        { fallback: 5 }
      );

      const sum = derived([syncAtom, asyncAtom], (getSync, getAsync) => {
        return getSync() + getAsync();
      });

      // asyncAtom has fallback, so derived doesn't suspend
      expect(sum.loading).toBe(false);
      expect(sum.value).toBe(15); // 10 + 5 = 15

      // Resolve async atom
      resolve!(20);
      await new Promise((r) => setTimeout(r, 0));

      expect(sum.value).toBe(30); // 10 + 20 = 30
    });

    it("should still suspend if non-fallback atom is loading", () => {
      const fallbackAtom = atom(
        new Promise<number>((resolve) => setTimeout(() => resolve(1), 100)),
        { fallback: 0 }
      );
      const nonFallbackAtom = atom(
        new Promise<number>((resolve) => setTimeout(() => resolve(2), 100))
      );

      const sum = derived(
        [fallbackAtom, nonFallbackAtom],
        (getFallback, getNonFallback) => {
          return getFallback() + getNonFallback();
        }
      );

      // Should suspend because nonFallbackAtom doesn't have fallback
      expect(sum.loading).toBe(true);
      expect(sum.value).toBeUndefined();
    });

    it("should handle fallback atom error without throwing", async () => {
      let reject: (error: Error) => void;
      const asyncAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        }),
        { fallback: -1 }
      );

      const doubled = derived(asyncAtom, (get) => get() * 2);

      // Initially uses fallback
      expect(doubled.value).toBe(-2);

      // Reject
      reject!(new Error("Failed"));
      await new Promise((r) => setTimeout(r, 0));

      // Should still use fallback value, not throw error
      expect(doubled.loading).toBe(false);
      expect(doubled.error).toBeUndefined();
      expect(doubled.value).toBe(-2); // Still -1 * 2 = -2
    });

    it("derived atoms should have stale() that returns false", () => {
      const count = atom(5);
      const doubled = derived(count, (get) => get() * 2);

      // Derived atoms don't have fallback mode
      expect(doubled.stale()).toBe(false);
    });
  });
});
