import { describe, it, expect, vi } from "vitest";
import { event, isEvent } from "./event";
import { derived } from "./derived";
import { effect } from "./effect";
import { atom } from "./atom";
import { SYMBOL_ATOM, SYMBOL_EVENT } from "./types";
import { isAtom } from "./isAtom";

describe("event", () => {
  describe("creation", () => {
    it("should create an event with SYMBOL_EVENT marker", () => {
      const e = event();
      expect(e[SYMBOL_EVENT]).toBe(true);
    });

    it("should create an event with SYMBOL_ATOM marker", () => {
      const e = event();
      expect(e[SYMBOL_ATOM]).toBe(true);
    });

    it("should be recognized as an atom by isAtom()", () => {
      const e = event();
      expect(isAtom(e)).toBe(true);
    });

    it("should create event with meta", () => {
      const e = event({ meta: { key: "test.event" } });
      expect(e.meta?.key).toBe("test.event");
    });

    it("should create typed event", () => {
      const e = event<{ x: number; y: number }>();
      expect(e[SYMBOL_EVENT]).toBe(true);
    });
  });

  describe("isEvent", () => {
    it("should return true for event", () => {
      const e = event();
      expect(isEvent(e)).toBe(true);
    });

    it("should return false for non-event", () => {
      expect(isEvent(null)).toBe(false);
      expect(isEvent(undefined)).toBe(false);
      expect(isEvent({})).toBe(false);
      expect(isEvent(atom(0))).toBe(false);
    });
  });

  describe("get()", () => {
    it("should return a promise", () => {
      const e = event<number>();
      const promise = e.get();
      expect(promise).toBeInstanceOf(Promise);
    });

    it("should return same promise before fire", () => {
      const e = event<number>();
      const p1 = e.get();
      const p2 = e.get();
      expect(p1).toBe(p2);
    });

    it("should return same promise after fire (resolved promise)", () => {
      const e = event<number>();
      const p1 = e.get();
      e.fire(42);
      const p2 = e.get();
      expect(p1).toBe(p2); // Same promise, now resolved
    });

    it("should return new promise after second fire", () => {
      const e = event<number>();
      const p1 = e.get();
      e.fire(1);
      e.fire(2); // Creates new resolved promise
      const p2 = e.get();
      expect(p1).not.toBe(p2);
    });
  });

  describe("on()", () => {
    it("should notify listener when fire creates new promise", () => {
      const e = event<number>();
      const listener = vi.fn();

      e.on(listener);

      // First fire resolves initial promise, no new promise created
      e.fire(1);
      expect(listener).not.toHaveBeenCalled();

      // Second fire creates new promise, triggers listener
      e.fire(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should return unsubscribe function", () => {
      const e = event<number>();
      const listener = vi.fn();

      const unsubscribe = e.on(listener);
      e.fire(1); // First fire
      e.fire(2); // Second fire - would trigger listener

      unsubscribe();
      e.fire(3); // Third fire - should not trigger listener

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("fire()", () => {
    it("should fire void event without payload", () => {
      const e = event();
      expect(() => e.fire()).not.toThrow();
    });

    it("should fire event with payload", () => {
      const e = event<number>();
      expect(() => e.fire(42)).not.toThrow();
    });

    it("should resolve initial pending promise on first fire", async () => {
      const e = event<number>();
      const promise = e.get();
      e.fire(42);
      await expect(promise).resolves.toBe(42);
    });

    it("should create new resolved promise on subsequent fires", async () => {
      const e = event<number>();
      e.fire(1);
      const p1 = e.get();
      await expect(p1).resolves.toBe(1);

      e.fire(2);
      const p2 = e.get();
      await expect(p2).resolves.toBe(2);
      expect(p1).not.toBe(p2);
    });
  });

  describe("last()", () => {
    it("should return undefined before first fire", () => {
      const e = event<number>();
      expect(e.last()).toBeUndefined();
    });

    it("should return last fired payload", () => {
      const e = event<number>();
      e.fire(1);
      expect(e.last()).toBe(1);
      e.fire(2);
      expect(e.last()).toBe(2);
    });

    it("should return undefined for void event after fire", () => {
      const e = event();
      e.fire();
      expect(e.last()).toBeUndefined();
    });
  });

  describe("equals option", () => {
    it("should skip creating new promise when equals returns true", () => {
      const e = event<string>({ equals: "shallow" });
      const listener = vi.fn();
      e.on(listener);

      e.fire("hello"); // First fire
      e.fire("hello"); // Same value - should be skipped
      e.fire("hello"); // Same value - should be skipped

      // Listener should not be called (no new promises after first)
      expect(listener).not.toHaveBeenCalled();
    });

    it("should create new promise when equals returns false", () => {
      const e = event<string>({ equals: "shallow" });
      const listener = vi.fn();
      e.on(listener);

      e.fire("hello"); // First fire
      e.fire("world"); // Different value - creates new promise

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("default equals should always create new promise (returns false)", () => {
      const e = event(); // void event with default equals
      const listener = vi.fn();
      e.on(listener);

      e.fire(); // First fire
      e.fire(); // Second fire - should create new promise
      e.fire(); // Third fire - should create new promise

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should work with custom equals function", () => {
      const e = event<{ id: number; name: string }>({
        equals: (a, b) => a.id === b.id,
      });
      const listener = vi.fn();
      e.on(listener);

      e.fire({ id: 1, name: "alice" }); // First fire
      e.fire({ id: 1, name: "bob" }); // Same id - skipped
      e.fire({ id: 2, name: "charlie" }); // Different id - new promise

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("with derived - direct read()", () => {
    it("should suspend derived until event fires", async () => {
      const submitEvent = event<string>();
      const computeFn = vi.fn();

      const result$ = derived(({ read }) => {
        const data = read(submitEvent); // Direct read, no wait() needed
        computeFn(data);
        return `processed: ${data}`;
      });

      // Should be loading initially
      expect(result$.state().status).toBe("loading");

      // Fire the event
      submitEvent.fire("hello");

      // Should resolve
      const value = await result$.get();
      expect(value).toBe("processed: hello");
      expect(computeFn).toHaveBeenCalledWith("hello");
    });

    it("should recompute when fire() is called again", async () => {
      const submitEvent = event<number>();

      const result$ = derived(({ read }) => {
        const n = read(submitEvent);
        return n * 2;
      });

      // Fire first event
      submitEvent.fire(5);
      expect(await result$.get()).toBe(10);

      // Fire second event - derived should recompute
      submitEvent.fire(10);

      // Wait for recomputation
      await new Promise((r) => setTimeout(r, 10));

      expect(await result$.get()).toBe(20);
    });

    it("should work with race() for multiple events", async () => {
      const submitEvent = event<{ data: string }>();
      const cancelEvent = event();

      const result$ = derived(({ race }) => {
        const { key, value } = race({
          submit: submitEvent, // Direct, no wait() needed
          cancel: cancelEvent,
        });

        if (key === "cancel") {
          return { cancelled: true, data: null };
        }
        return { cancelled: false, data: value.data };
      });

      // Should be loading
      expect(result$.state().status).toBe("loading");

      // Fire cancel
      cancelEvent.fire();

      const value = await result$.get();
      expect(value).toEqual({ cancelled: true, data: null });
    });

    it("should work with all() for multiple events", async () => {
      const eventA = event<number>();
      const eventB = event<string>();

      const result$ = derived(({ all }) => {
        const [a, b] = all([eventA, eventB]); // Direct, no wait() needed
        return `${a}-${b}`;
      });

      // Should be loading
      expect(result$.state().status).toBe("loading");

      // Fire both events
      eventA.fire(1);
      eventB.fire("two");

      const value = await result$.get();
      expect(value).toBe("1-two");
    });

    it("should combine events with atoms", async () => {
      const multiplier$ = atom(2);
      const computeEvent = event<number>();

      const result$ = derived(({ read }) => {
        const n = read(computeEvent);
        const mult = read(multiplier$);
        return n * mult;
      });

      // Fire event
      computeEvent.fire(5);
      expect(await result$.get()).toBe(10);

      // Change multiplier - derived recomputes immediately
      multiplier$.set(3);

      // Wait for recomputation
      await new Promise((r) => setTimeout(r, 10));

      // Still uses last event value
      expect(await result$.get()).toBe(15);
    });
  });

  describe("with effect - direct read()", () => {
    it("should suspend effect until event fires", async () => {
      const clickEvent = event<{ x: number }>();
      const handler = vi.fn();

      effect(({ read }) => {
        const coords = read(clickEvent); // Direct read, no wait() needed
        handler(coords);
      });

      // Handler not called yet
      expect(handler).not.toHaveBeenCalled();

      // Fire event
      clickEvent.fire({ x: 100 });

      // Wait for effect to run
      await new Promise((r) => setTimeout(r, 10));

      expect(handler).toHaveBeenCalledWith({ x: 100 });
    });

    it("should re-run effect when fire() is called again", async () => {
      const clickEvent = event<number>();
      const handler = vi.fn();

      effect(({ read }) => {
        const value = read(clickEvent);
        handler(value);
      });

      // First fire
      clickEvent.fire(1);
      await new Promise((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledWith(1);

      // Second fire - effect should re-run
      clickEvent.fire(2);
      await new Promise((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledWith(2);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup", () => {
    it("should dispose event atoms when derived is disposed", async () => {
      const testEvent = event<number>();

      const result$ = derived(({ read }) => {
        return read(testEvent) * 2;
      });

      // Fire to resolve
      testEvent.fire(5);
      expect(await result$.get()).toBe(10);

      // Dispose should not throw
      expect(() => result$._dispose()).not.toThrow();
    });
  });

  describe("reactive flow", () => {
    it("should demonstrate complete reactive flow", async () => {
      const searchEvent = event<string>();
      const results: string[] = [];

      // Derived that processes search queries
      const searchResult$ = derived(({ read }) => {
        const query = read(searchEvent);
        return `Results for: ${query}`;
      });

      // Subscribe to changes
      searchResult$.on(() => {
        const state = searchResult$.state();
        if (state.status === "ready") {
          results.push(state.value!);
        }
      });

      // Initial state is loading (pending promise)
      expect(searchResult$.state().status).toBe("loading");

      // First search
      searchEvent.fire("hello");
      await new Promise((r) => setTimeout(r, 10));

      // Second search
      searchEvent.fire("world");
      await new Promise((r) => setTimeout(r, 10));

      expect(results).toEqual(["Results for: hello", "Results for: world"]);
    });
  });
});
