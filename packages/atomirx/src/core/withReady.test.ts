import { describe, it, expect } from "vitest";
import { withReady } from "./withReady";
import { atom } from "./atom";
import { select } from "./select";
describe("withReady", () => {
  describe("basic functionality", () => {
    it("should add ready method to context", () => {
      select((context) => {
        const enhanced = context.use(withReady());
        expect(typeof enhanced.ready).toBe("function");
        return null;
      });
    });

    it("should preserve original context methods", () => {
      select((context) => {
        const enhanced = context.use(withReady());
        expect(typeof enhanced.read).toBe("function");
        expect(typeof enhanced.all).toBe("function");
        expect(typeof enhanced.any).toBe("function");
        expect(typeof enhanced.race).toBe("function");
        expect(typeof enhanced.settled).toBe("function");
        expect(typeof enhanced.safe).toBe("function");
        expect(typeof enhanced.use).toBe("function");
        return null;
      });
    });
  });

  describe("ready() with non-null values", () => {
    it("should return value when atom has non-null value", () => {
      const count$ = atom(42);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(count$);
      });

      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should return value when atom has zero", () => {
      const count$ = atom(0);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(count$);
      });

      expect(result.value).toBe(0);
    });

    it("should return value when atom has empty string", () => {
      const str$ = atom("");

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(str$);
      });

      expect(result.value).toBe("");
    });

    it("should return value when atom has false", () => {
      const bool$ = atom(false);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(bool$);
      });

      expect(result.value).toBe(false);
    });

    it("should return value when atom has object", () => {
      const obj$ = atom({ name: "test" });

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(obj$);
      });

      expect(result.value).toEqual({ name: "test" });
    });
  });

  describe("ready() with null/undefined values", () => {
    it("should throw never-resolve promise when atom value is null", () => {
      const nullable$ = atom<string | null>(null);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(nullable$);
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when atom value is undefined", () => {
      const undefinedAtom$ = atom<string | undefined>(undefined);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(undefinedAtom$);
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });
  });

  describe("ready() with selector", () => {
    it("should apply selector and return result when non-null", () => {
      const user$ = atom({ id: 1, name: "John" });

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(user$, (user) => user.name);
      });

      expect(result.value).toBe("John");
    });

    it("should throw never-resolve promise when selector returns null", () => {
      const user$ = atom<{ id: number; email: string | null }>({
        id: 1,
        email: null,
      });

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(user$, (user) => user.email);
      });

      expect(result.value).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when selector returns undefined", () => {
      const data$ = atom<{ value?: string }>({});

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, (data) => data.value);
      });

      expect(result.value).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should return zero from selector", () => {
      const data$ = atom({ count: 0 });

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, (data) => data.count);
      });

      expect(result.value).toBe(0);
    });

    it("should return empty string from selector", () => {
      const data$ = atom({ name: "" });

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, (data) => data.name);
      });

      expect(result.value).toBe("");
    });
  });

  describe("dependency tracking", () => {
    it("should track atom as dependency", () => {
      const count$ = atom(42);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(count$);
      });

      expect(result.dependencies.has(count$)).toBe(true);
    });

    it("should track atom as dependency even when throwing promise", () => {
      const nullable$ = atom<string | null>(null);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(nullable$);
      });

      expect(result.dependencies.has(nullable$)).toBe(true);
    });
  });

  describe("never-resolve promise behavior", () => {
    it("should return a promise that never resolves", async () => {
      const nullable$ = atom<string | null>(null);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(nullable$);
      });

      // The promise should never resolve
      // We test this by racing with a timeout
      const timeoutPromise = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), 50)
      );

      const raceResult = await Promise.race([result.promise, timeoutPromise]);
      expect(raceResult).toBe("timeout");
    });
  });

  describe("ready() with array", () => {
    it("should return array when all values are non-null", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([1, "hello", true]);
      });

      expect(result.value).toEqual([1, "hello", true]);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should return array with zero values", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([0, "", false]);
      });

      expect(result.value).toEqual([0, "", false]);
    });

    it("should throw never-resolve promise when any value is null", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([1, null, 3]);
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when any value is undefined", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([1, 2, undefined]);
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when first value is null", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([null, 2, 3]);
      });

      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when last value is undefined", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([1, 2, undefined]);
      });

      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should work with empty array", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([]);
      });

      expect(result.value).toEqual([]);
    });

    it("should work with single element array", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready([42]);
      });

      expect(result.value).toEqual([42]);
    });

    it("should work with all() result", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        const values = ctx.all([a$, b$]);
        return ctx.ready(values);
      });

      expect(result.value).toEqual([1, 2]);
    });

    it("should suspend when all() contains null atom value", () => {
      const a$ = atom<number | null>(null);
      const b$ = atom(2);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        const values = ctx.all([a$, b$]);
        return ctx.ready(values);
      });

      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should work with race() result", () => {
      const a$ = atom(1);
      const b$ = atom(2);

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        const raceResult = ctx.race({ a: a$, b: b$ });
        // race returns [key, value] & { key, value }
        return ctx.ready(raceResult);
      });

      // Should return the hybrid tuple with key/value properties
      expect(result.value?.[0]).toBe("a");
      expect(result.value?.[1]).toBe(1);
      // Hybrid type also has key/value properties
      expect((result.value as any)?.key).toBe("a");
      expect((result.value as any)?.value).toBe(1);
    });

    it("should suspend when race() winner value is null", () => {
      const a$ = atom<number | null>(null);
      const b$ = atom(new Promise<number>(() => {})); // pending

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        const raceResult = ctx.race({ a: a$, b: b$ });
        return ctx.ready(raceResult);
      });

      // race returns [key, value] where value is null
      // ready() should suspend because value (index 1) is null
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw error for invalid input", () => {
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        // @ts-expect-error - testing invalid input
        return ctx.ready("not an atom or array");
      });

      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(
        "ready() expects an Atom or an array of values"
      );
    });
  });

  describe("ready() with async selector", () => {
    it("should suspend when selector returns a pending promise", () => {
      const data$ = atom({ id: 1 });
      const pendingPromise = new Promise<string>(() => {
        // Never resolves - stays pending
      });

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => pendingPromise);
      });

      // Should suspend with the tracked promise
      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should return value when selector returns a resolved promise", async () => {
      const data$ = atom({ id: 1 });
      const resolvedPromise = Promise.resolve("async result");

      // First call to track the promise and trigger state tracking
      select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => resolvedPromise);
      });

      // Wait for the promise .then() handlers to run and update cache
      await resolvedPromise;
      await new Promise<void>((r) => queueMicrotask(() => r()));

      // Second call - promise should now be fulfilled in cache
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => resolvedPromise);
      });

      expect(result.value).toBe("async result");
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should throw error when selector returns a rejected promise", async () => {
      const data$ = atom({ id: 1 });
      const testError = new Error("async error");
      const rejectedPromise = Promise.reject(testError);

      // Prevent unhandled rejection warning
      rejectedPromise.catch(() => {});

      // First call to track the promise
      select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => rejectedPromise);
      });

      // Wait for the promise rejection handlers to run
      await new Promise<void>((r) => queueMicrotask(() => r()));
      await new Promise<void>((r) => queueMicrotask(() => r()));

      // Second call - promise should now be rejected in cache
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => rejectedPromise);
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBe(testError);
      expect(result.promise).toBeUndefined();
    });

    it("should return null when async selector resolves to null (bypasses null check)", async () => {
      const data$ = atom({ id: 1 });
      const resolvedToNull = Promise.resolve(null);

      // First call to track the promise
      select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => resolvedToNull);
      });

      // Wait for the promise to be tracked as fulfilled
      await resolvedToNull;
      await new Promise<void>((r) => queueMicrotask(() => r()));

      // Second call - promise should now be fulfilled in cache
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => resolvedToNull);
      });

      // Async selectors bypass null/undefined checking - value is returned as-is
      expect(result.value).toBe(null);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should return undefined when async selector resolves to undefined (bypasses undefined check)", async () => {
      const data$ = atom({ id: 1 });
      const resolvedToUndefined = Promise.resolve(undefined);

      // First call to track the promise
      select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => resolvedToUndefined);
      });

      // Wait for the promise to be tracked as fulfilled
      await resolvedToUndefined;
      await new Promise<void>((r) => queueMicrotask(() => r()));

      // Second call - promise should now be fulfilled in cache
      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => resolvedToUndefined);
      });

      // Async selectors bypass null/undefined checking - value is returned as-is
      expect(result.value).toBe(undefined);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should track atom as dependency when using async selector", () => {
      const data$ = atom({ id: 1 });
      const pendingPromise = new Promise<string>(() => {});

      const { result } = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, () => pendingPromise);
      });

      // Dependency is tracked even when suspending
      expect(result.dependencies.has(data$)).toBe(true);
    });
  });
});
