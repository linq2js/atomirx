import { describe, it, expect } from "vitest";
import { select } from "./select";
import { atom } from "./atom";

describe("select", () => {
  describe("sync computation", () => {
    it("should compute value from sync atoms", () => {
      const a = atom(1);
      const b = atom(2);

      const result = select([a, b], (getA, getB) => getA() + getB());

      expect(result.value).toBe(3);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
      expect(result.dependencies.has(a)).toBe(true);
      expect(result.dependencies.has(b)).toBe(true);
    });

    it("should track only accessed dependencies", () => {
      const flag = atom(true);
      const a = atom(1);
      const b = atom(2);

      const result = select([flag, a, b], (getFlag, getA, getB) =>
        getFlag() ? getA() : getB()
      );

      expect(result.value).toBe(1);
      expect(result.dependencies.has(flag)).toBe(true);
      expect(result.dependencies.has(a)).toBe(true);
      expect(result.dependencies.has(b)).toBe(false); // b was not accessed
    });

    it("should work with single atom source", () => {
      const count = atom(5);

      const result = select(count, (get) => get() * 2);

      expect(result.value).toBe(10);
      expect(result.dependencies.has(count)).toBe(true);
    });

    it("should work with array source", () => {
      const a = atom(1);
      const b = atom(2);
      const c = atom(3);

      const result = select(
        [a, b, c],
        (getA, getB, getC) => getA() + getB() + getC()
      );

      expect(result.value).toBe(6);
      expect(result.dependencies.size).toBe(3);
    });
  });

  describe("error handling", () => {
    it("should capture thrown errors", () => {
      const count = atom(0);
      const error = new Error("Cannot be zero");

      const result = select(count, (get) => {
        if (get() === 0) throw error;
        return 100 / get();
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBe(error);
      expect(result.promise).toBeUndefined();
      expect(result.dependencies.has(count)).toBe(true);
    });

    it("should propagate error from source atom", async () => {
      const error = new Error("Source error");
      let reject: (e: Error) => void;
      const asyncAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );

      // Trigger loading state
      asyncAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      const result = select(asyncAtom, (get) => get() * 2);

      expect(result.value).toBeUndefined();
      expect(result.error).toBe(error);
      expect(result.promise).toBeUndefined();
    });
  });

  describe("async/promise handling", () => {
    it("should return promise when source is loading", () => {
      const asyncAtom = atom(Promise.resolve(10));

      const result = select(asyncAtom, (get) => get() * 2);

      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBe(asyncAtom); // The thrown atom is the promise
      expect(result.dependencies.has(asyncAtom)).toBe(true);
    });

    it("should compute value after async resolves", async () => {
      const asyncAtom = atom(Promise.resolve(10));

      // Wait for resolution
      await asyncAtom;

      const result = select(asyncAtom, (get) => get() * 2);

      expect(result.value).toBe(20);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should handle multiple async sources", async () => {
      const a = atom(Promise.resolve(1));
      const b = atom(Promise.resolve(2));

      // Both loading
      const result1 = select([a, b], (getA, getB) => getA() + getB());
      expect(result1.promise).toBeDefined();

      // Wait for both
      await Promise.all([a, b]);

      const result2 = select([a, b], (getA, getB) => getA() + getB());
      expect(result2.value).toBe(3);
      expect(result2.promise).toBeUndefined();
    });
  });

  describe("dependency tracking edge cases", () => {
    it("should track dependencies even when error is thrown", () => {
      const a = atom(1);
      const b = atom(2);

      const result = select([a, b], (getA, getB) => {
        const aVal = getA(); // accessed
        if (aVal === 1) throw new Error("Error after accessing a");
        return aVal + getB();
      });

      expect(result.error).toBeInstanceOf(Error);
      expect(result.dependencies.has(a)).toBe(true);
      expect(result.dependencies.has(b)).toBe(false); // b was not accessed before error
    });

    it("should track dependencies even when promise is thrown", () => {
      const flag = atom(true);
      const asyncAtom = atom(Promise.resolve(10));
      const syncAtom = atom(5);

      const result = select(
        [flag, asyncAtom, syncAtom],
        (getFlag, getAsync, getSync) => {
          const f = getFlag();
          if (f) {
            return getAsync(); // throws promise
          }
          return getSync();
        }
      );

      expect(result.promise).toBeDefined();
      expect(result.dependencies.has(flag)).toBe(true);
      expect(result.dependencies.has(asyncAtom)).toBe(true);
      expect(result.dependencies.has(syncAtom)).toBe(false);
    });

    it("should return empty dependencies when no atoms accessed", () => {
      const a = atom(1);
      const b = atom(2);

      const result = select([a, b], () => 42);

      expect(result.value).toBe(42);
      expect(result.dependencies.size).toBe(0);
    });
  });

  describe("nested/chained selects", () => {
    it("should work with derived atoms as sources", async () => {
      const count = atom(5);
      // Create a derived atom manually for testing
      const doubled = atom(10); // Simulating derived

      const result = select([count, doubled], (getCount, getDoubled) => {
        return getCount() + getDoubled();
      });

      expect(result.value).toBe(15);
    });
  });

  describe("fallback atoms", () => {
    it("should return fallback value instead of throwing promise for loading atom", () => {
      const asyncAtom = atom(
        new Promise<number>((resolve) => setTimeout(() => resolve(42), 100)),
        { fallback: 0 }
      );

      const result = select(asyncAtom, (get) => get() * 2);

      // Should NOT throw promise, should return computed value using fallback
      expect(result.promise).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.value).toBe(0); // 0 * 2 = 0
      expect(result.dependencies.has(asyncAtom)).toBe(true);
    });

    it("should return fallback value instead of throwing error for errored atom", async () => {
      let reject: (error: Error) => void;
      const asyncAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        }),
        { fallback: -1 }
      );

      // Trigger loading
      asyncAtom.loading;

      // Reject the promise
      reject!(new Error("Failed"));
      await new Promise((r) => setTimeout(r, 0));

      const result = select(asyncAtom, (get) => get() + 10);

      // Should NOT throw error, should return computed value using fallback
      expect(result.promise).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.value).toBe(9); // -1 + 10 = 9
    });

    it("should work with mixed fallback and non-fallback atoms", () => {
      const syncAtom = atom(10);
      const asyncAtom = atom(
        new Promise<number>((resolve) => setTimeout(() => resolve(5), 100)),
        { fallback: 1 }
      );

      const result = select([syncAtom, asyncAtom], (getSync, getAsync) => {
        return getSync() + getAsync();
      });

      // asyncAtom has fallback, so it returns 1 instead of throwing
      expect(result.promise).toBeUndefined();
      expect(result.value).toBe(11); // 10 + 1 = 11
    });

    it("should throw promise for non-fallback loading atom", () => {
      const asyncAtom = atom(
        new Promise<number>((resolve) => setTimeout(() => resolve(42), 100))
      );

      const result = select(asyncAtom, (get) => get() * 2);

      // Should throw promise (no fallback)
      expect(result.promise).toBeDefined();
      expect(result.value).toBeUndefined();
    });

    it("should use resolved value after async atom resolves", async () => {
      let resolve: (value: number) => void;
      const asyncAtom = atom(
        new Promise<number>((r) => {
          resolve = r;
        }),
        { fallback: 0 }
      );

      // Before resolve - uses fallback
      const result1 = select(asyncAtom, (get) => get() * 2);
      expect(result1.value).toBe(0);

      // Resolve
      resolve!(21);
      await new Promise((r) => setTimeout(r, 0));

      // After resolve - uses actual value
      const result2 = select(asyncAtom, (get) => get() * 2);
      expect(result2.value).toBe(42);
    });
  });
});
