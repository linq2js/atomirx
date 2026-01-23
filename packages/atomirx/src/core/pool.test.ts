import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pool, isPool } from "./pool";
import { SYMBOL_POOL } from "./types";

describe("pool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("basic functionality", () => {
    it("should create a pool with SYMBOL_POOL marker", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      expect(testPool[SYMBOL_POOL]).toBe(true);
    });

    it("should get value for params", () => {
      const testPool = pool((params: { id: string }) => `value-${params.id}`, {
        gcTime: 1000,
      });
      expect(testPool.get({ id: "a" })).toBe("value-a");
      expect(testPool.get({ id: "b" })).toBe("value-b");
    });

    it("should return same value on subsequent gets", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string }) => {
          callCount++;
          return `value-${params.id}-${callCount}`;
        },
        { gcTime: 1000 }
      );

      const first = testPool.get({ id: "a" });
      const second = testPool.get({ id: "a" });
      expect(first).toBe(second);
      expect(callCount).toBe(1);
    });

    it("should set value for params", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" }); // Create entry
      testPool.set({ id: "a" }, 42);
      expect(testPool.get({ id: "a" })).toBe(42);
    });

    it("should set value with reducer function", () => {
      const testPool = pool((_: { id: string }) => 10, { gcTime: 1000 });
      testPool.get({ id: "a" }); // Create entry
      testPool.set({ id: "a" }, (prev) => prev * 2);
      expect(testPool.get({ id: "a" })).toBe(20);
    });

    it("should check if entry exists with has()", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      expect(testPool.has({ id: "a" })).toBe(false);
      testPool.get({ id: "a" });
      expect(testPool.has({ id: "a" })).toBe(true);
    });
  });

  describe("remove and clear", () => {
    it("should remove entry with remove()", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" });
      expect(testPool.has({ id: "a" })).toBe(true);
      testPool.remove({ id: "a" });
      expect(testPool.has({ id: "a" })).toBe(false);
    });

    it("should clear all entries with clear()", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" });
      testPool.get({ id: "b" });
      testPool.get({ id: "c" });
      expect(testPool.has({ id: "a" })).toBe(true);
      expect(testPool.has({ id: "b" })).toBe(true);
      expect(testPool.has({ id: "c" })).toBe(true);

      testPool.clear();
      expect(testPool.has({ id: "a" })).toBe(false);
      expect(testPool.has({ id: "b" })).toBe(false);
      expect(testPool.has({ id: "c" })).toBe(false);
    });

    it("should recreate entry after removal", () => {
      let callCount = 0;
      const testPool = pool(
        (_: { id: string }) => {
          callCount++;
          return callCount;
        },
        { gcTime: 1000 }
      );

      expect(testPool.get({ id: "a" })).toBe(1);
      testPool.remove({ id: "a" });
      expect(testPool.get({ id: "a" })).toBe(2);
    });
  });

  describe("forEach iteration", () => {
    it("should iterate over all entries", () => {
      const testPool = pool((params: { id: string }) => `value-${params.id}`, {
        gcTime: 1000,
      });
      testPool.get({ id: "a" });
      testPool.get({ id: "b" });
      testPool.get({ id: "c" });

      const entries: Array<{ value: string; params: { id: string } }> = [];
      testPool.forEach((value, params) => {
        entries.push({ value, params });
      });

      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual({ value: "value-a", params: { id: "a" } });
      expect(entries).toContainEqual({ value: "value-b", params: { id: "b" } });
      expect(entries).toContainEqual({ value: "value-c", params: { id: "c" } });
    });
  });

  describe("event subscriptions", () => {
    it("should emit create event when entry is created", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const listener = vi.fn();
      testPool.on(listener);

      testPool.get({ id: "a" });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: "create",
        params: { id: "a" },
        value: 0,
      });
    });

    it("should emit change event when value changes", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const listener = vi.fn();

      testPool.get({ id: "a" }); // create
      testPool.on(listener);
      testPool.set({ id: "a" }, 42);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: "change",
        params: { id: "a" },
        value: 42,
      });
    });

    it("should emit remove event when entry is removed", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const listener = vi.fn();
      testPool.on(listener);

      testPool.get({ id: "a" });
      testPool.set({ id: "a" }, 42);
      testPool.remove({ id: "a" });

      expect(listener).toHaveBeenCalledTimes(3); // create, change, remove
      expect(listener).toHaveBeenLastCalledWith({
        type: "remove",
        params: { id: "a" },
        value: 42,
      });
    });

    it("should allow unsubscribing", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const listener = vi.fn();

      testPool.get({ id: "a" }); // create entry first
      const unsub = testPool.on(listener);

      testPool.set({ id: "a" }, 1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      testPool.set({ id: "a" }, 2);
      expect(listener).toHaveBeenCalledTimes(1); // no new calls
    });

    it("should allow filtering by event type", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const removeEvents: unknown[] = [];
      testPool.on((event) => {
        if (event.type === "remove") {
          removeEvents.push(event);
        }
      });

      testPool.get({ id: "a" });
      testPool.get({ id: "b" });
      testPool.remove({ id: "a" });
      testPool.remove({ id: "b" });

      expect(removeEvents).toHaveLength(2);
    });
  });

  describe("GC timer", () => {
    it("should remove entry after gcTime", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" });
      expect(testPool.has({ id: "a" })).toBe(true);

      vi.advanceTimersByTime(999);
      expect(testPool.has({ id: "a" })).toBe(true);

      vi.advanceTimersByTime(1);
      expect(testPool.has({ id: "a" })).toBe(false);
    });

    it("should reset GC timer on access", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" });

      vi.advanceTimersByTime(500);
      testPool.get({ id: "a" }); // Reset timer

      vi.advanceTimersByTime(500);
      expect(testPool.has({ id: "a" })).toBe(true);

      vi.advanceTimersByTime(500);
      expect(testPool.has({ id: "a" })).toBe(false);
    });

    it("should reset GC timer on set", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" });

      vi.advanceTimersByTime(500);
      testPool.set({ id: "a" }, 42); // Reset timer via set

      vi.advanceTimersByTime(500);
      expect(testPool.has({ id: "a" })).toBe(true);

      vi.advanceTimersByTime(500);
      expect(testPool.has({ id: "a" })).toBe(false);
    });

    it("should reset GC timer on value change via atom subscription", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      testPool.get({ id: "a" });

      vi.advanceTimersByTime(500);
      testPool.set({ id: "a" }, 42); // Value change resets timer

      vi.advanceTimersByTime(999);
      expect(testPool.has({ id: "a" })).toBe(true);

      vi.advanceTimersByTime(1);
      expect(testPool.has({ id: "a" })).toBe(false);
    });

    it("should emit remove event when GC removes entry", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const removeEvents: unknown[] = [];
      testPool.on((event) => {
        if (event.type === "remove") {
          removeEvents.push(event);
        }
      });

      testPool.get({ id: "a" });
      vi.advanceTimersByTime(1000);

      expect(removeEvents).toHaveLength(1);
      expect(removeEvents[0]).toEqual({
        type: "remove",
        params: { id: "a" },
        value: 0,
      });
    });
  });

  describe("promise-aware GC", () => {
    it("should not GC while promise is pending", async () => {
      let resolvePromise: (value: string) => void;
      const testPool = pool(
        (_: { id: string }) =>
          new Promise<string>((resolve) => {
            resolvePromise = resolve;
          }),
        { gcTime: 1000 }
      );

      testPool.get({ id: "a" });

      // Advance past GC time
      vi.advanceTimersByTime(2000);
      expect(testPool.has({ id: "a" })).toBe(true); // Still exists because promise pending

      // Resolve promise
      resolvePromise!("resolved");
      await Promise.resolve(); // Let promise handlers run

      // Now GC timer should start
      vi.advanceTimersByTime(999);
      expect(testPool.has({ id: "a" })).toBe(true);

      vi.advanceTimersByTime(1);
      expect(testPool.has({ id: "a" })).toBe(false);
    });
  });

  describe("params equality (shallow by default)", () => {
    it("should treat equivalent objects as same entry", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string }) => {
          callCount++;
          return params.id;
        },
        { gcTime: 1000 }
      );

      testPool.get({ id: "test" });
      testPool.get({ id: "test" }); // Same object shape
      expect(callCount).toBe(1);
    });

    it("should treat objects with different property order as same entry (shallow equality)", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { a: number; b: number }) => {
          callCount++;
          return params.a + params.b;
        },
        { gcTime: 1000 }
      );

      // Different property order but same values
      testPool.get({ a: 1, b: 2 });
      testPool.get({ b: 2, a: 1 }); // Should be same entry with shallow equality
      expect(callCount).toBe(1);
    });

    it("should handle multi-key object params", () => {
      const testPool = pool(
        (params: { a: number; b: number }) => params.a + params.b,
        { gcTime: 1000 }
      );
      expect(testPool.get({ a: 1, b: 2 })).toBe(3);
      expect(testPool.get({ a: 3, b: 4 })).toBe(7);
    });

    it("should treat objects with different values as different entries", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string }) => {
          callCount++;
          return params.id;
        },
        { gcTime: 1000 }
      );

      testPool.get({ id: "a" });
      testPool.get({ id: "b" }); // Different value, different entry
      expect(callCount).toBe(2);
    });
  });

  describe("internal _getAtom", () => {
    it("should return the underlying atom", () => {
      const testPool = pool((_: { id: string }) => 42, { gcTime: 1000 });
      testPool.get({ id: "a" });

      const atom = testPool._getAtom({ id: "a" });
      expect(atom.get()).toBe(42);
    });

    it("should create entry if not exists", () => {
      const testPool = pool((_: { id: string }) => 42, { gcTime: 1000 });
      expect(testPool.has({ id: "a" })).toBe(false);

      const atom = testPool._getAtom({ id: "a" });
      expect(testPool.has({ id: "a" })).toBe(true);
      expect(atom.get()).toBe(42);
    });
  });

  describe("internal _onRemove", () => {
    it("should notify specific entry removal listener", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      testPool.get({ id: "a" });
      testPool.get({ id: "b" });

      testPool._onRemove({ id: "a" }, listenerA);
      testPool._onRemove({ id: "b" }, listenerB);

      testPool.remove({ id: "a" });
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).not.toHaveBeenCalled();

      testPool.remove({ id: "b" });
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it("should allow unsubscribing from specific entry removal", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      const listener = vi.fn();

      testPool.get({ id: "a" });
      const unsub = testPool._onRemove({ id: "a" }, listener);

      unsub();
      testPool.remove({ id: "a" });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("atom disposal on remove", () => {
    it("should abort signal when entry is removed", () => {
      let capturedSignal: AbortSignal | null = null;

      const testPool = pool(
        (_: { id: string }, context) => {
          capturedSignal = context.signal;
          return 0;
        },
        { gcTime: 1000 }
      );

      testPool.get({ id: "a" });
      expect(capturedSignal).not.toBeNull();
      expect(capturedSignal!.aborted).toBe(false);

      testPool.remove({ id: "a" });
      expect(capturedSignal!.aborted).toBe(true);
    });

    it("should call onCleanup when entry is removed", () => {
      const cleanup = vi.fn();

      const testPool = pool(
        (_: { id: string }, context) => {
          context.onCleanup(cleanup);
          return 0;
        },
        { gcTime: 1000 }
      );

      testPool.get({ id: "a" });
      expect(cleanup).not.toHaveBeenCalled();

      testPool.remove({ id: "a" });
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("should abort signal when entry is GC'd", () => {
      let capturedSignal: AbortSignal | null = null;

      const testPool = pool(
        (_: { id: string }, context) => {
          capturedSignal = context.signal;
          return 0;
        },
        { gcTime: 1000 }
      );

      testPool.get({ id: "a" });
      expect(capturedSignal!.aborted).toBe(false);

      // Advance time to trigger GC
      vi.advanceTimersByTime(1001);
      expect(capturedSignal!.aborted).toBe(true);
    });
  });

  describe("isPool type guard", () => {
    it("should return true for pool instances", () => {
      const testPool = pool((_: { id: string }) => 0, { gcTime: 1000 });
      expect(isPool(testPool)).toBe(true);
    });

    it("should return false for non-pool values", () => {
      expect(isPool(null)).toBe(false);
      expect(isPool(undefined)).toBe(false);
      expect(isPool({})).toBe(false);
      expect(isPool({ [SYMBOL_POOL]: false })).toBe(false);
      expect(isPool("pool")).toBe(false);
      expect(isPool(42)).toBe(false);
    });
  });

  describe("equals option (params comparison)", () => {
    it("should use shallow equality by default for params", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { a: number; b: number }) => {
          callCount++;
          return params.a + params.b;
        },
        { gcTime: 1000 }
      );

      // Different property order but same values - should be same entry
      testPool.get({ a: 1, b: 2 });
      testPool.get({ b: 2, a: 1 });
      expect(callCount).toBe(1);
    });

    it("should use strict equality when equals is 'strict'", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { a: number; b: number }) => {
          callCount++;
          return params.a + params.b;
        },
        { gcTime: 1000, equals: "strict" }
      );

      // With strict equality, different object references = different entries
      testPool.get({ a: 1, b: 2 });
      testPool.get({ a: 1, b: 2 }); // Different object, different entry
      expect(callCount).toBe(2);
    });

    it("should use custom equality function for params", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string; timestamp: number }) => {
          callCount++;
          return params.id;
        },
        {
          gcTime: 1000,
          // Only compare by id, ignore timestamp
          equals: (a, b) => a.id === b.id,
        }
      );

      testPool.get({ id: "user-1", timestamp: 100 });
      testPool.get({ id: "user-1", timestamp: 200 }); // Same id, different timestamp
      expect(callCount).toBe(1); // Same entry because ids match
    });

    it("should use deep equality when equals is 'deep'", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { nested: { value: number } }) => {
          callCount++;
          return params.nested.value;
        },
        { gcTime: 1000, equals: "deep" }
      );

      testPool.get({ nested: { value: 1 } });
      testPool.get({ nested: { value: 1 } }); // Deep equal
      expect(callCount).toBe(1);
    });
  });

  describe("reference cache optimization", () => {
    it("should use cached entry for same object reference", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string }) => {
          callCount++;
          return params.id;
        },
        { gcTime: 1000 }
      );

      const params = { id: "test" };

      // First call - creates entry
      testPool.get(params);
      expect(callCount).toBe(1);

      // Same reference - should use cache, no equality check needed
      testPool.get(params);
      testPool.get(params);
      testPool.get(params);
      expect(callCount).toBe(1); // Still 1, entry reused
    });

    it("should invalidate cache when entry is removed", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string }) => {
          callCount++;
          return params.id;
        },
        { gcTime: 1000 }
      );

      const params = { id: "test" };

      testPool.get(params);
      expect(callCount).toBe(1);

      // Remove entry
      testPool.remove(params);

      // Same reference but entry was removed - should create new
      testPool.get(params);
      expect(callCount).toBe(2);
    });

    it("should work with different references that are equal", () => {
      let callCount = 0;
      const testPool = pool(
        (params: { id: string }) => {
          callCount++;
          return params.id;
        },
        { gcTime: 1000 }
      );

      const params1 = { id: "test" };
      const params2 = { id: "test" }; // Different reference, same value

      testPool.get(params1);
      expect(callCount).toBe(1);

      // Different reference but same value (shallow equal) - should reuse entry
      testPool.get(params2);
      expect(callCount).toBe(1);

      // Now params2 should also be cached
      testPool.get(params2);
      expect(callCount).toBe(1);
    });

    it("should handle primitive params (no cache, equality only)", () => {
      let callCount = 0;
      const testPool = pool(
        (id: string) => {
          callCount++;
          return id;
        },
        { gcTime: 1000 }
      );

      testPool.get("user-1");
      expect(callCount).toBe(1);

      // Same primitive - uses equality comparison
      testPool.get("user-1");
      expect(callCount).toBe(1);
    });
  });
});
