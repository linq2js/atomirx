import { describe, it, expect, vi } from "vitest";
import { abortable, isAbortError, createAbortError } from "./abortable";

// Helper to create a delay promise
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Helper to create a controllable promise
const createControllablePromise = <T>() => {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

describe("abortable", () => {
  describe("basic functionality", () => {
    it("should resolve with the value from the wrapped function", async () => {
      const result = await abortable(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it("should reject with error from the wrapped function", async () => {
      const error = new Error("Test error");
      await expect(abortable(() => Promise.reject(error))).rejects.toThrow(
        "Test error"
      );
    });

    it("should pass signal to the wrapped function", async () => {
      const signalReceiver = vi.fn();

      await abortable((signal) => {
        signalReceiver(signal);
        return Promise.resolve();
      });

      expect(signalReceiver).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it("should handle sync return values", async () => {
      const result = await abortable(() => 42);
      expect(result).toBe(42);
    });

    it("should handle sync thrown errors", async () => {
      await expect(
        abortable(() => {
          throw new Error("Sync error");
        })
      ).rejects.toThrow("Sync error");
    });

    it("should return an AbortablePromise with abort method", () => {
      const promise = abortable(() => Promise.resolve());
      expect(typeof promise.abort).toBe("function");
    });

    it("should return an AbortablePromise with aborted method", () => {
      const promise = abortable(() => Promise.resolve());
      expect(typeof promise.aborted).toBe("function");
    });
  });

  describe("abort()", () => {
    it("should reject with AbortError when abort() is called", async () => {
      const { promise } = createControllablePromise<number>();
      const req = abortable(() => promise);

      req.abort();

      await expect(req).rejects.toThrow();
      try {
        await req;
      } catch (e) {
        expect(isAbortError(e)).toBe(true);
      }
    });

    it("should mark aborted() as true when abort() is called", async () => {
      const { promise } = createControllablePromise<number>();
      const req = abortable(() => promise);

      expect(req.aborted()).toBe(false);
      req.abort();
      expect(req.aborted()).toBe(true);

      // Catch the rejection to prevent unhandled rejection
      await req.catch(() => {});
    });

    it("should pass abort reason to the error", async () => {
      const { promise } = createControllablePromise<number>();
      const req = abortable(() => promise);

      req.abort("User cancelled");

      try {
        await req;
      } catch (e) {
        expect((e as DOMException).message).toBe("User cancelled");
      }
    });

    it("should abort immediately even if function takes long", async () => {
      const startTime = Date.now();
      const req = abortable(async () => {
        await delay(5000); // Would take 5 seconds
        return "done";
      });

      req.abort();

      await expect(req).rejects.toThrow();
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should abort immediately
    });

    it("should be safe to call abort multiple times", async () => {
      const onAbort = vi.fn();
      const { promise } = createControllablePromise<number>();
      const req = abortable(() => promise, { onAbort });

      req.abort("first");
      req.abort("second");
      req.abort("third");

      // Catch the rejection to prevent unhandled rejection
      await req.catch(() => {});

      expect(onAbort).toHaveBeenCalledTimes(1);
      expect(onAbort).toHaveBeenCalledWith("first");
    });

    it("should abort the signal passed to the function", async () => {
      let capturedSignal: AbortSignal;
      const { promise } = createControllablePromise<number>();

      const req = abortable((signal) => {
        capturedSignal = signal;
        return promise;
      });

      expect(capturedSignal!.aborted).toBe(false);
      req.abort();
      expect(capturedSignal!.aborted).toBe(true);

      // Catch the rejection to prevent unhandled rejection
      await req.catch(() => {});
    });
  });

  describe("onAbort callback", () => {
    it("should call onAbort when abort() is called", async () => {
      const onAbort = vi.fn();
      const { promise } = createControllablePromise<number>();
      const req = abortable(() => promise, { onAbort });

      req.abort("cancelled");

      // Catch the rejection to prevent unhandled rejection
      await req.catch(() => {});

      expect(onAbort).toHaveBeenCalledWith("cancelled");
    });

    it("should call onAbort when linked signal aborts", async () => {
      const onAbort = vi.fn();
      const controller = new AbortController();
      const { promise } = createControllablePromise<number>();

      const req = abortable(() => promise, {
        signal: controller.signal,
        onAbort,
      });

      controller.abort("parent abort");

      // Catch the rejection to prevent unhandled rejection
      await req.catch(() => {});

      expect(onAbort).toHaveBeenCalledWith("parent abort");
    });

    it("should call onAbort when inner function throws AbortError", async () => {
      const onAbort = vi.fn();

      try {
        await abortable(
          () => Promise.reject(new DOMException("Inner abort", "AbortError")),
          { onAbort }
        );
      } catch {
        // Expected
      }

      expect(onAbort).toHaveBeenCalled();
    });

    it("should NOT call onAbort for non-AbortError errors", async () => {
      const onAbort = vi.fn();

      try {
        await abortable(() => Promise.reject(new Error("Regular error")), {
          onAbort,
        });
      } catch {
        // Expected
      }

      expect(onAbort).not.toHaveBeenCalled();
    });
  });

  describe("linked signals (signal option)", () => {
    it("should abort when single linked signal aborts", async () => {
      const controller = new AbortController();
      const { promise } = createControllablePromise<number>();

      const req = abortable(() => promise, { signal: controller.signal });

      expect(req.aborted()).toBe(false);
      controller.abort();
      expect(req.aborted()).toBe(true);

      await expect(req).rejects.toThrow();
    });

    it("should abort when any of multiple linked signals abort", async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      const { promise } = createControllablePromise<number>();

      const req = abortable(() => promise, {
        signal: [controller1.signal, controller2.signal],
      });

      expect(req.aborted()).toBe(false);
      controller2.abort("second");
      expect(req.aborted()).toBe(true);

      try {
        await req;
      } catch (e) {
        expect((e as DOMException).message).toBe("second");
      }
    });

    it("should abort immediately if linked signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort("pre-aborted");

      const req = abortable(() => delay(1000).then(() => "done"), {
        signal: controller.signal,
      });

      expect(req.aborted()).toBe(true);
      await expect(req).rejects.toThrow();
    });

    it("should support AbortSignal.timeout", async () => {
      const req = abortable(
        () => delay(5000).then(() => "done"),
        { signal: AbortSignal.timeout(50) }
      );

      try {
        await req;
      } catch {
        // Expected to throw
      }
      expect(req.aborted()).toBe(true);
    });

    it("should propagate abort to nested abortable calls", async () => {
      const controller = new AbortController();
      const innerAborted = vi.fn();

      const req = abortable(
        async (signal) => {
          const inner = abortable(
            async (innerSignal) => {
              innerSignal.addEventListener("abort", innerAborted);
              await delay(5000);
              return "inner done";
            },
            { signal }
          );
          return inner;
        },
        { signal: controller.signal }
      );

      controller.abort();

      await expect(req).rejects.toThrow();
      expect(innerAborted).toHaveBeenCalled();
    });
  });

  describe("AbortError detection from inner function", () => {
    it("should mark aborted() true when inner function throws AbortError", async () => {
      const req = abortable(() =>
        Promise.reject(new DOMException("aborted", "AbortError"))
      );

      try {
        await req;
      } catch {
        // Expected
      }

      expect(req.aborted()).toBe(true);
    });

    it("should mark aborted() true when signal is aborted during execution", async () => {
      const req = abortable(async (signal) => {
        // Simulate fetch-like behavior where abort causes AbortError
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        await delay(100);
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        return "done";
      });

      setTimeout(() => req.abort(), 10);

      await expect(req).rejects.toThrow();
      expect(req.aborted()).toBe(true);
    });

    it("should NOT mark aborted() true for other errors", async () => {
      const req = abortable(() => Promise.reject(new Error("regular error")));

      try {
        await req;
      } catch {
        // Expected
      }

      expect(req.aborted()).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should work with fetch-like API", async () => {
      // Mock fetch behavior
      const mockFetch = (url: string, options?: { signal?: AbortSignal }) => {
        return new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => resolve(`data from ${url}`), 100);

          options?.signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("Fetch aborted", "AbortError"));
          });
        });
      };

      const req = abortable((signal) => mockFetch("/api/data", { signal }));

      // Don't abort - should succeed
      const result = await req;
      expect(result).toBe("data from /api/data");
    });

    it("should cancel fetch-like API when aborted", async () => {
      const mockFetch = (url: string, options?: { signal?: AbortSignal }) => {
        return new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => resolve(`data from ${url}`), 1000);

          options?.signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("Fetch aborted", "AbortError"));
          });
        });
      };

      const req = abortable((signal) => mockFetch("/api/data", { signal }));

      setTimeout(() => req.abort(), 50);

      await expect(req).rejects.toThrow();
      expect(req.aborted()).toBe(true);
    });

    it("should handle race between completion and abort", async () => {
      // Promise resolves very quickly
      const req = abortable(() => Promise.resolve("fast"));

      // Abort after promise already resolved
      setTimeout(() => req.abort(), 100);

      // Should resolve successfully
      const result = await req;
      expect(result).toBe("fast");
      expect(req.aborted()).toBe(false);
    });

    it("should allow chaining with .then/.catch/.finally", async () => {
      const cleanup = vi.fn();

      const req = abortable(() => Promise.resolve(10))
        .then((x) => x * 2)
        .finally(cleanup);

      const result = await req;
      expect(result).toBe(20);
      expect(cleanup).toHaveBeenCalled();
    });

    it("real-world: component unmount cancellation pattern", async () => {
      const onAbort = vi.fn();

      // Simulate component mount
      const unmountController = new AbortController();

      const loadData = () =>
        abortable(
          async (signal) => {
            // Simulate API call
            await delay(100);
            if (signal.aborted) throw new DOMException("aborted", "AbortError");
            return { user: "John" };
          },
          { signal: unmountController.signal, onAbort }
        );

      const req = loadData();

      // Simulate component unmount
      unmountController.abort();

      await expect(req).rejects.toThrow();
      expect(onAbort).toHaveBeenCalled();
    });
  });
});

describe("isAbortError", () => {
  it("should return true for DOMException with name AbortError", () => {
    const error = new DOMException("test", "AbortError");
    expect(isAbortError(error)).toBe(true);
  });

  it("should return true for Error with name AbortError", () => {
    const error = new Error("test");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
  });

  it("should return false for regular Error", () => {
    expect(isAbortError(new Error("test"))).toBe(false);
  });

  it("should return false for other DOMException types", () => {
    expect(isAbortError(new DOMException("test", "NotFoundError"))).toBe(false);
  });

  it("should return false for non-error values", () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError({ name: "AbortError" })).toBe(false);
  });
});

describe("createAbortError", () => {
  it("should create DOMException with name AbortError", () => {
    const error = createAbortError();
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("AbortError");
  });

  it("should use provided string as message", () => {
    const error = createAbortError("Custom message");
    expect(error.message).toBe("Custom message");
  });

  it("should use reason.message if reason is an object with message", () => {
    const error = createAbortError({ message: "Object message" });
    expect(error.message).toBe("Object message");
  });

  it("should use default message if no reason provided", () => {
    const error = createAbortError();
    expect(error.message).toBe("The operation was aborted");
  });
});
