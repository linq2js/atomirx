import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { effect } from "./effect";

describe("effect", () => {
  describe("basic functionality", () => {
    it("should run effect immediately", async () => {
      const effectFn = vi.fn();
      const count$ = atom(0);

      effect(({ read }) => {
        effectFn(read(count$));
      });

      // Wait for async execution
      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledWith(0);
    });

    it("should run effect when dependency changes", async () => {
      const effectFn = vi.fn();
      const count$ = atom(0);

      effect(({ read }) => {
        effectFn(read(count$));
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

      effect(({ read }) => {
        effectFn(read(a$) + read(b$));
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

      effect(({ read, onCleanup }) => {
        effectFn(read(count$));
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

      const dispose = effect(({ read, onCleanup }) => {
        read(count$);
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

      const dispose = effect(({ read }) => {
        effectFn(read(count$));
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

      const dispose = effect(({ read, onCleanup }) => {
        read(count$);
        onCleanup(cleanupFn);
      });

      await new Promise((r) => setTimeout(r, 0));

      dispose();
      expect(cleanupFn).toHaveBeenCalledTimes(1);

      dispose(); // Second call should be no-op
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling with safe()", () => {
    it("should catch errors with safe() and return error tuple", async () => {
      const errorHandler = vi.fn();
      const count$ = atom(0);

      effect(({ read, safe }) => {
        const [err] = safe(() => {
          const count = read(count$);
          if (count > 0) {
            throw new Error("Effect error");
          }
          return count;
        });

        if (err) {
          errorHandler(err);
        }
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(errorHandler).not.toHaveBeenCalled();

      count$.set(5);
      await new Promise((r) => setTimeout(r, 10));
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect((errorHandler.mock.calls[0][0] as Error).message).toBe(
        "Effect error"
      );
    });

    it("should return success tuple when no error", async () => {
      const results: number[] = [];
      const count$ = atom(5);

      effect(({ read, safe }) => {
        const [err, value] = safe(() => read(count$) * 2);
        if (!err && value !== undefined) {
          results.push(value);
        }
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(results).toEqual([10]);

      count$.set(10);
      await new Promise((r) => setTimeout(r, 10));
      expect(results).toEqual([10, 20]);
    });

    it("should preserve Suspense by re-throwing promises in safe()", async () => {
      const effectFn = vi.fn();
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolvePromise = r;
      });
      const async$ = atom(promise);

      effect(({ read, safe }) => {
        // safe() should re-throw the promise, not catch it
        const [err, value] = safe(() => read(async$));
        if (!err) {
          effectFn(value);
        }
      });

      // Effect should not run yet (waiting for promise)
      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).not.toHaveBeenCalled();

      // Resolve the promise
      resolvePromise!(42);
      await new Promise((r) => setTimeout(r, 10));
      expect(effectFn).toHaveBeenCalledWith(42);
    });
  });

  describe("context utilities", () => {
    it("should support all() for multiple atoms", async () => {
      const effectFn = vi.fn();
      const a$ = atom(1);
      const b$ = atom(2);

      effect(({ all }) => {
        const [a, b] = all([a$, b$]);
        effectFn(a + b);
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(effectFn).toHaveBeenCalledWith(3);
    });
  });
});
