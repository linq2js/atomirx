import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { effect } from "./effect";

describe("effect", () => {
  describe("basic functionality", () => {
    it("should run effect immediately", async () => {
      const effectFn = vi.fn();
      const count$ = atom(0);

      effect(({ get }) => {
        effectFn(get(count$));
      });

      // Wait for async execution
      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledWith(0);
    });

    it("should run effect when dependency changes", async () => {
      const effectFn = vi.fn();
      const count$ = atom(0);

      effect(({ get }) => {
        effectFn(get(count$));
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledTimes(1);

      count$.set(5);
      await new Promise((r) => setTimeout(r, 10));
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(effectFn).toHaveBeenLastCalledWith(5);
    });

    it("should track multiple dependencies", async () => {
      const effectFn = vi.fn();
      const a$ = atom(1);
      const b$ = atom(2);

      effect(({ get }) => {
        effectFn(get(a$) + get(b$));
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledWith(3);

      a$.set(10);
      await new Promise((r) => setTimeout(r, 10));
      expect(effectFn).toHaveBeenCalledWith(12);

      b$.set(5);
      await new Promise((r) => setTimeout(r, 10));
      expect(effectFn).toHaveBeenCalledWith(15);
    });
  });

  describe("cleanup", () => {
    it("should run cleanup before next execution", async () => {
      const cleanupFn = vi.fn();
      const effectFn = vi.fn();
      const count$ = atom(0);

      effect(({ get, onCleanup }) => {
        effectFn(get(count$));
        onCleanup(cleanupFn);
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).not.toHaveBeenCalled();

      count$.set(1);
      await new Promise((r) => setTimeout(r, 10));
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });

    it("should run cleanup on dispose", async () => {
      const cleanupFn = vi.fn();
      const count$ = atom(0);

      const dispose = effect(({ get, onCleanup }) => {
        get(count$);
        onCleanup(cleanupFn);
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(cleanupFn).not.toHaveBeenCalled();

      dispose();
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispose", () => {
    it("should stop effect execution after dispose", async () => {
      const effectFn = vi.fn();
      const count$ = atom(0);

      const dispose = effect(({ get }) => {
        effectFn(get(count$));
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledTimes(1);

      dispose();

      count$.set(5);
      await new Promise((r) => setTimeout(r, 10));
      // Should not have been called again
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it("should be safe to call dispose multiple times", async () => {
      const cleanupFn = vi.fn();
      const count$ = atom(0);

      const dispose = effect(({ get, onCleanup }) => {
        get(count$);
        onCleanup(cleanupFn);
      });

      await new Promise((r) => setTimeout(r, 0));

      dispose();
      expect(cleanupFn).toHaveBeenCalledTimes(1);

      dispose(); // Second call should be no-op
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should call onError callback when effect throws", async () => {
      const errorHandler = vi.fn();
      const count$ = atom(0);
      const error = new Error("Effect error");

      effect(({ get, onError }) => {
        onError(errorHandler);
        if (get(count$) > 0) {
          throw error;
        }
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(errorHandler).not.toHaveBeenCalled();

      count$.set(5);
      await new Promise((r) => setTimeout(r, 10));
      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it("should call options.onError for unhandled errors", async () => {
      const onError = vi.fn();
      const count$ = atom(0);
      const error = new Error("Effect error");

      effect(
        ({ get }) => {
          if (get(count$) > 0) {
            throw error;
          }
        },
        { onError }
      );

      await new Promise((r) => setTimeout(r, 0));
      expect(onError).not.toHaveBeenCalled();

      count$.set(5);
      await new Promise((r) => setTimeout(r, 10));
      // options.onError should be called for unhandled sync errors
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("context utilities", () => {
    it("should support all() for multiple atoms", async () => {
      const effectFn = vi.fn();
      const a$ = atom(1);
      const b$ = atom(2);

      effect(({ all }) => {
        const [a, b] = all(a$, b$);
        effectFn(a + b);
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledWith(3);
    });
  });
});
