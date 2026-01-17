import { describe, it, expect, vi } from "vitest";
import { emitter } from "./emitter";

describe("emitter", () => {
  describe("basic functionality", () => {
    it("should emit to listeners in order", () => {
      const e = emitter<number>();
      const order: number[] = [];

      e.on(() => order.push(1));
      e.on(() => order.push(2));
      e.on(() => order.push(3));

      e.emit(42);

      expect(order).toEqual([1, 2, 3]);
    });

    it("should support array of listeners in on()", () => {
      const e = emitter<number>();
      const calls: number[] = [];

      e.on([
        (n) => calls.push(n),
        (n) => calls.push(n * 2),
        (n) => calls.push(n * 3),
      ]);

      e.emit(10);

      expect(calls).toEqual([10, 20, 30]);
    });

    it("should return size of listeners", () => {
      const e = emitter<number>();

      expect(e.size()).toBe(0);

      e.on(() => {});
      expect(e.size()).toBe(1);

      e.on(() => {});
      expect(e.size()).toBe(2);
    });

    it("should unsubscribe listener", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      const unsub = e.on(listener);
      e.emit(1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      e.emit(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support initial listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const e = emitter<number>([listener1, listener2]);
      e.emit(42);

      expect(listener1).toHaveBeenCalledWith(42);
      expect(listener2).toHaveBeenCalledWith(42);
    });
  });

  describe("on() with map function", () => {
    it("should transform values with map function", () => {
      const e = emitter<{ type: string; data: number }>();
      const listener = vi.fn();

      e.on((event) => ({ value: event.data * 2 }), listener);

      e.emit({ type: "test", data: 5 });

      expect(listener).toHaveBeenCalledWith(10);
    });

    it("should filter events when map returns undefined", () => {
      const e = emitter<{ type: string; data: number }>();
      const listener = vi.fn();

      e.on(
        (event) =>
          event.type === "success" ? { value: event.data } : undefined,
        listener
      );

      e.emit({ type: "error", data: 1 });
      expect(listener).not.toHaveBeenCalled();

      e.emit({ type: "success", data: 2 });
      expect(listener).toHaveBeenCalledWith(2);
    });

    it("should support array of listeners with map function", () => {
      const e = emitter<number>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      e.on((n) => ({ value: n * 10 }), [listener1, listener2]);

      e.emit(5);

      expect(listener1).toHaveBeenCalledWith(50);
      expect(listener2).toHaveBeenCalledWith(50);
    });

    it("should unsubscribe mapped listeners correctly", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      const unsub = e.on((n) => ({ value: n }), listener);

      e.emit(1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();

      e.emit(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("emitLifo", () => {
    it("should emit in reverse order (LIFO)", () => {
      const e = emitter<number>();
      const order: number[] = [];

      e.on(() => order.push(1));
      e.on(() => order.push(2));
      e.on(() => order.push(3));

      e.emitLifo(42);

      expect(order).toEqual([3, 2, 1]);
    });

    it("should be no-op when settled", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      e.on(listener);
      e.settle(1);
      listener.mockClear();

      e.emitLifo(2);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("should remove all listeners", () => {
      const e = emitter<number>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      e.on(listener1);
      e.on(listener2);

      expect(e.size()).toBe(2);

      e.clear();

      expect(e.size()).toBe(0);
      e.emit(1);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe("emitAndClear", () => {
    it("should emit to all listeners then clear", () => {
      const e = emitter<number>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      e.on(listener1);
      e.on(listener2);

      e.emitAndClear(42);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener1).toHaveBeenCalledWith(42);
      expect(listener2).toHaveBeenCalledWith(42);
      expect(e.size()).toBe(0);
    });

    it("should be no-op when settled", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      e.on(listener);
      e.settle(1);
      listener.mockClear();

      e.emitAndClear(2);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("emitAndClearLifo", () => {
    it("should emit in reverse order then clear", () => {
      const e = emitter<number>();
      const order: number[] = [];

      e.on(() => order.push(1));
      e.on(() => order.push(2));
      e.on(() => order.push(3));

      e.emitAndClearLifo(42);

      expect(order).toEqual([3, 2, 1]);
      expect(e.size()).toBe(0);
    });

    it("should be no-op when settled", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      e.on(listener);
      e.settle(1);
      listener.mockClear();

      e.emitAndClearLifo(2);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("settle", () => {
    it("should emit to all listeners and clear", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      e.on(listener);

      e.settle(99);

      expect(listener).toHaveBeenCalledWith(99);
      expect(e.size()).toBe(0);
    });

    it("should mark emitter as settled", () => {
      const e = emitter<number>();

      expect(e.settled()).toBe(false);

      e.settle(1);

      expect(e.settled()).toBe(true);
    });

    it("should be no-op if already settled", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      e.settle(1);

      e.on(listener);
      listener.mockClear();

      e.settle(2);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should call new subscribers immediately with settled value", () => {
      const e = emitter<number>();

      e.settle(42);

      const listener = vi.fn();
      const unsub = e.on(listener);

      expect(listener).toHaveBeenCalledWith(42);
      expect(unsub).toBeDefined();
      // Unsub should be no-op for settled emitters
      unsub();
    });

    it("should call new mapped subscribers immediately with settled value", () => {
      const e = emitter<number>();

      e.settle(10);

      const listener = vi.fn();
      e.on((n) => ({ value: n * 2 }), listener);

      expect(listener).toHaveBeenCalledWith(20);
    });

    it("should call multiple new subscribers immediately when settled", () => {
      const e = emitter<number>();

      e.settle(5);

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      e.on([listener1, listener2]);

      expect(listener1).toHaveBeenCalledWith(5);
      expect(listener2).toHaveBeenCalledWith(5);
    });
  });

  describe("emit when settled", () => {
    it("should be no-op", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      e.on(listener);
      e.settle(1);
      listener.mockClear();

      e.emit(2);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle emit with no listeners", () => {
      const e = emitter<number>();

      // Should not throw
      expect(() => e.emit(1)).not.toThrow();
      expect(() => e.emitLifo(1)).not.toThrow();
      expect(() => e.emitAndClear(1)).not.toThrow();
      expect(() => e.emitAndClearLifo(1)).not.toThrow();
      expect(() => e.settle(1)).not.toThrow();
    });

    it("should handle void emitter", () => {
      const e = emitter();
      const listener = vi.fn();

      e.on(listener);
      e.emit();

      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it("should pass on() as a callback without losing context", () => {
      const e = emitter<number>();
      const listener = vi.fn();

      // Use the bound 'on' method
      const { on } = e;
      on(listener);

      e.emit(42);

      expect(listener).toHaveBeenCalledWith(42);
    });
  });
});
