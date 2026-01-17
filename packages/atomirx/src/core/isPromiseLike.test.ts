import { describe, it, expect } from "vitest";
import { isPromiseLike } from "./isPromiseLike";

describe("isPromiseLike", () => {
  describe("returns true for PromiseLike values", () => {
    it("should return true for native Promise", () => {
      expect(isPromiseLike(Promise.resolve(1))).toBe(true);
    });

    it("should return true for rejected Promise", () => {
      const rejected = Promise.reject(new Error("test"));
      rejected.catch(() => {}); // Prevent unhandled rejection
      expect(isPromiseLike(rejected)).toBe(true);
    });

    it("should return true for object with then method", () => {
      const thenable = { then: () => {} };
      expect(isPromiseLike(thenable)).toBe(true);
    });

    it("should return true for object with then method that takes callbacks", () => {
      const thenable = {
        then: (resolve: (v: number) => void, _reject: (e: Error) => void) => {
          resolve(42);
        },
      };
      expect(isPromiseLike(thenable)).toBe(true);
    });
  });

  describe("returns false for non-PromiseLike values", () => {
    it("should return false for null", () => {
      expect(isPromiseLike(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isPromiseLike(undefined)).toBe(false);
    });

    it("should return false for number", () => {
      expect(isPromiseLike(42)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isPromiseLike("hello")).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isPromiseLike(true)).toBe(false);
    });

    it("should return false for plain object without then", () => {
      expect(isPromiseLike({ value: 1 })).toBe(false);
    });

    it("should return false for array", () => {
      expect(isPromiseLike([1, 2, 3])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isPromiseLike(() => {})).toBe(false);
    });

    it("should return false for object with non-function then property", () => {
      expect(isPromiseLike({ then: "not a function" })).toBe(false);
    });

    it("should return false for object with then as number", () => {
      expect(isPromiseLike({ then: 123 })).toBe(false);
    });
  });
});
