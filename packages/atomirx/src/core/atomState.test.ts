import { describe, it, expect, vi } from "vitest";
import { atomState } from "./atomState";

describe("atomState", () => {
  describe("initial state", () => {
    it("should start with undefined value", () => {
      const state = atomState<number>();
      expect(state.getValue()).toBeUndefined();
    });

    it("should start with loading false", () => {
      const state = atomState<number>();
      expect(state.getLoading()).toBe(false);
    });

    it("should start with undefined error", () => {
      const state = atomState<number>();
      expect(state.getError()).toBeUndefined();
    });

    it("should start with version 0", () => {
      const state = atomState<number>();
      expect(state.getVersion()).toBe(0);
    });
  });

  describe("setValue", () => {
    it("should set the value", () => {
      const state = atomState<number>();
      state.setValue(42);
      expect(state.getValue()).toBe(42);
    });

    it("should clear loading state", () => {
      const state = atomState<number>();
      state.setLoading(Promise.resolve(1));
      expect(state.getLoading()).toBe(true);

      state.setValue(42);
      expect(state.getLoading()).toBe(false);
    });

    it("should clear error state", () => {
      const state = atomState<number>();
      state.setError(new Error("test"));
      expect(state.getError()).toBeDefined();

      state.setValue(42);
      expect(state.getError()).toBeUndefined();
    });

    it("should bump version", () => {
      const state = atomState<number>();
      const v1 = state.getVersion();
      state.setValue(42);
      expect(state.getVersion()).toBe(v1 + 1);
    });

    it("should notify listeners", () => {
      const state = atomState<number>();
      const listener = vi.fn();
      state.on(listener);

      state.setValue(42);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify if value is equal (strict equality)", () => {
      const state = atomState<number>();
      state.setValue(42);

      const listener = vi.fn();
      state.on(listener);

      state.setValue(42);
      expect(listener).not.toHaveBeenCalled();
    });

    it("should use custom equality function", () => {
      const state = atomState<{ id: number; name: string }>({
        equals: (a, b) => a?.id === b?.id,
      });
      state.setValue({ id: 1, name: "John" });

      const listener = vi.fn();
      state.on(listener);

      // Same id, different name - should not notify
      state.setValue({ id: 1, name: "Jane" });
      expect(listener).not.toHaveBeenCalled();

      // Different id - should notify
      state.setValue({ id: 2, name: "Jane" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should create a resolved promise", async () => {
      const state = atomState<number>();
      state.setValue(42);

      const value = await state.getPromise();
      expect(value).toBe(42);
    });
  });

  describe("setLoading", () => {
    it("should set loading to true", () => {
      const state = atomState<number>();
      state.setLoading(Promise.resolve(1));
      expect(state.getLoading()).toBe(true);
    });

    it("should clear value", () => {
      const state = atomState<number>();
      state.setValue(42);
      state.setLoading(Promise.resolve(1));
      expect(state.getValue()).toBeUndefined();
    });

    it("should clear error", () => {
      const state = atomState<number>();
      state.setError(new Error("test"));
      state.setLoading(Promise.resolve(1));
      expect(state.getError()).toBeUndefined();
    });

    it("should bump version", () => {
      const state = atomState<number>();
      const v1 = state.getVersion();
      state.setLoading(Promise.resolve(1));
      expect(state.getVersion()).toBe(v1 + 1);
    });

    it("should notify listeners", () => {
      const state = atomState<number>();
      const listener = vi.fn();
      state.on(listener);

      state.setLoading(Promise.resolve(1));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should store the promise", () => {
      const state = atomState<number>();
      const promise = Promise.resolve(42);
      state.setLoading(promise);
      expect(state.getPromise()).toBe(promise);
    });
  });

  describe("setError", () => {
    it("should set the error", () => {
      const state = atomState<number>();
      const error = new Error("test");
      state.setError(error);
      expect(state.getError()).toBe(error);
    });

    it("should set loading to false", () => {
      const state = atomState<number>();
      state.setLoading(Promise.resolve(1));
      state.setError(new Error("test"));
      expect(state.getLoading()).toBe(false);
    });

    it("should clear value", () => {
      const state = atomState<number>();
      state.setValue(42);
      state.setError(new Error("test"));
      expect(state.getValue()).toBeUndefined();
    });

    it("should bump version", () => {
      const state = atomState<number>();
      const v1 = state.getVersion();
      state.setError(new Error("test"));
      expect(state.getVersion()).toBe(v1 + 1);
    });

    it("should notify listeners", () => {
      const state = atomState<number>();
      const listener = vi.fn();
      state.on(listener);

      state.setError(new Error("test"));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify if same error", () => {
      const state = atomState<number>();
      const error = new Error("test");
      state.setError(error);

      const listener = vi.fn();
      state.on(listener);

      state.setError(error);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("race condition handling", () => {
    it("should detect stale versions", () => {
      const state = atomState<number>();
      const v1 = state.getVersion();

      state.setValue(1);
      expect(state.isVersionStale(v1)).toBe(true);
      expect(state.isVersionStale(state.getVersion())).toBe(false);
    });

    it("should ignore stale promise resolution", async () => {
      const state = atomState<number>();

      let resolve1: (value: number) => void;
      const promise1 = new Promise<number>((r) => {
        resolve1 = r;
      });

      state.setLoading(promise1);
      const v1 = state.getVersion();

      // Set a new value before promise resolves
      state.setValue(100);

      // Now resolve the old promise
      resolve1!(42);
      await new Promise((r) => setTimeout(r, 0));

      // Value should still be 100, not 42
      expect(state.getValue()).toBe(100);
      expect(state.isVersionStale(v1)).toBe(true);
    });
  });

  describe("subscriptions", () => {
    it("should return unsubscribe function", () => {
      const state = atomState<number>();
      const listener = vi.fn();

      const unsubscribe = state.on(listener);
      state.setValue(1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      state.setValue(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support multiple listeners", () => {
      const state = atomState<number>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state.on(listener1);
      state.on(listener2);

      state.setValue(1);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("should reset to initial state", () => {
      const state = atomState<number>();
      state.setValue(42);

      state.reset();

      expect(state.getValue()).toBeUndefined();
      expect(state.getLoading()).toBe(false);
      expect(state.getError()).toBeUndefined();
    });

    it("should bump version on reset", () => {
      const state = atomState<number>();
      state.setValue(42);
      const v1 = state.getVersion();

      state.reset();
      expect(state.getVersion()).toBe(v1 + 1);
    });

    it("should notify listeners on reset", () => {
      const state = atomState<number>();
      state.setValue(42);

      const listener = vi.fn();
      state.on(listener);

      state.reset();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify if already in initial state", () => {
      const state = atomState<number>();
      const listener = vi.fn();
      state.on(listener);

      state.reset();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("equals options", () => {
    it("should use shallow equality when specified", () => {
      const state = atomState<{ a: number }>({ equals: "shallow" });
      state.setValue({ a: 1 });

      const listener = vi.fn();
      state.on(listener);

      // Same content - no notification
      state.setValue({ a: 1 });
      expect(listener).not.toHaveBeenCalled();

      // Different content - should notify
      state.setValue({ a: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should use deep equality when specified", () => {
      const state = atomState<{ nested: { value: number } }>({
        equals: "deep",
      });
      state.setValue({ nested: { value: 1 } });

      const listener = vi.fn();
      state.on(listener);

      // Same deep content - no notification
      state.setValue({ nested: { value: 1 } });
      expect(listener).not.toHaveBeenCalled();

      // Different deep content - should notify
      state.setValue({ nested: { value: 2 } });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
