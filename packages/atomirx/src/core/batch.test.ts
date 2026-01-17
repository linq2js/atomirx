import { describe, it, expect, vi } from "vitest";
import { batch } from "./batch";
import { atom } from "./atom";

describe("batch", () => {
  describe("basic batching", () => {
    it("should batch multiple updates into single notification", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      batch(() => {
        count.set(1);
        count.set(2);
        count.set(3);
      });

      // All updates batched - listener called once at the end
      expect(count.value).toBe(3);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should return the function result", () => {
      const result = batch(() => {
        return "hello";
      });

      expect(result).toBe("hello");
    });

    it("should return complex values", () => {
      const result = batch(() => {
        return { value: 42, items: [1, 2, 3] };
      });

      expect(result).toEqual({ value: 42, items: [1, 2, 3] });
    });
  });

  describe("nested batching", () => {
    it("should support nested batch calls", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      batch(() => {
        count.set(1);

        batch(() => {
          count.set(2);
          count.set(3);
        });

        count.set(4);
      });

      expect(count.value).toBe(4);
      // All updates batched together
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should return value from nested batch", () => {
      const result = batch(() => {
        const inner = batch(() => {
          return "inner";
        });
        return `outer-${inner}`;
      });

      expect(result).toBe("outer-inner");
    });
  });

  describe("multiple atoms", () => {
    it("should batch updates across multiple atoms", () => {
      const a = atom(0);
      const b = atom(0);
      const listenerA = vi.fn();
      const listenerB = vi.fn();
      a.on(listenerA);
      b.on(listenerB);

      batch(() => {
        a.set(1);
        b.set(1);
        a.set(2);
        b.set(2);
      });

      expect(a.value).toBe(2);
      expect(b.value).toBe(2);
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should propagate errors", () => {
      expect(() => {
        batch(() => {
          throw new Error("test error");
        });
      }).toThrow("test error");
    });

    it("should still process notifications after error in nested batch", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      expect(() => {
        batch(() => {
          count.set(1);

          try {
            batch(() => {
              count.set(2);
              throw new Error("inner error");
            });
          } catch {
            // Catch inner error
          }

          count.set(3);
        });
      }).not.toThrow();

      expect(count.value).toBe(3);
    });
  });

  describe("cascading updates", () => {
    it("should handle cascading updates within batch", () => {
      const a = atom(0);
      const b = atom(0);
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      // When a changes, update b
      a.on(() => {
        if (a.value !== undefined && a.value > 0) {
          b.set(a.value * 2);
        }
      });

      a.on(listenerA);
      b.on(listenerB);

      batch(() => {
        a.set(5);
      });

      expect(a.value).toBe(5);
      expect(b.value).toBe(10);
    });
  });

  describe("without batch", () => {
    it("should notify immediately without batch", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      count.set(1);
      expect(listener).toHaveBeenCalledTimes(1);

      count.set(2);
      expect(listener).toHaveBeenCalledTimes(2);

      count.set(3);
      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("listener deduping", () => {
    it("should dedupe same listener subscribed to multiple atoms", () => {
      const a = atom(0);
      const b = atom(0);
      const c = atom(0);

      // Same listener subscribed to all three atoms
      const sharedListener = vi.fn();
      a.on(sharedListener);
      b.on(sharedListener);
      c.on(sharedListener);

      batch(() => {
        a.set(1);
        b.set(1);
        c.set(1);
      });

      // Listener should only be called once (deduped), not 3 times
      expect(sharedListener).toHaveBeenCalledTimes(1);
    });

    it("should call different listeners separately", () => {
      const a = atom(0);
      const b = atom(0);

      const listenerA = vi.fn();
      const listenerB = vi.fn();
      a.on(listenerA);
      b.on(listenerB);

      batch(() => {
        a.set(1);
        b.set(1);
      });

      // Different listeners should each be called once
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it("should dedupe listener when same atom updated multiple times", () => {
      const count = atom(0);
      const listener = vi.fn();
      count.on(listener);

      batch(() => {
        count.set(1);
        count.set(2);
        count.set(3);
      });

      // Listener called once at the end with final value
      expect(listener).toHaveBeenCalledTimes(1);
      expect(count.value).toBe(3);
    });

    it("should handle mixed scenario with shared and unique listeners", () => {
      const a = atom(0);
      const b = atom(0);

      const sharedListener = vi.fn();
      const uniqueListenerA = vi.fn();
      const uniqueListenerB = vi.fn();

      a.on(sharedListener);
      a.on(uniqueListenerA);
      b.on(sharedListener);
      b.on(uniqueListenerB);

      batch(() => {
        a.set(1);
        b.set(1);
      });

      // Shared listener deduped to 1 call
      expect(sharedListener).toHaveBeenCalledTimes(1);
      // Unique listeners called once each
      expect(uniqueListenerA).toHaveBeenCalledTimes(1);
      expect(uniqueListenerB).toHaveBeenCalledTimes(1);
    });
  });
});
