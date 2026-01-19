import { describe, it, expect } from "vitest";
import { withReady } from "./withReady";
import { atom } from "./atom";
import { select, SelectContext } from "./select";

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

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(count$);
      });

      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeUndefined();
    });

    it("should return value when atom has zero", () => {
      const count$ = atom(0);

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(count$);
      });

      expect(result.value).toBe(0);
    });

    it("should return value when atom has empty string", () => {
      const str$ = atom("");

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(str$);
      });

      expect(result.value).toBe("");
    });

    it("should return value when atom has false", () => {
      const bool$ = atom(false);

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(bool$);
      });

      expect(result.value).toBe(false);
    });

    it("should return value when atom has object", () => {
      const obj$ = atom({ name: "test" });

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(obj$);
      });

      expect(result.value).toEqual({ name: "test" });
    });
  });

  describe("ready() with null/undefined values", () => {
    it("should throw never-resolve promise when atom value is null", () => {
      const nullable$ = atom<string | null>(null);

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(nullable$);
      });

      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when atom value is undefined", () => {
      const undefinedAtom$ = atom<string | undefined>(undefined);

      const result = select((context) => {
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

      const result = select((context) => {
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

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(user$, (user) => user.email);
      });

      expect(result.value).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should throw never-resolve promise when selector returns undefined", () => {
      const data$ = atom<{ value?: string }>({});

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, (data) => data.value);
      });

      expect(result.value).toBeUndefined();
      expect(result.promise).toBeInstanceOf(Promise);
    });

    it("should return zero from selector", () => {
      const data$ = atom({ count: 0 });

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, (data) => data.count);
      });

      expect(result.value).toBe(0);
    });

    it("should return empty string from selector", () => {
      const data$ = atom({ name: "" });

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(data$, (data) => data.name);
      });

      expect(result.value).toBe("");
    });
  });

  describe("dependency tracking", () => {
    it("should track atom as dependency", () => {
      const count$ = atom(42);

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(count$);
      });

      expect(result.dependencies.has(count$)).toBe(true);
    });

    it("should track atom as dependency even when throwing promise", () => {
      const nullable$ = atom<string | null>(null);

      const result = select((context) => {
        const ctx = context.use(withReady());
        return ctx.ready(nullable$);
      });

      expect(result.dependencies.has(nullable$)).toBe(true);
    });
  });

  describe("never-resolve promise behavior", () => {
    it("should return a promise that never resolves", async () => {
      const nullable$ = atom<string | null>(null);

      const result = select((context) => {
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
});
