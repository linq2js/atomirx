import { describe, it, expect, vi } from "vitest";
import { withUse } from "./withUse";

describe("withUse", () => {
  describe("basic functionality", () => {
    it("should add use method to object", () => {
      const obj = { value: 1 };
      const result = withUse(obj);

      expect(result.value).toBe(1);
      expect(typeof result.use).toBe("function");
    });

    it("should preserve original object properties", () => {
      const obj = { a: 1, b: "hello", c: true };
      const result = withUse(obj);

      expect(result.a).toBe(1);
      expect(result.b).toBe("hello");
      expect(result.c).toBe(true);
    });

    it("should work with arrays", () => {
      const arr = [1, 2, 3];
      const result = withUse(arr);

      expect(result[0]).toBe(1);
      expect(result.length).toBe(3);
      expect(typeof result.use).toBe("function");
    });
  });

  describe("use() transformations", () => {
    it("should transform object with plugin", () => {
      const obj = withUse({ value: 10 });

      const transformed = obj.use((source) => ({
        ...source,
        doubled: source.value * 2,
      }));

      expect(transformed.value).toBe(10);
      expect(transformed.doubled).toBe(20);
    });

    it("should return source when plugin returns void", () => {
      const obj = withUse({ value: 1 });
      const sideEffect = vi.fn();

      const result = obj.use((source) => {
        sideEffect(source.value);
      });

      expect(sideEffect).toHaveBeenCalledWith(1);
      expect(result).toBe(obj);
    });

    it("should return source when plugin returns undefined", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => undefined);

      expect(result).toBe(obj);
    });

    it("should return source when plugin returns null", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => null as any);

      expect(result).toBe(obj);
    });

    it("should return source when plugin returns false", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => false as any);

      expect(result).toBe(obj);
    });

    it("should return source when plugin returns empty string", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => "" as any);

      expect(result).toBe(obj);
    });

    it("should return source when plugin returns 0", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => 0 as any);

      expect(result).toBe(obj);
    });
  });

  describe("chaining", () => {
    it("should allow chaining by wrapping result with use method", () => {
      const obj = withUse({ value: 1 });

      // First transformation - result gets wrapped with use()
      const withA = obj.use((source) => ({ ...source, a: "first" }));
      expect(withA.value).toBe(1);
      expect(withA.a).toBe("first");
      expect(typeof withA.use).toBe("function");
    });

    it("should pass the transformed object to the next use() in chain", () => {
      const obj = withUse({ value: 1 });

      // When chaining, each use() receives the result of the previous transformation
      const result = obj
        .use((source) => ({ original: source.value, a: "first" }))
        .use((source) => ({ ...source, b: "second" }));

      expect(result.original).toBe(1);
      expect(result.a).toBe("first");
      expect(result.b).toBe("second");
    });

    it("should wrap result with withUse if it does not have use method", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => ({ newProp: "test" }));

      expect(result.newProp).toBe("test");
      expect(typeof result.use).toBe("function");
    });

    it("should return as-is if result already has use method", () => {
      const obj = withUse({ value: 1 });
      const existingWithUse = withUse({ other: 2 });

      const result = obj.use(() => existingWithUse);

      expect(result).toBe(existingWithUse);
    });

    it("should allow fluent chaining with independent transformations", () => {
      const obj = withUse({ value: 1 });

      // Each use() receives the result of the previous use()
      const result = obj
        .use((source) => ({ value: source.value, doubled: source.value * 2 }))
        .use((source) => ({ ...source, tripled: source.value * 3 }));

      expect(result.value).toBe(1);
      expect(result.doubled).toBe(2);
      expect(result.tripled).toBe(3);
    });
  });

  describe("primitive return values", () => {
    it("should return primitive number directly", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => 42);

      expect(result).toBe(42);
    });

    it("should return primitive string directly", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => "hello");

      expect(result).toBe("hello");
    });

    it("should return primitive boolean directly", () => {
      const obj = withUse({ value: 1 });

      const result = obj.use(() => true);

      expect(result).toBe(true);
    });
  });

  describe("function return values", () => {
    it("should wrap function result with withUse if no use method", () => {
      const obj = withUse({ value: 1 });
      const fn = () => 42;

      const result = obj.use(() => fn);

      expect(result()).toBe(42);
      expect(typeof result.use).toBe("function");
    });

    it("should return function as-is if it has use method", () => {
      const obj = withUse({ value: 1 });
      const fnWithUse = Object.assign(() => 42, { use: () => {} });

      const result = obj.use(() => fnWithUse);

      expect(result).toBe(fnWithUse);
    });
  });

  describe("real-world patterns", () => {
    it("should support adding methods to an object", () => {
      const counter = withUse({ count: 0 });

      const enhanced = counter.use((source) => ({
        ...source,
        increment: () => {
          source.count++;
        },
        decrement: () => {
          source.count--;
        },
      }));

      enhanced.increment();
      expect(counter.count).toBe(1);

      enhanced.decrement();
      expect(counter.count).toBe(0);
    });

    it("should support middleware-like pattern", () => {
      const logger: string[] = [];

      const api = withUse({
        fetch: (url: string) => `data from ${url}`,
      });

      const withLogging = api.use((source) => ({
        ...source,
        fetch: (url: string) => {
          logger.push(`fetching: ${url}`);
          const result = source.fetch(url);
          logger.push(`fetched: ${result}`);
          return result;
        },
      }));

      const result = withLogging.fetch("/api/users");

      expect(result).toBe("data from /api/users");
      expect(logger).toEqual([
        "fetching: /api/users",
        "fetched: data from /api/users",
      ]);
    });
  });
});
