import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { atom } from "./atom";
import { onCreateHook } from "./onCreateHook";

describe("atom", () => {
  const originalOnCreateHook = onCreateHook.current;

  beforeEach(() => {
    // Reset onCreateHook
    onCreateHook.current = undefined;
  });

  afterEach(() => {
    // Restore original hooks
    onCreateHook.current = originalOnCreateHook;
  });

  describe("synchronous values", () => {
    it("should create an atom with initial value", () => {
      const count = atom(0);
      expect(count.value).toBe(0);
      expect(count.loading).toBe(false);
      expect(count.error).toBeUndefined();
    });

    it("should create an atom with object value", () => {
      const user = atom({ name: "John", age: 30 });
      expect(user.value).toEqual({ name: "John", age: 30 });
      expect(user.loading).toBe(false);
    });

    it("should create an atom with array value", () => {
      const items = atom([1, 2, 3]);
      expect(items.value).toEqual([1, 2, 3]);
    });

    it("should create an atom with null value", () => {
      const nullable = atom<string | null>(null);
      expect(nullable.value).toBe(null);
      expect(nullable.loading).toBe(false);
    });

    it("should create an atom with undefined value", () => {
      const undef = atom<string | undefined>(undefined);
      expect(undef.value).toBeUndefined();
      expect(undef.loading).toBe(false);
    });
  });

  describe("set()", () => {
    it("should update value with direct value", () => {
      const count = atom(0);
      count.set(5);
      expect(count.value).toBe(5);
    });

    it("should update value with reducer function", () => {
      const count = atom(10);
      count.set((prev) => prev + 5);
      expect(count.value).toBe(15);
    });

    it("should notify listeners on value change", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      count.set(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify when reducer returns same value", () => {
      const count = atom(5);
      const listener = vi.fn();
      count.on(listener);

      count.set((prev) => prev);
      expect(listener).not.toHaveBeenCalled();
    });

    it("should notify when setting different direct value", () => {
      const count = atom(5);
      const listener = vi.fn();
      count.on(listener);

      count.set(10);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("equals options", () => {
    it("should use strict equality by default", () => {
      const obj = { a: 1 };
      const state = atom(obj);
      const listener = vi.fn();
      state.on(listener);

      // Same reference - no notification
      state.set((prev) => prev);
      expect(listener).not.toHaveBeenCalled();

      // Different reference, same content - should notify with strict equality
      state.set((prev) => ({ ...prev }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should use shallow equality when specified", () => {
      const state = atom({ a: 1, b: 2 }, { equals: "shallow" });
      const listener = vi.fn();
      state.on(listener);

      // Same content - no notification with shallow equality
      state.set((prev) => ({ ...prev }));
      expect(listener).not.toHaveBeenCalled();

      // Different content - should notify
      state.set((prev) => ({ ...prev, a: 2 }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should use deep equality when specified", () => {
      const state = atom({ nested: { value: 1 } }, { equals: "deep" });
      const listener = vi.fn();
      state.on(listener);

      // Same deep content - no notification
      state.set(() => ({ nested: { value: 1 } }));
      expect(listener).not.toHaveBeenCalled();

      // Different deep content - should notify
      state.set(() => ({ nested: { value: 2 } }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should use custom equality function", () => {
      const state = atom(
        { id: 1, name: "John" },
        { equals: (a, b) => a.id === b.id }
      );
      const listener = vi.fn();
      state.on(listener);

      // Same id - no notification
      state.set((prev) => ({ ...prev, name: "Jane" }));
      expect(listener).not.toHaveBeenCalled();

      // Different id - should notify
      state.set((prev) => ({ ...prev, id: 2 }));
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("on() - subscriptions", () => {
    it("should subscribe to changes", () => {
      const count = atom(0);
      const listener = vi.fn();

      count.on(listener);
      count.set(1);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should return unsubscribe function", () => {
      const count = atom(0);
      const listener = vi.fn();

      const unsubscribe = count.on(listener);
      count.set(1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      count.set(2);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should support multiple listeners", () => {
      const count = atom(0);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      count.on(listener1);
      count.on(listener2);
      count.set(1);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset()", () => {
    it("should reset atom to initial state", () => {
      const count = atom(0);
      count.set(10);
      expect(count.value).toBe(10);

      count.reset();
      // After reset, accessing value triggers re-initialization
      expect(count.value).toBe(0);
    });

    it("should notify listeners on reset", () => {
      const count = atom(0);
      count.set(10);

      const listener = vi.fn();
      count.on(listener);

      count.reset();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify if atom was never initialized", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      // Reset without ever accessing value
      count.reset();
      // No notification because state was never initialized
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("key option", () => {
    it("should store key from options", () => {
      const count = atom(0, { key: "counter" });
      expect(count.key).toBe("counter");
    });

    it("should have undefined key when not provided", () => {
      const count = atom(0);
      expect(count.key).toBeUndefined();
    });
  });

  describe("onCreateHook", () => {
    it("should call onCreateHook when atom is created", () => {
      const hookFn = vi.fn();
      onCreateHook.current = hookFn;

      const count = atom(0, { key: "test-atom" });

      expect(hookFn).toHaveBeenCalledTimes(1);
      expect(hookFn).toHaveBeenCalledWith({
        type: "mutable",
        key: "test-atom",
        meta: undefined,
        atom: count,
      });
    });

    it("should call onCreateHook with undefined key when not provided", () => {
      const hookFn = vi.fn();
      onCreateHook.current = hookFn;

      const count = atom(0);

      expect(hookFn).toHaveBeenCalledTimes(1);
      expect(hookFn).toHaveBeenCalledWith({
        type: "mutable",
        key: undefined,
        meta: undefined,
        atom: count,
      });
    });

    it("should not throw when onCreateHook is undefined", () => {
      onCreateHook.current = undefined;

      expect(() => atom(0)).not.toThrow();
    });
  });

  describe("async values (PromiseLike)", () => {
    it("should start in loading state for promise initial value", () => {
      const asyncAtom = atom(Promise.resolve(42));

      // Initially loading
      expect(asyncAtom.loading).toBe(true);
      expect(asyncAtom.value).toBeUndefined();
    });

    it("should be thenable and resolve with value", async () => {
      const asyncAtom = atom(Promise.resolve(100));
      const result = await asyncAtom.then((v) => v + 1);
      expect(result).toBe(101);
    });

    it("should resolve immediately for sync values via then()", async () => {
      const syncAtom = atom(42);
      const result = await syncAtom;
      expect(result).toBe(42);
    });

    it("should allow setting value directly while loading", async () => {
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });

      const asyncAtom = atom(promise);
      expect(asyncAtom.loading).toBe(true);

      // Set with direct value while loading
      asyncAtom.set(99);

      expect(asyncAtom.loading).toBe(false);
      expect(asyncAtom.value).toBe(99);

      // Resolve original promise (should not affect state)
      resolvePromise!(10);
    });

    it("should chain reducer when atom is loading", async () => {
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });

      const asyncAtom = atom(promise);
      expect(asyncAtom.loading).toBe(true);

      // Set with reducer while loading - creates a chained promise
      asyncAtom.set((prev) => prev * 2);

      // Still loading because chained promise not resolved yet
      expect(asyncAtom.loading).toBe(true);

      // Resolve original promise
      resolvePromise!(10);

      // Wait for chained promise
      const value = await asyncAtom;
      expect(value).toBe(20); // 10 * 2
      expect(asyncAtom.loading).toBe(false);
      expect(asyncAtom.value).toBe(20);
    });

    it("should call reducer for normal sync atoms", () => {
      const syncAtom = atom(0);
      const reducer = vi.fn((prev: number) => prev + 1);
      syncAtom.set(reducer);
      expect(reducer).toHaveBeenCalledWith(0);
      expect(syncAtom.value).toBe(1);
    });

    it("should handle promise rejection", async () => {
      let rejectPromise: (error: Error) => void;
      const promise = new Promise<number>((_, reject) => {
        rejectPromise = reject;
      });

      const asyncAtom = atom(promise);
      expect(asyncAtom.loading).toBe(true);

      const error = new Error("Test error");
      rejectPromise!(error);

      // Wait for rejection to be processed
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(asyncAtom.loading).toBe(false);
      expect(asyncAtom.error).toBe(error);
      expect(asyncAtom.value).toBeUndefined();
    });

    it("should notify on promise resolution", async () => {
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });

      const asyncAtom = atom(promise);
      const listener = vi.fn();
      asyncAtom.on(listener);

      // Trigger initialization
      expect(asyncAtom.loading).toBe(true);

      // Resolve the promise
      resolvePromise!(42);

      // Wait for resolution
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(listener).toHaveBeenCalled();
      expect(asyncAtom.value).toBe(42);
    });

    it("should notify on promise rejection", async () => {
      let rejectPromise: (error: Error) => void;
      const promise = new Promise<number>((_, reject) => {
        rejectPromise = reject;
      });

      const asyncAtom = atom(promise);
      const listener = vi.fn();
      asyncAtom.on(listener);

      // Trigger initialization
      expect(asyncAtom.loading).toBe(true);

      // Reject the promise
      rejectPromise!(new Error("Test error"));

      // Wait for rejection
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(listener).toHaveBeenCalled();
    });

    it("should ignore late promise resolution after direct set", async () => {
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });

      const asyncAtom = atom(promise);
      expect(asyncAtom.loading).toBe(true);

      // Set directly while loading
      asyncAtom.set(100);
      expect(asyncAtom.value).toBe(100);
      expect(asyncAtom.loading).toBe(false);

      // Late resolution should be ignored
      resolvePromise!(42);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Value should still be 100
      expect(asyncAtom.value).toBe(100);
    });

    it("should handle multiple chained reducers", async () => {
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });

      const asyncAtom = atom(promise);
      expect(asyncAtom.loading).toBe(true);

      // Chain multiple reducers
      asyncAtom.set((prev) => prev + 1);
      asyncAtom.set((prev) => prev * 2);

      // Resolve original promise
      resolvePromise!(5);

      // Wait for chained promises
      const value = await asyncAtom;
      // (5 + 1) * 2 = 12
      expect(value).toBe(12);
    });
  });

  describe("use() - plugin system", () => {
    it("should support use() for transformations", () => {
      const count = atom(0);

      const transformed = count.use((source) => ({
        ...source,
        double: () => source.value! * 2,
      }));

      expect(transformed.double()).toBe(0);
      count.set(5);
      expect(transformed.double()).toBe(10);
    });

    it("should support chaining use() with proper reference", () => {
      const count = atom(0);

      // Each use() returns a new object, so we need to capture the reference
      const withIncrement = count.use((source) => ({
        ...source,
        increment: () => source.set((v) => v + 1),
      }));

      const withDecrement = withIncrement.use((source) => ({
        ...source,
        decrement: () => count.set((v) => v - 1),
      }));

      withIncrement.increment();
      expect(count.value).toBe(1);

      withDecrement.decrement();
      expect(count.value).toBe(0);
    });

    it("should return source when plugin returns void", () => {
      const count = atom(0);
      const sideEffect = vi.fn();

      const result = count.use((source) => {
        sideEffect(source.value);
      });

      expect(sideEffect).toHaveBeenCalledWith(0);
      expect(result).toBe(count);
    });
  });

  describe("lazy initialization", () => {
    it("should not initialize until value is accessed", () => {
      // Create atom but don't access value
      const count = atom(0);

      // Internal state should be undefined until accessed
      // We can verify this by checking that reset does nothing
      const listener = vi.fn();
      count.on(listener);
      count.reset();
      expect(listener).not.toHaveBeenCalled();

      // Now access value - triggers initialization
      expect(count.value).toBe(0);
    });

    it("should initialize on loading access", () => {
      const count = atom(0);
      expect(count.loading).toBe(false);
    });

    it("should initialize on error access", () => {
      const count = atom(0);
      expect(count.error).toBeUndefined();
    });
  });

  describe("lazy initializer function", () => {
    it("should accept a function that returns the initial value", () => {
      const factory = vi.fn(() => 42);
      const count = atom(factory);

      // Factory should not be called until value is accessed
      expect(factory).not.toHaveBeenCalled();

      // Access value - triggers factory
      expect(count.value).toBe(42);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should only call factory once on multiple accesses", () => {
      const factory = vi.fn(() => "hello");
      const text = atom(factory);

      expect(text.value).toBe("hello");
      expect(text.value).toBe("hello");
      expect(text.loading).toBe(false);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should accept a function that returns a Promise", async () => {
      const factory = vi.fn(() => Promise.resolve(100));
      const asyncAtom = atom(factory);

      // Factory should not be called until accessed
      expect(factory).not.toHaveBeenCalled();

      // Access loading - triggers factory
      expect(asyncAtom.loading).toBe(true);
      expect(factory).toHaveBeenCalledTimes(1);

      // Wait for resolution
      const value = await asyncAtom;
      expect(value).toBe(100);
      expect(asyncAtom.value).toBe(100);
    });

    it("should handle factory that returns a rejected Promise", async () => {
      const error = new Error("Factory error");
      const factory = vi.fn(() => Promise.reject(error));
      const asyncAtom = atom(factory);

      // Trigger initialization
      expect(asyncAtom.loading).toBe(true);

      // Wait for rejection
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(asyncAtom.loading).toBe(false);
      expect(asyncAtom.error).toBe(error);
    });

    it("should handle factory that throws synchronously", () => {
      const error = new Error("Sync factory error");
      const factory = vi.fn(() => {
        throw error;
      });
      const errorAtom = atom(factory);

      // Access value - triggers factory which throws
      expect(errorAtom.error).toBe(error);
      expect(errorAtom.loading).toBe(false);
      expect(errorAtom.value).toBeUndefined();
    });

    it("should re-call factory on reset", () => {
      let callCount = 0;
      const factory = vi.fn(() => ++callCount);
      const count = atom(factory);

      expect(count.value).toBe(1);
      expect(factory).toHaveBeenCalledTimes(1);

      count.reset();

      // After reset, accessing value should call factory again
      expect(count.value).toBe(2);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should work with set() after lazy initialization", () => {
      const factory = vi.fn(() => 10);
      const count = atom(factory);

      expect(count.value).toBe(10);

      count.set(20);
      expect(count.value).toBe(20);

      count.set((prev) => prev + 5);
      expect(count.value).toBe(25);
    });

    it("should work with async factory and set()", async () => {
      let resolvePromise: (value: number) => void;
      const factory = vi.fn(
        () =>
          new Promise<number>((resolve) => {
            resolvePromise = resolve;
          })
      );
      const asyncAtom = atom(factory);

      // Trigger initialization
      expect(asyncAtom.loading).toBe(true);

      // Set directly while loading
      asyncAtom.set(99);
      expect(asyncAtom.loading).toBe(false);
      expect(asyncAtom.value).toBe(99);

      // Late resolution should be ignored
      resolvePromise!(10);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(asyncAtom.value).toBe(99);
    });

    it("should notify listeners when factory-created value changes", () => {
      const factory = vi.fn(() => 0);
      const count = atom(factory);
      const listener = vi.fn();

      // Subscribe before initialization
      count.on(listener);

      // Access value to initialize
      expect(count.value).toBe(0);

      // Change value
      count.set(5);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should handle factory returning object values", () => {
      const factory = vi.fn(() => ({ name: "John", age: 30 }));
      const user = atom(factory);

      expect(user.value).toEqual({ name: "John", age: 30 });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should handle factory returning null", () => {
      const factory = vi.fn(() => null);
      const nullable = atom<string | null>(factory);

      expect(nullable.value).toBe(null);
      expect(nullable.loading).toBe(false);
    });

    it("should handle factory returning undefined", () => {
      const factory = vi.fn(() => undefined);
      const undef = atom<string | undefined>(factory);

      expect(undef.value).toBeUndefined();
      expect(undef.loading).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle setting value before first access", () => {
      const count = atom(0);
      count.set(10);
      expect(count.value).toBe(10);
    });

    it("should handle multiple rapid updates", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      count.set(1);
      count.set(2);
      count.set(3);

      expect(count.value).toBe(3);
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("should handle boolean values", () => {
      const flag = atom(false);
      expect(flag.value).toBe(false);

      flag.set(true);
      expect(flag.value).toBe(true);
    });

    it("should handle string values", () => {
      const text = atom("hello");
      expect(text.value).toBe("hello");

      text.set("world");
      expect(text.value).toBe("world");
    });

    it("should handle function values via lazy initializer", () => {
      // To store a function as a value, wrap it in a lazy initializer
      const fnAtom = atom<() => number>(() => () => 42);
      expect(typeof fnAtom.value).toBe("function");
      expect(fnAtom.value!()).toBe(42);
    });
  });

  describe("fallback option", () => {
    it("should return fallback value during loading", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });

      const count = atom(promise, { fallback: 0 });

      // During loading, should return fallback
      expect(count.loading).toBe(true);
      expect(count.value).toBe(0);
      expect(count.stale()).toBe(true);

      // After resolving, should return actual value
      resolve!(42);
      await promise;
      await new Promise((r) => setTimeout(r, 0));

      expect(count.loading).toBe(false);
      expect(count.value).toBe(42);
      expect(count.stale()).toBe(false);
    });

    it("should return fallback value on error", async () => {
      let reject: (error: Error) => void;
      const promise = new Promise<number>((_, r) => {
        reject = r;
      });

      const count = atom(promise, { fallback: -1 });

      // During loading
      expect(count.loading).toBe(true);
      expect(count.value).toBe(-1);
      expect(count.stale()).toBe(true);

      // After rejection
      const error = new Error("Failed");
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(count.loading).toBe(false);
      expect(count.error).toBe(error);
      expect(count.value).toBe(-1); // Still returns fallback
      expect(count.stale()).toBe(true);
    });

    it("should return fallback after reset (reset clears lastResolvedValue)", async () => {
      let currentResolve: (value: number) => void;

      const count = atom(
        () =>
          new Promise<number>((r) => {
            currentResolve = r;
          }),
        { fallback: 0 }
      );

      // Initial access triggers lazy init
      expect(count.value).toBe(0);
      expect(count.loading).toBe(true);

      // Resolve
      currentResolve!(100);
      await new Promise((r) => setTimeout(r, 0));

      expect(count.value).toBe(100);
      expect(count.stale()).toBe(false);

      // Reset clears lastResolvedValue
      count.reset();

      // Access again - since lastResolvedValue is cleared by reset, should use fallback
      expect(count.loading).toBe(true);
      expect(count.value).toBe(0); // Fallback, not previous value
      expect(count.stale()).toBe(true);

      // Resolve new promise
      currentResolve!(200);
      await new Promise((r) => setTimeout(r, 0));

      expect(count.value).toBe(200);
      expect(count.stale()).toBe(false);
    });

    it("should work with lazy initializer and fallback", async () => {
      let resolve: (value: string) => void;
      let callCount = 0;

      const user = atom(
        () => {
          callCount++;
          return new Promise<string>((r) => {
            resolve = r;
          });
        },
        { fallback: "Guest" }
      );

      // First access triggers lazy init
      expect(user.value).toBe("Guest");
      expect(user.loading).toBe(true);
      expect(user.stale()).toBe(true);
      expect(callCount).toBe(1);

      // Resolve
      resolve!("John");
      await new Promise((r) => setTimeout(r, 0));

      expect(user.value).toBe("John");
      expect(user.stale()).toBe(false);
    });

    it("should work with sync value and fallback", () => {
      const count = atom(42, { fallback: 0 });

      // Sync value is immediately available
      expect(count.value).toBe(42);
      expect(count.loading).toBe(false);
      expect(count.stale()).toBe(false);
    });

    it("stale should return false for atoms without fallback", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });

      const count = atom(promise);

      // Without fallback, stale() always returns false
      expect(count.loading).toBe(true);
      expect(count.value).toBeUndefined();
      expect(count.stale()).toBe(false);

      resolve!(42);
      await promise;
      await new Promise((r) => setTimeout(r, 0));

      expect(count.value).toBe(42);
      expect(count.stale()).toBe(false);
    });

    it("should work with object fallback", async () => {
      interface User {
        id: number;
        name: string;
      }

      let resolve: (value: User) => void;
      const promise = new Promise<User>((r) => {
        resolve = r;
      });

      const user = atom(promise, { fallback: { id: 0, name: "Guest" } });

      expect(user.value).toEqual({ id: 0, name: "Guest" });
      expect(user.stale()).toBe(true);

      resolve!({ id: 1, name: "John" });
      await promise;
      await new Promise((r) => setTimeout(r, 0));

      expect(user.value).toEqual({ id: 1, name: "John" });
      expect(user.stale()).toBe(false);
    });

    it("should handle error then success scenario", async () => {
      let currentReject: (error: Error) => void;
      let currentResolve: (value: number) => void;
      let callCount = 0;

      const count = atom(
        () => {
          callCount++;
          if (callCount === 1) {
            return new Promise<number>((_, reject) => {
              currentReject = reject;
            });
          }
          return new Promise<number>((resolve) => {
            currentResolve = resolve;
          });
        },
        { fallback: 0 }
      );

      // First access - triggers first promise
      expect(count.value).toBe(0);
      expect(count.loading).toBe(true);

      // Reject first promise
      currentReject!(new Error("Failed"));
      await new Promise((r) => setTimeout(r, 0));

      expect(count.error).toBeDefined();
      expect(count.value).toBe(0); // Fallback (no previous value)
      expect(count.stale()).toBe(true);

      // Reset and try again
      count.reset();

      // Access triggers second promise
      expect(count.loading).toBe(true);
      expect(count.value).toBe(0); // Still fallback (lastResolvedValue was cleared)

      // Resolve second promise
      currentResolve!(100);
      await new Promise((r) => setTimeout(r, 0));

      expect(count.error).toBeUndefined();
      expect(count.value).toBe(100);
      expect(count.stale()).toBe(false);
    });

    it("should use fallback after reset even if previously had value", async () => {
      let currentReject: (error: Error) => void;
      let currentResolve: (value: number) => void;
      let callCount = 0;

      const count = atom(
        () => {
          callCount++;
          if (callCount === 1) {
            return new Promise<number>((resolve) => {
              currentResolve = resolve;
            });
          }
          return new Promise<number>((_, reject) => {
            currentReject = reject;
          });
        },
        { fallback: 0 }
      );

      // First access - triggers first promise
      expect(count.value).toBe(0);

      // Resolve first promise
      currentResolve!(100);
      await new Promise((r) => setTimeout(r, 0));

      expect(count.value).toBe(100);
      expect(count.stale()).toBe(false);

      // Reset clears lastResolvedValue
      count.reset();

      // Access triggers second promise
      expect(count.loading).toBe(true);
      // After reset, lastResolvedValue is cleared, so fallback is used
      expect(count.value).toBe(0);
      expect(count.stale()).toBe(true);

      // Reject second promise
      currentReject!(new Error("Failed"));
      await new Promise((r) => setTimeout(r, 0));

      // After error, still uses fallback (no lastResolvedValue)
      expect(count.error).toBeDefined();
      expect(count.value).toBe(0);
      expect(count.stale()).toBe(true);
    });
  });

  describe("dirty()", () => {
    it("should return false for newly created atom", () => {
      const count = atom(0);
      expect(count.dirty()).toBe(false);
    });

    it("should return true after set() is called", () => {
      const count = atom(0);
      expect(count.dirty()).toBe(false);

      count.set(5);
      expect(count.dirty()).toBe(true);
    });

    it("should return true after set() with reducer", () => {
      const count = atom(0);
      expect(count.dirty()).toBe(false);

      count.set((prev) => prev + 1);
      expect(count.dirty()).toBe(true);
    });

    it("should return false after reset()", () => {
      const count = atom(0);
      count.set(5);
      expect(count.dirty()).toBe(true);

      count.reset();
      expect(count.dirty()).toBe(false);
    });

    it("should return true even if set() with same value", () => {
      const count = atom(0);
      expect(count.dirty()).toBe(false);

      // Even setting same value marks as dirty
      count.set(0);
      expect(count.dirty()).toBe(true);
    });

    it("should work with async atoms", async () => {
      let resolve: (v: number) => void;
      const count = atom(
        new Promise<number>((r) => {
          resolve = r;
        })
      );

      expect(count.dirty()).toBe(false);

      resolve!(10);
      await count;

      // Initial resolution doesn't mark dirty
      expect(count.dirty()).toBe(false);

      // set() marks dirty
      count.set(20);
      expect(count.dirty()).toBe(true);
    });

    it("should track dirty separately from stale", () => {
      const count = atom(Promise.resolve(10), { fallback: 0 });

      // Initially: stale (loading), not dirty
      expect(count.stale()).toBe(true);
      expect(count.dirty()).toBe(false);
    });
  });
});
