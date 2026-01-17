import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { define } from "./define";
import { onCreateHook } from "./onCreateHook";

describe("define", () => {
  const originalOnCreateHook = onCreateHook.current;

  beforeEach(() => {
    onCreateHook.current = undefined;
  });

  afterEach(() => {
    onCreateHook.current = originalOnCreateHook;
  });

  describe("basic functionality", () => {
    it("should create a lazy singleton", () => {
      const creator = vi.fn(() => ({ value: 42 }));
      const store = define(creator);

      // Creator not called yet
      expect(creator).not.toHaveBeenCalled();

      // First access creates instance
      const instance1 = store();
      expect(creator).toHaveBeenCalledTimes(1);
      expect(instance1.value).toBe(42);

      // Second access returns same instance
      const instance2 = store();
      expect(creator).toHaveBeenCalledTimes(1);
      expect(instance2).toBe(instance1);
    });

    it("should store key from options", () => {
      const store = define(() => ({}), { key: "myStore" });
      expect(store.key).toBe("myStore");
    });

    it("should have undefined key when not provided", () => {
      const store = define(() => ({}));
      expect(store.key).toBeUndefined();
    });
  });

  describe("isInitialized", () => {
    it("should return false before first access", () => {
      const store = define(() => ({ value: 1 }));
      expect(store.isInitialized()).toBe(false);
    });

    it("should return true after first access", () => {
      const store = define(() => ({ value: 1 }));
      store();
      expect(store.isInitialized()).toBe(true);
    });
  });

  describe("override", () => {
    it("should allow overriding before initialization", () => {
      const store = define(() => ({ value: "original" }));

      store.override(() => ({ value: "overridden" }));

      expect(store().value).toBe("overridden");
    });

    it("should throw if override called after initialization", () => {
      const store = define(() => ({ value: "original" }));

      // Initialize
      store();

      expect(() => {
        store.override(() => ({ value: "overridden" }));
      }).toThrow(
        "Cannot override after initialization. Call override() before accessing the service."
      );
    });

    it("should provide original factory to override function", () => {
      const store = define(() => ({ value: 1, extra: false }));

      store.override((original) => ({
        ...original(),
        extra: true,
      }));

      const instance = store();
      expect(instance.value).toBe(1);
      expect(instance.extra).toBe(true);
    });

    it("should allow wrapping original behavior", () => {
      const store = define(() => ({
        getValue: () => 10 as number,
      }));

      store.override((original) => {
        const base = original();
        return {
          getValue: () => base.getValue() * 2,
        };
      });

      expect(store().getValue()).toBe(20);
    });
  });

  describe("isOverridden", () => {
    it("should return false when not overridden", () => {
      const store = define(() => ({}));
      expect(store.isOverridden()).toBe(false);
    });

    it("should return true when overridden", () => {
      const store = define(() => ({}));
      store.override(() => ({}));
      expect(store.isOverridden()).toBe(true);
    });

    it("should return false after reset", () => {
      const store = define(() => ({}));
      store.override(() => ({}));
      store.reset();
      expect(store.isOverridden()).toBe(false);
    });
  });

  describe("reset", () => {
    it("should clear override and instance", () => {
      const creator = vi.fn(() => ({ value: "original" }));
      const store = define(creator);

      store.override(() => ({ value: "overridden" }));
      expect(store().value).toBe("overridden");

      store.reset();

      // Override cleared, original creator used
      expect(store().value).toBe("original");
      expect(store.isOverridden()).toBe(false);
    });

    it("should call dispose if present", () => {
      const dispose = vi.fn();
      const store = define(() => ({
        value: 1,
        dispose,
      }));

      store(); // Initialize
      store.reset();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("should allow re-initialization after reset", () => {
      const creator = vi.fn(() => ({ value: Math.random() }));
      const store = define(creator);

      const first = store();
      store.reset();
      const second = store();

      expect(first).not.toBe(second);
      expect(creator).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate", () => {
    it("should clear instance and allow re-creation", () => {
      let counter = 0;
      const store = define(() => ({ id: ++counter }));

      expect(store().id).toBe(1);
      expect(store().id).toBe(1); // Same instance

      store.invalidate();

      expect(store().id).toBe(2); // New instance
    });

    it("should call dispose if present", () => {
      const dispose = vi.fn();
      const store = define(() => ({
        value: 1,
        dispose,
      }));

      store(); // Initialize
      store.invalidate();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("should also clear override", () => {
      const store = define(() => ({ value: "original" }));

      store.override(() => ({ value: "overridden" }));
      expect(store().value).toBe("overridden");

      store.invalidate();

      expect(store.isOverridden()).toBe(false);
      expect(store().value).toBe("original");
    });
  });

  describe("dispose handling", () => {
    it("should not throw if dispose is not a function", () => {
      const store = define(() => ({
        value: 1,
        dispose: "not a function",
      }));

      store();

      expect(() => store.reset()).not.toThrow();
    });

    it("should not throw if instance has no dispose", () => {
      const store = define(() => ({ value: 1 }));

      store();

      expect(() => store.reset()).not.toThrow();
    });

    it("should handle null instance gracefully", () => {
      const store = define(() => ({ value: 1 }));

      // Reset without initialization
      expect(() => store.reset()).not.toThrow();
    });
  });

  describe("onCreateHook", () => {
    it("should call onCreateHook when module is created", () => {
      const hookFn = vi.fn();
      onCreateHook.current = hookFn;

      const store = define(() => ({ value: 42 }), { key: "testModule" });
      const instance = store();

      expect(hookFn).toHaveBeenCalledTimes(1);
      expect(hookFn).toHaveBeenCalledWith({
        type: "module",
        key: "testModule",
        module: instance,
      });
    });

    it("should call onCreateHook with undefined key when not provided", () => {
      const hookFn = vi.fn();
      onCreateHook.current = hookFn;

      const store = define(() => ({ value: 42 }));
      store();

      expect(hookFn).toHaveBeenCalledWith({
        type: "module",
        key: undefined,
        module: expect.any(Object),
      });
    });

    it("should not throw when onCreateHook is undefined", () => {
      onCreateHook.current = undefined;

      const store = define(() => ({ value: 42 }));
      expect(() => store()).not.toThrow();
    });

    it("should call onCreateHook for overridden module", () => {
      const hookFn = vi.fn();
      onCreateHook.current = hookFn;

      const store = define(() => ({ value: "original" }));
      store.override(() => ({ value: "overridden" }));
      const instance = store();

      expect(hookFn).toHaveBeenCalledWith({
        type: "module",
        key: undefined,
        module: instance,
      });
    });
  });

  describe("real-world patterns", () => {
    it("should work as a service container", () => {
      const apiService = define(() => ({
        baseUrl: "https://api.example.com",
        fetch: (endpoint: string) => `${endpoint}`,
      }));

      const userService = define(() => ({
        api: apiService(),
        getUser: (id: number) => `user-${id}`,
      }));

      expect(userService().api.baseUrl).toBe("https://api.example.com");
      expect(userService().getUser(1)).toBe("user-1");
    });

    it("should support testing with mocks", () => {
      const apiService = define(() => ({
        fetch: (url: string) => `real-${url}`,
      }));

      // In test setup
      apiService.override(() => ({
        fetch: vi.fn((url: string) => `mock-${url}`),
      }));

      expect(apiService().fetch("/users")).toBe("mock-/users");

      // Cleanup
      apiService.reset();
      expect(apiService().fetch("/users")).toBe("real-/users");
    });

    it("should support platform-specific implementations", () => {
      const storageService = define(() => ({
        get: (key: string) => `localStorage-${key}`,
        set: (_key: string, _value: string) => {},
      }));

      // Simulate mobile platform override
      const isMobile = true;
      if (isMobile) {
        storageService.override(() => ({
          get: (key: string) => `secureStorage-${key}`,
          set: (_key: string, _value: string) => {},
        }));
      }

      expect(storageService().get("token")).toBe("secureStorage-token");
    });
  });
});
