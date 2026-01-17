import { describe, it, expect } from "vitest";
import {
  strictEqual,
  shallowEqual,
  shallow2Equal,
  shallow3Equal,
  deepEqual,
  resolveEquality,
  equality,
  createStableFn,
  isStableFn,
  tryStabilize,
} from "./equality";

describe("equality", () => {
  describe("strictEqual", () => {
    it("should return true for same reference", () => {
      const obj = { a: 1 };
      expect(strictEqual(obj, obj)).toBe(true);
    });

    it("should return false for different references with same content", () => {
      expect(strictEqual({ a: 1 }, { a: 1 })).toBe(false);
    });

    it("should return true for same primitives", () => {
      expect(strictEqual(1, 1)).toBe(true);
      expect(strictEqual("hello", "hello")).toBe(true);
      expect(strictEqual(true, true)).toBe(true);
    });

    it("should handle NaN correctly (Object.is behavior)", () => {
      expect(strictEqual(NaN, NaN)).toBe(true);
    });

    it("should distinguish +0 and -0", () => {
      expect(strictEqual(0, -0)).toBe(false);
    });
  });

  describe("shallowEqual", () => {
    it("should return true for same reference", () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it("should return true for objects with same keys and values", () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it("should return false for objects with different keys", () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it("should return false for objects with different values", () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should return false for objects with different number of keys", () => {
      expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("should return true for arrays with same elements", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it("should return false for arrays with different elements", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("should return false for arrays with different lengths", () => {
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("should return false for nested objects with different references", () => {
      expect(shallowEqual({ nested: { a: 1 } }, { nested: { a: 1 } })).toBe(
        false
      );
    });

    it("should return true for nested objects with same reference", () => {
      const nested = { a: 1 };
      expect(shallowEqual({ nested }, { nested })).toBe(true);
    });

    it("should return false when comparing object to null", () => {
      expect(shallowEqual({ a: 1 }, null as any)).toBe(false);
    });

    it("should return false when comparing object to primitive", () => {
      expect(shallowEqual({ a: 1 }, 1 as any)).toBe(false);
    });

    it("should support custom item comparator", () => {
      const customEqual = (a: unknown, b: unknown) =>
        JSON.stringify(a) === JSON.stringify(b);
      expect(
        shallowEqual({ nested: { a: 1 } }, { nested: { a: 1 } }, customEqual)
      ).toBe(true);
    });
  });

  describe("shallow2Equal", () => {
    it("should compare 2 levels deep", () => {
      expect(
        shallow2Equal({ nested: { a: 1 } }, { nested: { a: 1 } })
      ).toBe(true);
    });

    it("should return false for 3 levels deep difference", () => {
      expect(
        shallow2Equal(
          { nested: { deep: { a: 1 } } },
          { nested: { deep: { a: 1 } } }
        )
      ).toBe(false);
    });

    it("should work with arrays of objects", () => {
      expect(shallow2Equal([{ id: 1 }], [{ id: 1 }])).toBe(true);
    });
  });

  describe("shallow3Equal", () => {
    it("should compare 3 levels deep", () => {
      expect(
        shallow3Equal(
          { nested: { deep: { a: 1 } } },
          { nested: { deep: { a: 1 } } }
        )
      ).toBe(true);
    });

    it("should return false for 4 levels deep difference", () => {
      expect(
        shallow3Equal(
          { l1: { l2: { l3: { a: 1 } } } },
          { l1: { l2: { l3: { a: 1 } } } }
        )
      ).toBe(false);
    });
  });

  describe("deepEqual", () => {
    it("should compare deeply nested objects", () => {
      expect(
        deepEqual(
          { a: { b: { c: { d: 1 } } } },
          { a: { b: { c: { d: 1 } } } }
        )
      ).toBe(true);
    });

    it("should return false for deeply nested differences", () => {
      expect(
        deepEqual(
          { a: { b: { c: { d: 1 } } } },
          { a: { b: { c: { d: 2 } } } }
        )
      ).toBe(false);
    });

    it("should handle arrays", () => {
      expect(deepEqual([1, [2, [3]]], [1, [2, [3]]])).toBe(true);
    });

    it("should handle Date objects", () => {
      const date = new Date("2024-01-01");
      expect(deepEqual(date, new Date("2024-01-01"))).toBe(true);
    });
  });

  describe("resolveEquality", () => {
    it("should return strictEqual for undefined", () => {
      expect(resolveEquality(undefined)).toBe(strictEqual);
    });

    it("should return strictEqual for 'strict'", () => {
      expect(resolveEquality("strict")).toBe(strictEqual);
    });

    it("should return shallowEqual for 'shallow'", () => {
      expect(resolveEquality("shallow")).toBe(shallowEqual);
    });

    it("should return shallow2Equal for 'shallow2'", () => {
      expect(resolveEquality("shallow2")).toBe(shallow2Equal);
    });

    it("should return shallow3Equal for 'shallow3'", () => {
      expect(resolveEquality("shallow3")).toBe(shallow3Equal);
    });

    it("should return deepEqual for 'deep'", () => {
      expect(resolveEquality("deep")).toBe(deepEqual);
    });

    it("should return custom function as-is", () => {
      const customFn = (a: number, b: number) => a === b;
      expect(resolveEquality(customFn)).toBe(customFn);
    });
  });

  describe("equality helper", () => {
    it("should be an alias for resolveEquality with shorthand", () => {
      expect(equality("strict")).toBe(strictEqual);
      expect(equality("shallow")).toBe(shallowEqual);
      expect(equality("deep")).toBe(deepEqual);
    });
  });
});

describe("StableFn", () => {
  describe("createStableFn", () => {
    it("should create a callable wrapper", () => {
      const fn = (x: number) => x * 2;
      const stable = createStableFn(fn);

      expect(stable(5)).toBe(10);
    });

    it("should preserve original function via getOriginal", () => {
      const fn = (x: number) => x * 2;
      const stable = createStableFn(fn);

      expect(stable.getOriginal()).toBe(fn);
    });

    it("should return current function via getCurrent", () => {
      const fn = (x: number) => x * 2;
      const stable = createStableFn(fn);

      expect(stable.getCurrent()).toBe(fn);
    });

    it("should allow updating current function via setCurrent", () => {
      const fn1 = (x: number) => x * 2;
      const fn2 = (x: number) => x * 3;
      const stable = createStableFn(fn1);

      stable.setCurrent(fn2);

      expect(stable(5)).toBe(15);
      expect(stable.getCurrent()).toBe(fn2);
      expect(stable.getOriginal()).toBe(fn1);
    });
  });

  describe("isStableFn", () => {
    it("should return true for StableFn", () => {
      const stable = createStableFn(() => 42);
      expect(isStableFn(stable)).toBe(true);
    });

    it("should return false for regular function", () => {
      expect(isStableFn(() => 42)).toBe(false);
    });

    it("should return false for non-function", () => {
      expect(isStableFn({ a: 1 })).toBe(false);
      expect(isStableFn(42)).toBe(false);
      expect(isStableFn("string")).toBe(false);
    });

    it("should return false for function with partial StableFn interface", () => {
      const partial = Object.assign(() => 42, { getOriginal: () => {} });
      expect(isStableFn(partial)).toBe(false);
    });
  });
});

describe("tryStabilize", () => {
  describe("first call (no previous value)", () => {
    it("should return value as-is for non-function", () => {
      const [result, wasStable] = tryStabilize(undefined, 42, strictEqual);
      expect(result).toBe(42);
      expect(wasStable).toBe(false);
    });

    it("should wrap function in StableFn", () => {
      const fn = () => 42;
      const [result, wasStable] = tryStabilize(undefined, fn, strictEqual);

      expect(isStableFn(result)).toBe(true);
      expect(result()).toBe(42);
      expect(wasStable).toBe(false);
    });
  });

  describe("subsequent calls with functions", () => {
    it("should update existing StableFn and return stable", () => {
      const fn1 = () => 1;
      const fn2 = () => 2;

      const [stable1] = tryStabilize(undefined, fn1, strictEqual);
      const [stable2, wasStable] = tryStabilize(
        { value: stable1 },
        fn2,
        strictEqual
      );

      expect(stable2).toBe(stable1); // Same reference
      expect(stable2()).toBe(2); // But calls new function
      expect(wasStable).toBe(true);
    });

    it("should create new StableFn if previous was not StableFn", () => {
      const fn = () => 42;
      const [result, wasStable] = tryStabilize(
        { value: "not a stable fn" as any },
        fn,
        strictEqual
      );

      expect(isStableFn(result)).toBe(true);
      expect(wasStable).toBe(false);
    });
  });

  describe("Date handling", () => {
    it("should return previous Date if timestamps match", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-01");

      const [result, wasStable] = tryStabilize(
        { value: date1 },
        date2,
        strictEqual
      );

      expect(result).toBe(date1);
      expect(wasStable).toBe(true);
    });

    it("should return new Date if timestamps differ", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-02");

      const [result, wasStable] = tryStabilize(
        { value: date1 },
        date2,
        strictEqual
      );

      expect(result).toBe(date2);
      expect(wasStable).toBe(false);
    });

    it("should return new Date if previous was not a Date", () => {
      const date = new Date("2024-01-01");

      const [result, wasStable] = tryStabilize(
        { value: "not a date" as any },
        date,
        strictEqual
      );

      expect(result).toBe(date);
      expect(wasStable).toBe(false);
    });
  });

  describe("equality-based stabilization", () => {
    it("should return previous value if equal", () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1 };

      const [result, wasStable] = tryStabilize(
        { value: obj1 },
        obj2,
        shallowEqual
      );

      expect(result).toBe(obj1);
      expect(wasStable).toBe(true);
    });

    it("should return new value if not equal", () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 2 };

      const [result, wasStable] = tryStabilize(
        { value: obj1 },
        obj2,
        shallowEqual
      );

      expect(result).toBe(obj2);
      expect(wasStable).toBe(false);
    });
  });
});
