import { describe, it, expect } from "vitest";
import { atom } from "./atom";
import { select } from "./select";
import { promisesEqual } from "./promiseCache";

describe("select", () => {
  describe("read()", () => {
    it("should read value from sync atom", () => {
      const count$ = atom(5);
      const { result } = select(({ read }) => read(count$));

      expect(result.value).toBe(5);
      expect(result.error).toBe(undefined);
      expect(result.promise).toBe(undefined);
    });

    it("should track dependencies", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ read }) => read(a$) + read(b$));

      expect(result.dependencies.size).toBe(2);
      expect(result.dependencies.has(a$)).toBe(true);
      expect(result.dependencies.has(b$)).toBe(true);
    });

    it("should throw error if computation throws", () => {
      const count$ = atom(5);
      const error = new Error("Test error");

      const { result } = select(({ read }) => {
        read(count$);
        throw error;
      });

      expect(result.value).toBe(undefined);
      expect(result.error).toBe(error);
      expect(result.promise).toBe(undefined);
    });
  });

  describe("all()", () => {
    it("should return array of values for all sync atoms", () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);

      const { result } = select(({ all }) => all([a$, b$, c$]));

      expect(result.value).toEqual([1, 2, 3]);
    });

    it("should throw promise if any atom is pending", () => {
      const a$ = atom(1);
      const b$ = atom(new Promise<number>(() => {}));

      const { result } = select(({ all }) => all([a$, b$]));

      expect(result.promise).toBeDefined();
      expect(result.value).toBe(undefined);
    });

    it("should throw error if any atom has rejected promise", async () => {
      const error = new Error("Test error");
      const a$ = atom(1);
      // Create rejected promise with immediate catch to prevent unhandled rejection warning
      let rejectFn: (e: Error) => void;
      const rejectedPromise = new Promise<number>((_, reject) => {
        rejectFn = reject;
      });
      rejectedPromise.catch(() => {}); // Prevent unhandled rejection
      rejectFn!(error);
      const b$ = atom(rejectedPromise);

      // First call to select tracks the promise but returns pending
      select(({ all }) => all([a$, b$]));

      // Wait for promise handlers to run
      await Promise.resolve();
      await Promise.resolve();

      // Now the promise state should be updated
      const { result } = select(({ all }) => all([a$, b$]));

      expect(result.error).toBe(error);
    });
  });

  describe("race()", () => {
    it("should return first fulfilled value with key", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ race }) => race({ a: a$, b: b$ }));

      expect(result.value).toEqual({ key: "a", value: 1 });
    });

    it("should throw first error if first atom is rejected", async () => {
      const error = new Error("Test error");
      const rejectedPromise = Promise.reject(error);
      rejectedPromise.catch(() => {});
      const a$ = atom(rejectedPromise);
      const b$ = atom(2);

      // Track the promise first
      select(({ race }) => race({ a: a$, b: b$ }));
      await Promise.resolve();
      await Promise.resolve();

      const { result } = select(({ race }) => race({ a: a$, b: b$ }));

      expect(result.error).toBe(error);
    });

    it("should throw promise if all are pending", () => {
      const a$ = atom(new Promise<number>(() => {}));
      const b$ = atom(new Promise<number>(() => {}));

      const { result } = select(({ race }) => race({ a: a$, b: b$ }));

      expect(result.promise).toBeDefined();
    });
  });

  describe("any()", () => {
    it("should return first fulfilled value with key", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ any }) => any({ a: a$, b: b$ }));

      expect(result.value).toEqual({ key: "a", value: 1 });
    });

    it("should skip rejected and return next fulfilled with key", async () => {
      const error = new Error("Test error");
      const rejectedPromise = Promise.reject(error);
      rejectedPromise.catch(() => {});
      const a$ = atom(rejectedPromise);
      const b$ = atom(2);

      // Track first, then wait for microtasks
      select(({ any }) => any({ a: a$, b: b$ }));
      await Promise.resolve();
      await Promise.resolve();

      const { result } = select(({ any }) => any({ a: a$, b: b$ }));

      expect(result.value).toEqual({ key: "b", value: 2 });
    });

    it("should throw AggregateError if all rejected", async () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      // Create rejected promises with immediate catch to prevent unhandled rejection warning
      let reject1: (e: Error) => void;
      let reject2: (e: Error) => void;
      const p1 = new Promise<number>((_, reject) => {
        reject1 = reject;
      });
      const p2 = new Promise<number>((_, reject) => {
        reject2 = reject;
      });
      p1.catch(() => {});
      p2.catch(() => {});
      reject1!(error1);
      reject2!(error2);

      const a$ = atom(p1);
      const b$ = atom(p2);

      // Track first, then wait for microtasks
      select(({ any }) => any({ a: a$, b: b$ }));
      await Promise.resolve();
      await Promise.resolve();

      const { result } = select(({ any }) => any({ a: a$, b: b$ }));

      expect(result.error).toBeDefined();
      expect((result.error as Error).name).toBe("AggregateError");
    });
  });

  describe("settled()", () => {
    it("should return array of settled results", async () => {
      const a$ = atom(1);
      const error = new Error("Test error");
      // Create rejected promise with immediate catch to prevent unhandled rejection warning
      let rejectFn: (e: Error) => void;
      const rejectedPromise = new Promise<number>((_, reject) => {
        rejectFn = reject;
      });
      rejectedPromise.catch(() => {});
      rejectFn!(error);
      const b$ = atom(rejectedPromise);

      // Track first, wait for microtasks
      select(({ settled }) => settled([a$, b$]));
      await Promise.resolve();
      await Promise.resolve();

      const { result } = select(({ settled }) => settled([a$, b$]));

      expect(result.value).toEqual([
        { status: "ready", value: 1 },
        { status: "error", error },
      ]);
    });

    it("should throw promise if any atom is pending", () => {
      const a$ = atom(1);
      const b$ = atom(new Promise<number>(() => {}));

      const { result } = select(({ settled }) => settled([a$, b$]));

      expect(result.promise).toBeDefined();
    });
  });

  describe("conditional dependencies", () => {
    it("should only track accessed atoms", () => {
      const condition$ = atom(false);
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ read }) =>
        read(condition$) ? read(a$) : read(b$)
      );

      expect(result.dependencies.size).toBe(2);
      expect(result.dependencies.has(condition$)).toBe(true);
      expect(result.dependencies.has(b$)).toBe(true);
      // a$ was not accessed because condition was false
      expect(result.dependencies.has(a$)).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should throw error if selector returns a Promise", () => {
      const { result } = select(() => Promise.resolve(42));

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(
        "select() selector must return a synchronous value"
      );
      expect(result.value).toBe(undefined);
      expect(result.promise).toBe(undefined);
    });

    it("should throw error if selector returns a PromiseLike", () => {
      // Custom PromiseLike object
      const promiseLike = {
        then: (resolve: (value: number) => void) => {
          resolve(42);
          return promiseLike;
        },
      };

      const { result } = select(() => promiseLike);

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(
        "select() selector must return a synchronous value"
      );
    });

    it("should work fine with sync values", () => {
      const { result } = select(() => 42);

      expect(result.value).toBe(42);
      expect(result.error).toBe(undefined);
      expect(result.promise).toBe(undefined);
    });
  });

  describe("safe()", () => {
    it("should return [undefined, result] on success", () => {
      const count$ = atom(5);

      const { result } = select(({ read, safe }) => {
        const [err, value] = safe(() => read(count$) * 2);
        return { err, value };
      });

      expect(result.value).toEqual({ err: undefined, value: 10 });
    });

    it("should return [error, undefined] on sync error", () => {
      const { result } = select(({ safe }) => {
        const [err, value] = safe(() => {
          throw new Error("Test error");
        });
        return { err, value };
      });

      expect(result.value?.err).toBeInstanceOf(Error);
      expect((result.value?.err as Error).message).toBe("Test error");
      expect(result.value?.value).toBe(undefined);
    });

    it("should re-throw Promise to preserve Suspense", () => {
      const pending$ = atom(new Promise(() => {})); // Never resolves

      const { result } = select(({ read, safe }) => {
        const [err, value] = safe(() => read(pending$));
        return { err, value };
      });

      // Promise should be thrown, not caught
      expect(result.promise).toBeDefined();
      expect(result.value).toBe(undefined);
    });

    it("should catch JSON.parse errors", () => {
      const raw$ = atom("invalid json");

      const { result } = select(({ read, safe }) => {
        const [err, data] = safe(() => {
          const raw = read(raw$);
          return JSON.parse(raw);
        });

        if (err) {
          return { error: "Parse failed" };
        }
        return { data };
      });

      expect(result.value).toEqual({ error: "Parse failed" });
    });

    it("should allow graceful degradation", () => {
      const user$ = atom({ name: "John" });

      const { result } = select(({ read, safe }) => {
        const [err1, user] = safe(() => read(user$));
        if (err1) return { user: null, posts: [] };

        const [err2] = safe(() => {
          throw new Error("Posts failed");
        });
        if (err2) return { user, posts: [] }; // Graceful degradation

        return { user, posts: ["post1"] };
      });

      expect(result.value).toEqual({
        user: { name: "John" },
        posts: [], // Gracefully degraded
      });
    });

    it("should preserve error type information", () => {
      class CustomError extends Error {
        code = "CUSTOM";
      }

      const { result } = select(({ safe }) => {
        const [err] = safe(() => {
          throw new CustomError("Custom error");
        });

        if (err instanceof CustomError) {
          return { code: err.code };
        }
        return { code: "UNKNOWN" };
      });

      expect(result.value).toEqual({ code: "CUSTOM" });
    });
  });

  describe("async context detection", () => {
    it("should throw error when read() is called outside selection context", async () => {
      const count$ = atom(5);
      let capturedRead: ((atom: typeof count$) => number) | null = null;

      select(({ read }) => {
        capturedRead = read;
        return read(count$);
      });

      // Calling read() after select() has finished should throw
      expect(() => capturedRead!(count$)).toThrow(
        "read() was called outside of the selection context"
      );
    });

    it("should throw error when all() is called outside selection context", async () => {
      const a$ = atom(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedAll: any = null;

      select(({ all }) => {
        capturedAll = all;
        return all([a$]);
      });

      expect(() => capturedAll([a$])).toThrow(
        "all() was called outside of the selection context"
      );
    });

    it("should throw error when race() is called outside selection context", async () => {
      const a$ = atom(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedRace: any = null;

      select(({ race }) => {
        capturedRace = race;
        return race({ a: a$ });
      });

      expect(() => capturedRace({ a: a$ })).toThrow(
        "race() was called outside of the selection context"
      );
    });

    it("should throw error when any() is called outside selection context", async () => {
      const a$ = atom(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedAny: any = null;

      select(({ any }) => {
        capturedAny = any;
        return any({ a: a$ });
      });

      expect(() => capturedAny({ a: a$ })).toThrow(
        "any() was called outside of the selection context"
      );
    });

    it("should throw error when settled() is called outside selection context", async () => {
      const a$ = atom(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSettled: any = null;

      select(({ settled }) => {
        capturedSettled = settled;
        return settled([a$]);
      });

      expect(() => capturedSettled([a$])).toThrow(
        "settled() was called outside of the selection context"
      );
    });

    it("should throw error when safe() is called outside selection context", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSafe: any = null;

      select(({ safe }) => {
        capturedSafe = safe;
        return safe(() => 42);
      });

      expect(() => capturedSafe(() => 42)).toThrow(
        "safe() was called outside of the selection context"
      );
    });
  });

  describe("state()", () => {
    it("should return ready state for sync atom", () => {
      const count$ = atom(5);

      const { result } = select(({ state }) => state(count$));

      expect(result.value).toEqual({ status: "ready", value: 5 });
    });

    it("should return loading state for pending promise atom", () => {
      const promise = new Promise<number>(() => {});
      const async$ = atom(promise);

      const { result } = select(({ state }) => state(async$));

      expect(result.value).toEqual({
        status: "loading",
        value: undefined,
        error: undefined,
      });
    });

    it("should return error state for rejected promise atom", async () => {
      const error = new Error("Test error");
      const rejectedPromise = Promise.reject(error);
      rejectedPromise.catch(() => {});
      const async$ = atom(rejectedPromise);

      // Track first
      select(({ state }) => state(async$));
      await Promise.resolve();
      await Promise.resolve();

      const { result } = select(({ state }) => state(async$));

      expect(result.value).toEqual({ status: "error", error });
    });

    it("should track dependencies when using state(atom)", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ state }) => {
        state(a$);
        state(b$);
        return "done";
      });

      expect(result.dependencies.size).toBe(2);
      expect(result.dependencies.has(a$)).toBe(true);
      expect(result.dependencies.has(b$)).toBe(true);
    });

    it("should wrap selector function with try/catch and return ready state", () => {
      const a$ = atom(10);
      const b$ = atom(20);

      const { result } = select(({ read, state }) =>
        state(() => read(a$) + read(b$))
      );

      expect(result.value).toEqual({ status: "ready", value: 30 });
    });

    it("should wrap selector function and return loading state when promise thrown", () => {
      const async$ = atom(new Promise<number>(() => {}));

      const { result } = select(({ read, state }) => state(() => read(async$)));

      expect(result.value).toEqual({
        status: "loading",
        value: undefined,
        error: undefined,
      });
    });

    it("should wrap selector function and return error state when error thrown", () => {
      const { result } = select(({ state }) =>
        state(() => {
          throw new Error("Test error");
        })
      );

      expect(result.value?.status).toBe("error");
      expect(
        (result.value as { status: "error"; error: unknown }).error
      ).toBeInstanceOf(Error);
    });

    it("should work with all() inside state()", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ all, state }) => state(() => all([a$, b$])));

      expect(result.value).toEqual({
        status: "ready",
        value: [1, 2],
        error: undefined,
      });
    });

    it("should return loading state when all() has pending atoms", () => {
      const a$ = atom(1);
      const b$ = atom(new Promise<number>(() => {}));

      const { result } = select(({ all, state }) => state(() => all([a$, b$])));

      expect(result.value?.status).toBe("loading");
    });

    it("should allow building dashboard-style derived atoms", () => {
      const user$ = atom({ name: "John" });
      const posts$ = atom(new Promise<string[]>(() => {})); // Loading

      const { result } = select(({ state }) => {
        const userState = state(user$);
        const postsState = state(posts$);

        return {
          user: userState.status === "ready" ? userState.value : null,
          posts: postsState.status === "ready" ? postsState.value : [],
          isLoading:
            userState.status === "loading" || postsState.status === "loading",
        };
      });

      expect(result.value).toEqual({
        user: { name: "John" },
        posts: [],
        isLoading: true,
      });
    });

    it("should throw error when called outside selection context", () => {
      const a$ = atom(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedState: any = null;

      select(({ state }) => {
        capturedState = state;
        return state(a$);
      });

      expect(() => capturedState(a$)).toThrow(
        "state() was called outside of the selection context"
      );
    });
  });

  describe("untrack()", () => {
    it("should read atom without tracking when passed atom directly", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select(({ read, untrack }) => {
        const a = read(a$); // Tracked
        const b = untrack(b$); // NOT tracked
        return a + b;
      });

      expect(result.value).toBe(3);
      expect(result.dependencies.size).toBe(1);
      expect(result.dependencies.has(a$)).toBe(true);
      expect(result.dependencies.has(b$)).toBe(false);
    });

    it("should execute function without tracking reads inside", () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);

      const { result } = select(({ read, untrack }) => {
        const a = read(a$); // Tracked
        const sum = untrack(() => {
          // None of these are tracked
          return read(b$) + read(c$);
        });
        return a + sum;
      });

      expect(result.value).toBe(6);
      expect(result.dependencies.size).toBe(1);
      expect(result.dependencies.has(a$)).toBe(true);
      expect(result.dependencies.has(b$)).toBe(false);
      expect(result.dependencies.has(c$)).toBe(false);
    });

    it("should handle nested untrack calls correctly", () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);

      const { result } = select(({ read, untrack }) => {
        const a = read(a$); // Tracked
        const sum = untrack(() => {
          const b = read(b$); // NOT tracked (inside untrack)
          // Nested untrack - still untracked
          const c = untrack(() => read(c$));
          return b + c;
        });
        return a + sum;
      });

      expect(result.value).toBe(6);
      expect(result.dependencies.size).toBe(1);
      expect(result.dependencies.has(a$)).toBe(true);
    });

    it("should throw error for pending async atom", () => {
      const async$ = atom(new Promise<number>(() => {}));

      const { result } = select(({ untrack }) => untrack(async$));

      // Should throw promise (Suspense pattern)
      expect(result.promise).toBeDefined();
      expect(result.value).toBe(undefined);
    });

    it("should throw error for rejected async atom", async () => {
      const error = new Error("Test error");
      const rejectedPromise = Promise.reject(error);
      rejectedPromise.catch(() => {});
      const async$ = atom(rejectedPromise);

      // Track first to let promise state update
      select(({ untrack }) => untrack(async$));
      await Promise.resolve();
      await Promise.resolve();

      const { result } = select(({ untrack }) => untrack(async$));

      expect(result.error).toBe(error);
    });

    it("should work with untrack inside function and atom form mixed", () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);
      const d$ = atom(4);

      const { result } = select(({ read, untrack }) => {
        const a = read(a$); // Tracked
        const b = untrack(b$); // NOT tracked
        const sum = untrack(() => {
          const c = read(c$); // NOT tracked
          return c + read(d$); // NOT tracked
        });
        return a + b + sum;
      });

      expect(result.value).toBe(10);
      expect(result.dependencies.size).toBe(1);
      expect(result.dependencies.has(a$)).toBe(true);
    });

    it("should restore tracking after untrack function completes", () => {
      const a$ = atom(1);
      const b$ = atom(2);
      const c$ = atom(3);

      const { result } = select(({ read, untrack }) => {
        const a = read(a$); // Tracked
        untrack(() => read(b$)); // NOT tracked
        const c = read(c$); // Tracked (after untrack)
        return a + c;
      });

      expect(result.value).toBe(4);
      expect(result.dependencies.size).toBe(2);
      expect(result.dependencies.has(a$)).toBe(true);
      expect(result.dependencies.has(b$)).toBe(false);
      expect(result.dependencies.has(c$)).toBe(true);
    });

    it("should throw error when called outside selection context", () => {
      const a$ = atom(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedUntrack: any = null;

      select(({ untrack }) => {
        capturedUntrack = untrack;
        return untrack(a$);
      });

      expect(() => capturedUntrack(a$)).toThrow(
        "untrack() was called outside of the selection context"
      );
    });

    it("should preserve error thrown inside untrack function", () => {
      const error = new Error("Test error");

      const { result } = select(({ untrack }) => {
        return untrack(() => {
          throw error;
        });
      });

      expect(result.error).toBe(error);
    });
  });

  describe("parallel waiting behavior", () => {
    it("all() should throw combined Promise.all for parallel waiting", async () => {
      let resolve1: (value: number) => void;
      let resolve2: (value: number) => void;
      const p1 = new Promise<number>((r) => {
        resolve1 = r;
      });
      const p2 = new Promise<number>((r) => {
        resolve2 = r;
      });
      const a$ = atom(p1);
      const b$ = atom(p2);

      // First call should throw a combined promise
      const { result: result1 } = select(({ all }) => all([a$, b$]));
      expect(result1.promise).toBeDefined();

      // Resolve promises in reverse order
      resolve2!(20);
      await Promise.resolve();

      // Still loading (a$ not resolved yet)
      const { result: result2 } = select(({ all }) => all([a$, b$]));
      expect(result2.promise).toBeDefined();

      // Resolve first promise
      resolve1!(10);
      await Promise.resolve();
      await Promise.resolve();

      // Now should be ready with both values
      const { result: result3 } = select(({ all }) => all([a$, b$]));
      expect(result3.value).toEqual([10, 20]);
    });

    it("all() should return equivalent promises when atoms unchanged", async () => {
      const p1 = new Promise<number>(() => {});
      const p2 = new Promise<number>(() => {});
      const a$ = atom(p1);
      const b$ = atom(p2);

      // Get promise from first call
      const { result: result1 } = select(({ all }) => all([a$, b$]));
      const promise1 = result1.promise;

      // Second call should return equivalent promise (same source promises)
      const { result: result2 } = select(({ all }) => all([a$, b$]));
      const promise2 = result2.promise;

      // Promises are equivalent via metadata comparison
      expect(promisesEqual(promise1, promise2)).toBe(true);
    });

    it("race() should throw combined Promise.race for parallel racing", async () => {
      let resolve1: (value: number) => void;
      let resolve2: (value: number) => void;
      const p1 = new Promise<number>((r) => {
        resolve1 = r;
      });
      const p2 = new Promise<number>((r) => {
        resolve2 = r;
      });
      const a$ = atom(p1);
      const b$ = atom(p2);

      // First call should throw a combined promise
      const { result: result1 } = select(({ race }) => race({ a: a$, b: b$ }));
      expect(result1.promise).toBeDefined();

      // Resolve second promise first (it should win the race)
      resolve2!(20);
      await Promise.resolve();
      await Promise.resolve();

      // Race should return second value (first to resolve) with key
      const { result: result2 } = select(({ race }) => race({ a: a$, b: b$ }));
      expect(result2.value).toEqual({ key: "b", value: 20 });

      // Clean up: resolve first promise
      resolve1!(10);
    });

    it("race() should return equivalent promises when atoms unchanged", async () => {
      const p1 = new Promise<number>(() => {});
      const p2 = new Promise<number>(() => {});
      const a$ = atom(p1);
      const b$ = atom(p2);

      const { result: result1 } = select(({ race }) => race({ a: a$, b: b$ }));
      const promise1 = result1.promise;

      const { result: result2 } = select(({ race }) => race({ a: a$, b: b$ }));
      const promise2 = result2.promise;

      // Promises are equivalent via metadata comparison
      expect(promisesEqual(promise1, promise2)).toBe(true);
    });

    it("any() should race all loading promises in parallel", async () => {
      let resolve1: (value: number) => void;
      let resolve2: (value: number) => void;
      const p1 = new Promise<number>((r) => {
        resolve1 = r;
      });
      const p2 = new Promise<number>((r) => {
        resolve2 = r;
      });
      const a$ = atom(p1);
      const b$ = atom(p2);

      // First call should throw combined race promise
      const { result: result1 } = select(({ any }) => any({ a: a$, b: b$ }));
      expect(result1.promise).toBeDefined();

      // Resolve second promise first
      resolve2!(20);
      await Promise.resolve();
      await Promise.resolve();

      // any() should return second value (first to resolve) with key
      const { result: result2 } = select(({ any }) => any({ a: a$, b: b$ }));
      expect(result2.value).toEqual({ key: "b", value: 20 });

      // Clean up
      resolve1!(10);
    });

    it("settled() should wait for all in parallel", async () => {
      let resolve1: (value: number) => void;
      let reject2: (error: Error) => void;
      const p1 = new Promise<number>((r) => {
        resolve1 = r;
      });
      const p2 = new Promise<number>((_, reject) => {
        reject2 = reject;
      });
      p2.catch(() => {}); // Prevent unhandled rejection
      const a$ = atom(p1);
      const b$ = atom(p2);

      // First call should throw combined promise
      const { result: result1 } = select(({ settled }) => settled([a$, b$]));
      expect(result1.promise).toBeDefined();

      // Settle promises in any order
      reject2!(new Error("fail"));
      await Promise.resolve();

      // Still loading (a$ not settled yet)
      const { result: result2 } = select(({ settled }) => settled([a$, b$]));
      expect(result2.promise).toBeDefined();

      // Settle first
      resolve1!(10);
      await Promise.resolve();
      await Promise.resolve();

      // Now should have settled results
      const { result: result3 } = select(({ settled }) => settled([a$, b$]));
      expect(result3.value).toEqual([
        { status: "ready", value: 10 },
        { status: "error", error: expect.any(Error) },
      ]);
    });

    it("settled() should return equivalent promises when atoms unchanged", async () => {
      const p1 = new Promise<number>(() => {});
      const p2 = new Promise<number>(() => {});
      const a$ = atom(p1);
      const b$ = atom(p2);

      const { result: result1 } = select(({ settled }) => settled([a$, b$]));
      const promise1 = result1.promise;

      const { result: result2 } = select(({ settled }) => settled([a$, b$]));
      const promise2 = result2.promise;

      // Promises are equivalent via metadata comparison
      expect(promisesEqual(promise1, promise2)).toBe(true);
    });
  });
});
