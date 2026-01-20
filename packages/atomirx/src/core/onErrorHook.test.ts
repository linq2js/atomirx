import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { atom } from "./atom";
import { derived } from "./derived";
import { effect } from "./effect";
import { onErrorHook, ErrorInfo } from "./onErrorHook";

describe("onErrorHook", () => {
  beforeEach(() => {
    onErrorHook.reset();
  });

  afterEach(() => {
    onErrorHook.reset();
  });

  describe("with derived", () => {
    it("should call onErrorHook when derived throws synchronously", async () => {
      const hookFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const source$ = atom(0);
      const derived$ = derived(
        ({ read }) => {
          const val = read(source$);
          if (val > 0) {
            throw new Error("Derived error");
          }
          return val;
        },
        { meta: { key: "testDerived" } }
      );

      await derived$.get();
      expect(hookFn).not.toHaveBeenCalled();

      // Trigger error
      source$.set(5);
      derived$.get().catch(() => {});
      await new Promise((r) => setTimeout(r, 0));

      expect(hookFn).toHaveBeenCalledTimes(1);
      const info: ErrorInfo = hookFn.mock.calls[0][0];
      expect(info.source.type).toBe("derived");
      expect(info.source.key).toBe("testDerived");
      expect((info.error as Error).message).toBe("Derived error");
    });

    it("should call onErrorHook when async dependency rejects", async () => {
      const hookFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const asyncSource$ = atom(Promise.reject(new Error("Async error")));

      const derived$ = derived(({ read }) => read(asyncSource$), {
        meta: { key: "asyncDerived" },
      });

      derived$.get().catch(() => {});
      await new Promise((r) => setTimeout(r, 20));

      expect(hookFn).toHaveBeenCalledTimes(1);
      const info: ErrorInfo = hookFn.mock.calls[0][0];
      expect(info.source.type).toBe("derived");
      expect(info.source.key).toBe("asyncDerived");
      expect((info.error as Error).message).toBe("Async error");
    });

    it("should include derived atom in source", async () => {
      const hookFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const source$ = atom(1);
      const derived$ = derived(({ read }) => {
        throw new Error("Test");
        return read(source$);
      });

      derived$.get().catch(() => {});
      await new Promise((r) => setTimeout(r, 0));

      const info: ErrorInfo = hookFn.mock.calls[0][0];
      expect(info.source.type).toBe("derived");
      if (info.source.type === "derived") {
        expect(info.source.atom).toBe(derived$);
      }
    });

    it("should call both onError option and onErrorHook", async () => {
      const hookFn = vi.fn();
      const onErrorFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const source$ = atom(0);
      const derived$ = derived(
        ({ read }) => {
          const val = read(source$);
          if (val > 0) throw new Error("Error");
          return val;
        },
        { onError: onErrorFn }
      );

      await derived$.get();
      source$.set(1);
      derived$.get().catch(() => {});
      await new Promise((r) => setTimeout(r, 0));

      expect(onErrorFn).toHaveBeenCalledTimes(1);
      expect(hookFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("with effect", () => {
    it("should call onErrorHook with effect source when effect throws", async () => {
      const hookFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const source$ = atom(0);

      effect(
        ({ read }) => {
          const val = read(source$);
          if (val > 0) {
            throw new Error("Effect error");
          }
        },
        { meta: { key: "testEffect" } }
      );

      await new Promise((r) => setTimeout(r, 0));
      expect(hookFn).not.toHaveBeenCalled();

      // Trigger error
      source$.set(5);
      await new Promise((r) => setTimeout(r, 10));

      expect(hookFn).toHaveBeenCalledTimes(1);
      const info: ErrorInfo = hookFn.mock.calls[0][0];
      expect(info.source.type).toBe("effect"); // Should be effect, not derived!
      expect(info.source.key).toBe("testEffect");
      expect((info.error as Error).message).toBe("Effect error");
    });

    it("should include effect instance in source", async () => {
      const hookFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const source$ = atom(1);
      const e = effect(
        ({ read }) => {
          read(source$);
          throw new Error("Test");
        },
        { meta: { key: "myEffect" } }
      );

      await new Promise((r) => setTimeout(r, 10));

      const info: ErrorInfo = hookFn.mock.calls[0][0];
      expect(info.source.type).toBe("effect");
      if (info.source.type === "effect") {
        expect(info.source.effect).toBe(e);
      }
    });

    it("should call both onError option and onErrorHook for effect", async () => {
      const hookFn = vi.fn();
      const onErrorFn = vi.fn();
      onErrorHook.override(() => hookFn);

      const source$ = atom(0);

      effect(
        ({ read }) => {
          const val = read(source$);
          if (val > 0) throw new Error("Error");
        },
        { onError: onErrorFn }
      );

      await new Promise((r) => setTimeout(r, 0));
      source$.set(1);
      await new Promise((r) => setTimeout(r, 10));

      expect(onErrorFn).toHaveBeenCalledTimes(1);
      expect(hookFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("hook behavior", () => {
    it("should not throw when onErrorHook is not set", async () => {
      // Hook is reset in beforeEach, so no handler is set

      const source$ = atom(1);
      const derived$ = derived(({ read }) => {
        throw new Error("Test");
        return read(source$);
      });

      // Should not throw
      derived$.get().catch(() => {});
      await new Promise((r) => setTimeout(r, 0));
    });

    it("should support middleware pattern with override", async () => {
      const errors: ErrorInfo[] = [];

      // First handler
      onErrorHook.override(() => (info) => {
        errors.push({ ...info, error: "first" });
      });

      // Add middleware - chains with previous
      onErrorHook.override((prev) => (info) => {
        prev?.(info);
        errors.push({ ...info, error: "second" });
      });

      const source$ = atom(1);
      derived(({ read }) => {
        throw new Error("Test");
        return read(source$);
      })
        .get()
        .catch(() => {});

      await new Promise((r) => setTimeout(r, 0));

      expect(errors.length).toBe(2);
      expect(errors[0].error).toBe("first");
      expect(errors[1].error).toBe("second");
    });

    it("should support reset", async () => {
      const hookFn = vi.fn();
      onErrorHook.override(() => hookFn);

      onErrorHook.reset();

      const source$ = atom(1);
      derived(({ read }) => {
        throw new Error("Test");
        return read(source$);
      })
        .get()
        .catch(() => {});

      await new Promise((r) => setTimeout(r, 0));

      expect(hookFn).not.toHaveBeenCalled();
    });
  });

  describe("real-world scenarios", () => {
    it("should enable global error logging", async () => {
      const errorLog: Array<{ type: string; key?: string; error: string }> = [];

      onErrorHook.override(() => (info) => {
        errorLog.push({
          type: info.source.type,
          key: info.source.key,
          error: String(info.error),
        });
      });

      const source$ = atom(0);

      // Create multiple derived/effects that will error
      const derived1$ = derived(
        ({ read }) => {
          if (read(source$) > 0) throw new Error("Derived 1 failed");
          return read(source$);
        },
        { meta: { key: "derived1" } }
      );

      const derived2$ = derived(
        ({ read }) => {
          if (read(source$) > 0) throw new Error("Derived 2 failed");
          return read(source$);
        },
        { meta: { key: "derived2" } }
      );

      effect(
        ({ read }) => {
          if (read(source$) > 0) throw new Error("Effect 1 failed");
        },
        { meta: { key: "effect1" } }
      );

      // Trigger initial computation for derived atoms (they're lazy)
      await derived1$.get();
      await derived2$.get();
      await new Promise((r) => setTimeout(r, 0));
      expect(errorLog.length).toBe(0);

      // Trigger all errors
      source$.set(1);
      derived1$.get().catch(() => {});
      derived2$.get().catch(() => {});
      await new Promise((r) => setTimeout(r, 20));

      expect(errorLog.length).toBe(3);
      expect(errorLog.map((e) => e.key).sort()).toEqual([
        "derived1",
        "derived2",
        "effect1",
      ]);
    });

    it("should enable error monitoring service integration", async () => {
      const sentryMock = {
        captureException: vi.fn(),
      };

      onErrorHook.override(() => (info) => {
        sentryMock.captureException(info.error, {
          tags: {
            source_type: info.source.type,
            source_key: info.source.key,
          },
        });
      });

      const source$ = atom(1);
      derived(
        ({ read }) => {
          throw new Error("Critical error");
          return read(source$);
        },
        { meta: { key: "criticalDerived" } }
      )
        .get()
        .catch(() => {});

      await new Promise((r) => setTimeout(r, 0));

      expect(sentryMock.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        {
          tags: {
            source_type: "derived",
            source_key: "criticalDerived",
          },
        }
      );
    });
  });
});
