import { describe, it, expect } from "vitest";
import {
  trackPromise,
  getPromiseState,
  isTracked,
  isPending,
  isFulfilled,
  isRejected,
  unwrap,
  isDerived,
} from "./promiseCache";
import { getAtomState } from "./getAtomState";
import { atom } from "./atom";
import { derived } from "./derived";

describe("promiseCache", () => {
  describe("trackPromise", () => {
    it("should return pending state for unresolved promise", () => {
      const promise = new Promise<number>(() => {});
      const state = trackPromise(promise);
      expect(state.status).toBe("pending");
      expect((state as { promise: PromiseLike<number> }).promise).toBe(promise);
    });

    it("should return fulfilled state after promise resolves", async () => {
      const promise = Promise.resolve(42);
      await promise;
      trackPromise(promise); // Start tracking
      // May still be pending if checked immediately, wait a tick
      await new Promise((r) => setTimeout(r, 0));
      const state = trackPromise(promise);
      expect(state.status).toBe("fulfilled");
      expect((state as { value: number }).value).toBe(42);
    });

    it("should return rejected state after promise rejects", async () => {
      const error = new Error("Test error");
      const promise = Promise.reject(error);
      promise.catch(() => {}); // Prevent unhandled rejection
      trackPromise(promise); // Start tracking
      await Promise.resolve();
      await Promise.resolve();
      const state = trackPromise(promise);
      expect(state.status).toBe("rejected");
      expect((state as { error: unknown }).error).toBe(error);
    });

    it("should return same state for same promise", () => {
      const promise = new Promise<number>(() => {});
      const state1 = trackPromise(promise);
      const state2 = trackPromise(promise);
      expect(state1).toBe(state2);
    });
  });

  describe("getPromiseState", () => {
    it("should return undefined for untracked promise", () => {
      const promise = new Promise<number>(() => {});
      expect(getPromiseState(promise)).toBe(undefined);
    });

    it("should return state for tracked promise", () => {
      const promise = new Promise<number>(() => {});
      trackPromise(promise);
      expect(getPromiseState(promise)).toBeDefined();
    });
  });

  describe("isTracked", () => {
    it("should return false for untracked promise", () => {
      const promise = new Promise<number>(() => {});
      expect(isTracked(promise)).toBe(false);
    });

    it("should return true for tracked promise", () => {
      const promise = new Promise<number>(() => {});
      trackPromise(promise);
      expect(isTracked(promise)).toBe(true);
    });
  });

  describe("isPending", () => {
    it("should return false for non-promise", () => {
      expect(isPending(42)).toBe(false);
      expect(isPending("hello")).toBe(false);
      expect(isPending(null)).toBe(false);
    });

    it("should return true for pending promise", () => {
      const promise = new Promise<number>(() => {});
      expect(isPending(promise)).toBe(true);
    });

    it("should return false for fulfilled promise", async () => {
      const promise = Promise.resolve(42);
      trackPromise(promise); // Start tracking
      await Promise.resolve();
      await Promise.resolve();
      expect(isPending(promise)).toBe(false);
    });
  });

  describe("isFulfilled", () => {
    it("should return false for non-promise", () => {
      expect(isFulfilled(42)).toBe(false);
    });

    it("should return true for fulfilled promise", async () => {
      const promise = Promise.resolve(42);
      trackPromise(promise);
      await Promise.resolve();
      await Promise.resolve();
      expect(isFulfilled(promise)).toBe(true);
    });

    it("should return false for pending promise", () => {
      const promise = new Promise<number>(() => {});
      expect(isFulfilled(promise)).toBe(false);
    });
  });

  describe("isRejected", () => {
    it("should return false for non-promise", () => {
      expect(isRejected(42)).toBe(false);
    });

    it("should return true for rejected promise", async () => {
      const promise = Promise.reject(new Error("test"));
      promise.catch(() => {});
      trackPromise(promise);
      await Promise.resolve();
      await Promise.resolve();
      expect(isRejected(promise)).toBe(true);
    });

    it("should return false for fulfilled promise", async () => {
      const promise = Promise.resolve(42);
      trackPromise(promise);
      await Promise.resolve();
      await Promise.resolve();
      expect(isRejected(promise)).toBe(false);
    });
  });

  describe("unwrap", () => {
    it("should return value for non-promise", () => {
      expect(unwrap(42)).toBe(42);
      expect(unwrap("hello")).toBe("hello");
      expect(unwrap(null)).toBe(null);
    });

    it("should return value for fulfilled promise", async () => {
      const promise = Promise.resolve(42);
      trackPromise(promise);
      await Promise.resolve();
      await Promise.resolve();
      expect(unwrap(promise)).toBe(42);
    });

    it("should throw promise for pending promise", () => {
      const promise = new Promise<number>(() => {});
      let thrown: unknown;
      try {
        unwrap(promise);
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBe(promise);
    });

    it("should throw error for rejected promise", async () => {
      const error = new Error("Test error");
      const promise = Promise.reject(error);
      promise.catch(() => {});
      trackPromise(promise);
      await Promise.resolve();
      await Promise.resolve();
      expect(() => unwrap(promise)).toThrow(error);
    });
  });

  describe("isDerived", () => {
    it("should return false for mutable atom", () => {
      const a$ = atom(0);
      expect(isDerived(a$)).toBe(false);
    });

    it("should return true for derived atom", () => {
      const a$ = atom(0);
      const d$ = derived(({ get }) => get(a$) * 2);
      expect(isDerived(d$)).toBe(true);
    });

    it("should return false for non-atom values", () => {
      expect(isDerived(null)).toBe(false);
      expect(isDerived(undefined)).toBe(false);
      expect(isDerived(42)).toBe(false);
      expect(isDerived({})).toBe(false);
    });
  });

  describe("getAtomState", () => {
    it("should return ready state for sync mutable atom", () => {
      const a$ = atom(42);
      const state = getAtomState(a$);
      expect(state.status).toBe("ready");
      expect((state as { value: number }).value).toBe(42);
    });

    it("should return loading state for atom with pending Promise", () => {
      const promise = new Promise<number>(() => {});
      const a$ = atom(promise);
      const state = getAtomState(a$);
      expect(state.status).toBe("loading");
    });

    it("should return ready state for atom with resolved Promise", async () => {
      const promise = Promise.resolve(42);
      const a$ = atom(promise);
      trackPromise(promise);
      await Promise.resolve();
      await Promise.resolve();
      const state = getAtomState(a$);
      expect(state.status).toBe("ready");
      expect((state as { value: number }).value).toBe(42);
    });

    it("should return loading state for derived with fallback during loading", async () => {
      const asyncValue$ = atom(new Promise<number>(() => {}));
      const derived$ = derived(({ get }) => get(asyncValue$), { fallback: 0 });

      // Derived atoms return their state directly via state()
      // State is loading, but staleValue provides the fallback
      const state = getAtomState(derived$);
      expect(state.status).toBe("loading");
      expect(derived$.staleValue).toBe(0);
    });
  });
});
