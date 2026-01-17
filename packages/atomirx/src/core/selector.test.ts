import { describe, it, expect } from "vitest";
import { select, AllAtomsRejectedError } from "./select";
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

  // ============================================================================
  // Context API Tests
  // ============================================================================

  describe("context API", () => {
    describe("get()", () => {
      it("should compute value using get()", () => {
        const a = atom(1);
        const b = atom(2);

        const result = select(({ get }) => get(a) + get(b));

        expect(result.value).toBe(3);
        expect(result.error).toBeUndefined();
        expect(result.promise).toBeUndefined();
        expect(result.dependencies.has(a)).toBe(true);
        expect(result.dependencies.has(b)).toBe(true);
      });

      it("should track only accessed dependencies with get()", () => {
        const flag = atom(true);
        const a = atom(1);
        const b = atom(2);

        const result = select(({ get }) => (get(flag) ? get(a) : get(b)));

        expect(result.value).toBe(1);
        expect(result.dependencies.has(flag)).toBe(true);
        expect(result.dependencies.has(a)).toBe(true);
        expect(result.dependencies.has(b)).toBe(false);
      });

      it("should throw promise for loading atom", () => {
        const asyncAtom = atom(Promise.resolve(10));

        const result = select(({ get }) => get(asyncAtom) * 2);

        expect(result.value).toBeUndefined();
        expect(result.promise).toBe(asyncAtom);
        expect(result.dependencies.has(asyncAtom)).toBe(true);
      });

      it("should throw error for errored atom", async () => {
        const error = new Error("Test error");
        let reject: (e: Error) => void;
        const asyncAtom = atom(
          new Promise<number>((_, r) => {
            reject = r;
          })
        );

        asyncAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ get }) => get(asyncAtom) * 2);

        expect(result.error).toBe(error);
        expect(result.value).toBeUndefined();
      });

      it("should return fallback for stale atom", () => {
        const asyncAtom = atom(
          new Promise<number>((resolve) => setTimeout(() => resolve(42), 100)),
          { fallback: 0 }
        );

        const result = select(({ get }) => get(asyncAtom) * 2);

        expect(result.value).toBe(0);
        expect(result.promise).toBeUndefined();
      });
    });

    describe("all()", () => {
      it("should return array of values when all resolved", () => {
        const a = atom(1);
        const b = atom(2);
        const c = atom(3);

        const result = select(({ all }) => {
          const [x, y, z] = all([a, b, c]);
          return x + y + z;
        });

        expect(result.value).toBe(6);
      });

      it("should support custom variable names via destructuring", () => {
        const userAtom = atom({ name: "John" });
        const postsAtom = atom([1, 2, 3]);
        const commentsAtom = atom(["a", "b"]);

        const result = select(({ all }) => {
          const [user, posts, myComments] = all([
            userAtom,
            postsAtom,
            commentsAtom,
          ]);
          return { user, posts, comments: myComments };
        });

        expect(result.value).toEqual({
          user: { name: "John" },
          posts: [1, 2, 3],
          comments: ["a", "b"],
        });
      });

      it("should throw promise when any atom is loading", () => {
        const syncAtom = atom(1);
        const asyncAtom = atom(Promise.resolve(2));

        const result = select(({ all }) => {
          const [x, y] = all([syncAtom, asyncAtom]);
          return x + y;
        });

        expect(result.promise).toBeDefined();
        expect(result.value).toBeUndefined();
      });

      it("should throw error when any atom has error", async () => {
        const error = new Error("Test error");
        let reject: (e: Error) => void;
        const syncAtom = atom(1);
        const asyncAtom = atom(
          new Promise<number>((_, r) => {
            reject = r;
          })
        );

        asyncAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ all }) => {
          const [x, y] = all([syncAtom, asyncAtom]);
          return x + y;
        });

        expect(result.error).toBe(error);
      });

      it("should track all atoms as dependencies", () => {
        const a = atom(1);
        const b = atom(2);
        const c = atom(3);

        const result = select(({ all }) => {
          const [x, y, z] = all([a, b, c]);
          return x + y + z;
        });

        expect(result.dependencies.has(a)).toBe(true);
        expect(result.dependencies.has(b)).toBe(true);
        expect(result.dependencies.has(c)).toBe(true);
      });

      it("should return empty array for empty input", () => {
        const result = select(({ all }) => all([]));

        expect(result.value).toEqual([]);
      });
    });

    describe("any()", () => {
      it("should return first resolved atom", () => {
        const a = atom(1);
        const b = atom(2);

        const result = select(({ any }) => {
          const [key, value] = any({ first: a, second: b });
          return { key, value };
        });

        expect(result.value).toEqual({ key: "first", value: 1 });
      });

      it("should skip errored atoms and return first resolved", async () => {
        const error = new Error("Test error");
        let reject: (e: Error) => void;
        const errorAtom = atom(
          new Promise<number>((_, r) => {
            reject = r;
          })
        );
        const syncAtom = atom(42);

        errorAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ any }) => {
          const [key, value] = any({ errored: errorAtom, sync: syncAtom });
          return { key, value };
        });

        expect(result.value).toEqual({ key: "sync", value: 42 });
      });

      it("should throw AllAtomsRejectedError when all atoms have errors", async () => {
        const error1 = new Error("Error 1");
        const error2 = new Error("Error 2");
        let reject1: (e: Error) => void;
        let reject2: (e: Error) => void;

        const atom1 = atom(
          new Promise<number>((_, r) => {
            reject1 = r;
          })
        );
        const atom2 = atom(
          new Promise<number>((_, r) => {
            reject2 = r;
          })
        );

        atom1.loading;
        atom2.loading;
        reject1!(error1);
        reject2!(error2);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ any }) => {
          const [key, value] = any({ a: atom1, b: atom2 });
          return { key, value };
        });

        expect(result.error).toBeInstanceOf(AllAtomsRejectedError);
      });

      it("should throw promise when some loading and rest errored", async () => {
        const error = new Error("Test error");
        let reject: (e: Error) => void;

        const errorAtom = atom(
          new Promise<number>((_, r) => {
            reject = r;
          })
        );
        const loadingAtom = atom(Promise.resolve(42));

        errorAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ any }) => {
          const [key, value] = any({ errored: errorAtom, loading: loadingAtom });
          return { key, value };
        });

        expect(result.promise).toBeDefined();
      });
    });

    describe("race()", () => {
      it("should return first settled (resolved) atom", () => {
        const a = atom(1);
        const b = atom(2);

        const result = select(({ race }) => {
          const [key, value] = race({ first: a, second: b });
          return { key, value };
        });

        expect(result.value).toEqual({ key: "first", value: 1 });
      });

      it("should throw error for first settled (errored) atom", async () => {
        const error = new Error("Test error");
        let reject: (e: Error) => void;

        const errorAtom = atom(
          new Promise<number>((_, r) => {
            reject = r;
          })
        );

        errorAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const loadingAtom = atom(
          new Promise<number>(() => {}) // Never resolves
        );

        const result = select(({ race }) => {
          const [key, value] = race({ errored: errorAtom, loading: loadingAtom });
          return { key, value };
        });

        expect(result.error).toBe(error);
      });

      it("should throw promise when all atoms are loading", () => {
        const a = atom(Promise.resolve(1));
        const b = atom(Promise.resolve(2));

        const result = select(({ race }) => {
          const [key, value] = race({ first: a, second: b });
          return { key, value };
        });

        expect(result.promise).toBeDefined();
      });
    });

    describe("settled()", () => {
      it("should return array of settled results", async () => {
        const syncAtom = atom(1);
        const error = new Error("Test error");
        let reject: (e: Error) => void;
        const errorAtom = atom(
          new Promise<number>((_, r) => {
            reject = r;
          })
        );

        errorAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ settled }) => {
          return settled([syncAtom, errorAtom]);
        });

        expect(result.value).toEqual([
          { status: "resolved", value: 1 },
          { status: "rejected", error },
        ]);
      });

      it("should support custom variable names via destructuring", async () => {
        const userAtom = atom({ name: "John" });
        const error = new Error("Posts failed");
        let reject: (e: Error) => void;
        const postsAtom = atom(
          new Promise<string[]>((_, r) => {
            reject = r;
          })
        );

        postsAtom.loading;
        reject!(error);
        await new Promise((r) => setTimeout(r, 0));

        const result = select(({ settled }) => {
          const [userResult, postsResult] = settled([userAtom, postsAtom]);
          return {
            user: userResult.status === "resolved" ? userResult.value : null,
            posts: postsResult.status === "resolved" ? postsResult.value : [],
          };
        });

        expect(result.value).toEqual({
          user: { name: "John" },
          posts: [],
        });
      });

      it("should throw promise when any atom is loading", () => {
        const syncAtom = atom(1);
        const asyncAtom = atom(Promise.resolve(2));

        const result = select(({ settled }) => {
          return settled([syncAtom, asyncAtom]);
        });

        expect(result.promise).toBeDefined();
      });

      it("should return empty array for empty input", () => {
        const result = select(({ settled }) => settled([]));

        expect(result.value).toEqual([]);
      });
    });

    describe("combined usage", () => {
      it("should work with get() and all() together", () => {
        const flag = atom(true);
        const a = atom(1);
        const b = atom(2);
        const c = atom(3);

        const result = select(({ get, all }) => {
          if (get(flag)) {
            const [x, y] = all([a, b]);
            return x + y;
          }
          return get(c);
        });

        expect(result.value).toBe(3);
        expect(result.dependencies.has(flag)).toBe(true);
        expect(result.dependencies.has(a)).toBe(true);
        expect(result.dependencies.has(b)).toBe(true);
        expect(result.dependencies.has(c)).toBe(false);
      });

      it("should track dependencies from all utilities", () => {
        const a = atom(1);
        const b = atom(2);
        const c = atom(3);
        const d = atom(4);

        const result = select(({ get, all }) => {
          const x = get(a);
          const [y, z] = all([b, c]);
          const w = get(d);
          return x + y + z + w;
        });

        expect(result.value).toBe(10);
        expect(result.dependencies.has(a)).toBe(true);
        expect(result.dependencies.has(b)).toBe(true);
        expect(result.dependencies.has(c)).toBe(true);
        expect(result.dependencies.has(d)).toBe(true);
      });
    });
  });
});
