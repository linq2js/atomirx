import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { SYMBOL_ATOM } from "./types";

describe("atom", () => {
  describe("basic functionality", () => {
    it("should create an atom with initial value", () => {
      const count$ = atom(0);
      expect(count$.get()).toBe(0);
    });

    it("should have SYMBOL_ATOM marker", () => {
      const count$ = atom(0);
      expect(count$[SYMBOL_ATOM]).toBe(true);
    });

    it("should set value directly", () => {
      const count$ = atom(0);
      count$.set(5);
      expect(count$.get()).toBe(5);
    });

    it("should set value with reducer", () => {
      const count$ = atom(0);
      count$.set((prev) => prev + 1);
      expect(count$.get()).toBe(1);
      count$.set((prev) => prev * 2);
      expect(count$.get()).toBe(2);
    });

    it("should reset to initial value", () => {
      const count$ = atom(10);
      count$.set(42);
      expect(count$.get()).toBe(42);
      count$.reset();
      expect(count$.get()).toBe(10);
    });

    it("should store objects", () => {
      const user$ = atom({ name: "John", age: 30 });
      expect(user$.get()).toEqual({ name: "John", age: 30 });
      user$.set({ name: "Jane", age: 25 });
      expect(user$.get()).toEqual({ name: "Jane", age: 25 });
    });

    it("should store null and undefined", () => {
      const nullable$ = atom<string | null>(null);
      expect(nullable$.get()).toBe(null);
      nullable$.set("hello");
      expect(nullable$.get()).toBe("hello");
      nullable$.set(null);
      expect(nullable$.get()).toBe(null);

      const undef$ = atom<string | undefined>(undefined);
      expect(undef$.get()).toBe(undefined);
      undef$.set("world");
      expect(undef$.get()).toBe("world");
    });

    it("should store arrays", () => {
      const items$ = atom<number[]>([1, 2, 3]);
      expect(items$.get()).toEqual([1, 2, 3]);
      items$.set((prev) => [...prev, 4]);
      expect(items$.get()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("subscriptions", () => {
    it("should notify subscribers on value change", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      count$.on(listener);
      count$.set(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify if value is the same (strict equality)", () => {
      const count$ = atom(5);
      const listener = vi.fn();
      count$.on(listener);
      count$.set(5);
      expect(listener).not.toHaveBeenCalled();
    });

    it("should allow unsubscribing", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      const unsub = count$.on(listener);
      count$.set(1);
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
      count$.set(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support multiple subscribers", () => {
      const count$ = atom(0);
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      count$.on(listener1);
      count$.on(listener2);
      count$.set(1);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should notify on reset if value changed", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      count$.set(5);
      count$.on(listener);
      count$.reset();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify on reset if already at initial value", () => {
      const count$ = atom(0);
      const listener = vi.fn();
      count$.on(listener);
      count$.reset();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("dirty", () => {
    it("should return false when just initialized", () => {
      const count$ = atom(42);
      expect(count$.dirty()).toBe(false);
    });

    it("should return true after value is set", () => {
      const count$ = atom(0);
      expect(count$.dirty()).toBe(false);

      count$.set(10);
      expect(count$.dirty()).toBe(true);
    });

    it("should return false after reset", () => {
      const count$ = atom(0);
      count$.set(10);
      expect(count$.dirty()).toBe(true);

      count$.reset();
      expect(count$.dirty()).toBe(false);
    });

    it("should stay dirty after multiple sets", () => {
      const count$ = atom(0);
      count$.set(1);
      count$.set(2);
      count$.set(3);
      expect(count$.dirty()).toBe(true);
    });

    it("should not become dirty if set to same value (equality check)", () => {
      const count$ = atom(42);
      count$.set(42); // Same value, equality check prevents change
      expect(count$.dirty()).toBe(false);
    });

    it("should work with objects and shallow equality", () => {
      const obj$ = atom({ a: 1 }, { equals: "shallow" });
      expect(obj$.dirty()).toBe(false);

      obj$.set({ a: 1 }); // Shallow equal, no change
      expect(obj$.dirty()).toBe(false);

      obj$.set({ a: 2 }); // Different value
      expect(obj$.dirty()).toBe(true);

      obj$.reset();
      expect(obj$.dirty()).toBe(false);
    });

    it("should be useful for tracking unsaved changes", () => {
      const form$ = atom({ name: "", email: "" });

      expect(form$.dirty()).toBe(false); // No changes yet

      form$.set({ name: "John", email: "" });
      expect(form$.dirty()).toBe(true); // Has unsaved changes

      form$.reset();
      expect(form$.dirty()).toBe(false); // Changes discarded
    });
  });

  describe("equality options", () => {
    it("should use strict equality by default", () => {
      const obj$ = atom({ a: 1 });
      const listener = vi.fn();
      obj$.on(listener);
      obj$.set({ a: 1 }); // Different object, same content
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support shallow equality", () => {
      const obj$ = atom({ a: 1 }, { equals: "shallow" });
      const listener = vi.fn();
      obj$.on(listener);
      obj$.set({ a: 1 }); // Same content
      expect(listener).not.toHaveBeenCalled();
      obj$.set({ a: 2 }); // Different content
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support custom equality function", () => {
      const user$ = atom(
        { id: 1, name: "John" },
        { equals: (a, b) => a.id === b.id }
      );
      const listener = vi.fn();
      user$.on(listener);
      user$.set({ id: 1, name: "Jane" }); // Same id
      expect(listener).not.toHaveBeenCalled();
      user$.set({ id: 2, name: "Jane" }); // Different id
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("Promise storage (raw)", () => {
    it("should store Promise as-is", () => {
      const promise = Promise.resolve(42);
      const data$ = atom(promise);
      expect(data$.get()).toBe(promise);
    });

    it("should store a new Promise on set", () => {
      const promise1 = Promise.resolve(1);
      const promise2 = Promise.resolve(2);
      const data$ = atom(promise1);
      expect(data$.get()).toBe(promise1);
      data$.set(promise2);
      expect(data$.get()).toBe(promise2);
    });

    it("should reset to original Promise object", () => {
      const originalPromise = Promise.resolve(42);
      const data$ = atom(originalPromise);
      data$.set(Promise.resolve(100));
      expect(data$.get()).not.toBe(originalPromise);
      data$.reset();
      expect(data$.get()).toBe(originalPromise);
    });
  });

  describe("reducer errors", () => {
    it("should throw synchronously if reducer throws", () => {
      const count$ = atom(0);
      const error = new Error("Reducer failed");
      expect(() => {
        count$.set(() => {
          throw error;
        });
      }).toThrow(error);
      // Value should remain unchanged
      expect(count$.get()).toBe(0);
    });
  });

  describe("lazy initialization", () => {
    it("should support lazy initializer function", () => {
      const initializer = vi.fn(() => 42);
      const count$ = atom(initializer);
      expect(initializer).toHaveBeenCalledTimes(1);
      expect(count$.get()).toBe(42);
    });

    it("should only call initializer once", () => {
      const initializer = vi.fn(() => ({ data: "expensive" }));
      const obj$ = atom(initializer);
      expect(initializer).toHaveBeenCalledTimes(1);
      // Access value multiple times
      obj$.get();
      obj$.get();
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it("should re-run initializer on reset", () => {
      let callCount = 0;
      const initializer = () => {
        callCount++;
        return callCount; // Returns different value each call
      };
      const count$ = atom(initializer);
      expect(count$.get()).toBe(1); // First call returns 1
      expect(callCount).toBe(1);

      count$.set(100);
      expect(count$.get()).toBe(100);

      count$.reset();
      expect(count$.get()).toBe(2); // Re-runs initializer, gets fresh value
      expect(callCount).toBe(2); // Initializer called again
    });

    it("should work with lazy initializer returning object", () => {
      const obj$ = atom(() => ({ count: 0, items: [] as number[] }));
      expect(obj$.get()).toEqual({ count: 0, items: [] });
      obj$.set((prev) => ({ ...prev, count: 1 }));
      expect(obj$.get()).toEqual({ count: 1, items: [] });
    });

    it("should work with lazy initializer returning Promise", () => {
      const promise = Promise.resolve(42);
      const data$ = atom(() => promise);
      expect(data$.get()).toBe(promise);
    });

    it("should still work with direct value (non-function)", () => {
      const count$ = atom(10);
      expect(count$.get()).toBe(10);
    });
  });

  describe("metadata", () => {
    it("should store meta", () => {
      const count$ = atom(0, { meta: { key: "count" } });
      expect(count$.meta).toEqual({ key: "count" });
    });

    it("should have undefined meta if not provided", () => {
      const count$ = atom(0);
      expect(count$.meta).toBe(undefined);
    });
  });

  describe("plugin system (use)", () => {
    it("should support .use() for extensions", () => {
      // Note: Don't use ...source spread as it copies values, not getters
      // Instead, access source properties through the reference
      const base$ = atom(0);
      const count$ = base$.use((source) => ({
        get: source.get,
        set: source.set,
        reset: source.reset,
        on: source.on,
        increment: () => source.set((v) => v + 1),
      }));

      expect(count$.get()).toBe(0);
      count$.increment();
      expect(count$.get()).toBe(1);
    });

    it("should support .use() with source reference pattern", () => {
      // Simpler pattern: just reference the original atom
      const base$ = atom(0);
      const enhanced$ = base$.use(() => ({
        get: () => base$.get(),
        increment: () => base$.set((v) => v + 1),
        decrement: () => base$.set((v) => v - 1),
      }));

      expect(enhanced$.get()).toBe(0);
      enhanced$.increment();
      expect(enhanced$.get()).toBe(1);
      enhanced$.increment();
      expect(enhanced$.get()).toBe(2);
      enhanced$.decrement();
      expect(enhanced$.get()).toBe(1);
    });
  });
});
