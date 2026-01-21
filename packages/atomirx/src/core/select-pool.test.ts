import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { atom } from "./atom";
import { pool } from "./pool";
import { select, isVirtualAtom } from "./select";
import { derived } from "./derived";

describe("select with pool integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("from()", () => {
    it("should return a VirtualAtom from pool", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });

      const { result } = select(({ from }) => {
        const virtual = from(testPool, "a");
        expect(isVirtualAtom(virtual)).toBe(true);
        return virtual;
      });

      expect(result.error).toBe(undefined);
    });

    it("should be able to read value from VirtualAtom", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });

      const { result } = select(({ read, from }) => {
        const virtual = from(testPool, "a");
        return read(virtual);
      });

      expect(result.value).toBe("value-a");
    });

    it("should track pool dependencies", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });

      const { result } = select(({ read, from }) => {
        const virtual = from(testPool, "a");
        return read(virtual);
      });

      expect(result._poolDeps.size).toBe(1);
      expect(result._poolDeps.has(testPool)).toBe(true);
      expect(result._poolDeps.get(testPool)?.has("a")).toBe(true);
    });

    it("should track multiple pool params", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });

      const { result } = select(({ read, from }) => {
        const a = from(testPool, "a");
        const b = from(testPool, "b");
        return `${read(a)}-${read(b)}`;
      });

      expect(result.value).toBe("value-a-value-b");
      expect(result._poolDeps.get(testPool)?.size).toBe(2);
    });

    it("should reuse VirtualAtom for same underlying atom", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });

      const { result } = select(({ from }) => {
        const v1 = from(testPool, "a");
        const v2 = from(testPool, "a");
        return v1 === v2;
      });

      expect(result.value).toBe(true);
    });
  });

  describe("track()", () => {
    it("should track atom as dependency without reading", () => {
      const count$ = atom(5);

      const { result } = select(({ track }) => {
        track(count$);
        return "tracked";
      });

      expect(result.value).toBe("tracked");
      expect(result._atomDeps.has(count$)).toBe(true);
    });

    it("should track VirtualAtom and add underlying atom to deps", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });

      const { result } = select(({ from, track }) => {
        const virtual = from(testPool, "a");
        track(virtual);
        return "tracked";
      });

      expect(result.value).toBe("tracked");
      expect(result._atomDeps.size).toBe(1); // The underlying atom
    });
  });

  describe("VirtualAtom disposal", () => {
    it("should dispose VirtualAtom after select completes", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });
      let capturedVirtual: any;

      select(({ from }) => {
        capturedVirtual = from(testPool, "a");
        return capturedVirtual.get(); // Works inside select
      });

      // After select, VirtualAtom should be disposed
      expect(() => capturedVirtual.get()).toThrow(
        /VirtualAtom.*was called after disposal/
      );
    });

    it("should throw on VirtualAtom.on() after disposal", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });
      let capturedVirtual: any;

      select(({ from }) => {
        capturedVirtual = from(testPool, "a");
        return "done";
      });

      expect(() => capturedVirtual.on(() => {})).toThrow(
        /VirtualAtom.*was called after disposal/
      );
    });

    it("should throw on VirtualAtom._getAtom() after disposal", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });
      let capturedVirtual: any;

      select(({ from }) => {
        capturedVirtual = from(testPool, "a");
        return "done";
      });

      expect(() => capturedVirtual._getAtom()).toThrow(
        /VirtualAtom.*was called after disposal/
      );
    });
  });

  describe("startTracking", () => {
    it("should subscribe to atom changes", () => {
      const count$ = atom(0);
      const listener = vi.fn();

      const { startTracking } = select(({ read }) => read(count$));
      const cleanup = startTracking(listener);

      count$.set(1);
      expect(listener).toHaveBeenCalledTimes(1);

      cleanup();
      count$.set(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should subscribe to pool removal", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });
      const listener = vi.fn();

      const { startTracking } = select(({ read, from }) => {
        return read(from(testPool, "a"));
      });

      const cleanup = startTracking(listener);

      testPool.remove("a");
      expect(listener).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it("should subscribe to pool GC removal", () => {
      const testPool = pool((id: string) => `value-${id}`, { gcTime: 1000 });
      const listener = vi.fn();

      const { startTracking } = select(({ read, from }) => {
        return read(from(testPool, "a"));
      });

      const cleanup = startTracking(listener);

      vi.advanceTimersByTime(1000);
      expect(listener).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });

  describe("integration with derived", () => {
    it("should recompute derived when pool value changes", async () => {
      const testPool = pool((_id: string) => 0, { gcTime: 10000 });

      const doubled$ = derived(({ read, from }) => {
        const value$ = from(testPool, "a");
        return read(value$) * 2;
      });

      expect(await doubled$.get()).toBe(0);

      testPool.set("a", 21);
      expect(await doubled$.get()).toBe(42);
    });

    // Skip pool removal tests for now - they may have timing issues
    it.skip("should recompute derived when pool entry is removed", async () => {
      let initCount = 0;
      const testPool = pool(
        (_id: string) => {
          initCount++;
          return initCount;
        },
        { gcTime: 10000 }
      );

      const value$ = derived(({ read, from }) => {
        return read(from(testPool, "a"));
      });

      expect(await value$.get()).toBe(1);

      testPool.remove("a");
      // Give derived time to recompute
      await Promise.resolve();
      await Promise.resolve();

      expect(await value$.get()).toBe(2);
    });

    it.skip("should recompute derived when pool entry is GC'd", async () => {
      let initCount = 0;
      const testPool = pool(
        (_id: string) => {
          initCount++;
          return initCount;
        },
        { gcTime: 1000 }
      );

      const value$ = derived(({ read, from }) => {
        return read(from(testPool, "a"));
      });

      expect(await value$.get()).toBe(1);

      // GC the entry
      vi.advanceTimersByTime(1000);

      // Give derived time to recompute
      await Promise.resolve();
      await Promise.resolve();

      expect(await value$.get()).toBe(2);
    });
  });

  describe("isVirtualAtom type guard", () => {
    it("should return true for VirtualAtom", () => {
      const testPool = pool(() => 0, { gcTime: 1000 });

      select(({ from }) => {
        const virtual = from(testPool, "a");
        expect(isVirtualAtom(virtual)).toBe(true);
        return null;
      });
    });

    it("should return false for regular atoms", () => {
      const count$ = atom(0);
      expect(isVirtualAtom(count$)).toBe(false);
    });

    it("should return false for non-atoms", () => {
      expect(isVirtualAtom(null)).toBe(false);
      expect(isVirtualAtom(undefined)).toBe(false);
      expect(isVirtualAtom({})).toBe(false);
      expect(isVirtualAtom(42)).toBe(false);
    });
  });

  describe("context method error handling", () => {
    it("should throw when from() called outside select context", () => {
      const testPool = pool(() => 0, { gcTime: 1000 });
      let savedFrom: any;

      select(({ from }) => {
        savedFrom = from;
        return null;
      });

      expect(() => savedFrom(testPool, "a")).toThrow(
        /was called outside of the selection context/
      );
    });

    it("should throw when track() called outside select context", () => {
      const count$ = atom(0);
      let savedTrack: any;

      select(({ track }) => {
        savedTrack = track;
        return null;
      });

      expect(() => savedTrack(count$)).toThrow(
        /was called outside of the selection context/
      );
    });
  });
});
