import { describe, it, expect } from "vitest";
import { hook } from "./hook";

describe("hook", () => {
  describe("createHook", () => {
    it("should create a hook with initial value", () => {
      const myHook = hook(42);
      expect(myHook.current).toBe(42);
    });

    it("should create a hook with undefined when no initial value", () => {
      const myHook = hook<string>();
      expect(myHook.current).toBeUndefined();
    });

    it("should create a hook with object value", () => {
      const obj = { name: "test" };
      const myHook = hook(obj);
      expect(myHook.current).toBe(obj);
    });

    it("should create a hook with function value", () => {
      const fn = () => 42;
      const myHook = hook(fn);
      expect(myHook.current).toBe(fn);
    });
  });

  describe("hook.override", () => {
    it("should override the current value using reducer", () => {
      const myHook = hook(0);
      expect(myHook.current).toBe(0);

      myHook.override(() => 100);
      expect(myHook.current).toBe(100);
    });

    it("should allow multiple overrides", () => {
      const myHook = hook("initial");
      myHook.override(() => "first");
      expect(myHook.current).toBe("first");

      myHook.override(() => "second");
      expect(myHook.current).toBe("second");
    });

    it("should receive previous value in reducer", () => {
      const myHook = hook(10);
      myHook.override((prev) => prev + 5);
      expect(myHook.current).toBe(15);

      myHook.override((prev) => prev * 2);
      expect(myHook.current).toBe(30);
    });

    it("should support composing handlers (middleware pattern)", () => {
      const calls: string[] = [];
      const myHook = hook<((msg: string) => void) | undefined>(undefined);

      // First handler
      myHook.override(() => (msg) => calls.push(`first: ${msg}`));

      // Compose with second handler
      myHook.override((prev) => (msg) => {
        prev?.(msg);
        calls.push(`second: ${msg}`);
      });

      myHook.current?.("hello");
      expect(calls).toEqual(["first: hello", "second: hello"]);
    });
  });

  describe("hook setup/release pattern", () => {
    it("should create a setup function that returns a release function", () => {
      const myHook = hook(0);
      const setup = myHook(() => 10);

      expect(typeof setup).toBe("function");

      const release = setup();
      expect(typeof release).toBe("function");
      expect(myHook.current).toBe(10);

      release();
      expect(myHook.current).toBe(0);
    });

    it("should support nested setup/release", () => {
      const myHook = hook(0);

      const setup1 = myHook(() => 1);
      const release1 = setup1();
      expect(myHook.current).toBe(1);

      const setup2 = myHook(() => 2);
      const release2 = setup2();
      expect(myHook.current).toBe(2);

      release2();
      expect(myHook.current).toBe(1);

      release1();
      expect(myHook.current).toBe(0);
    });

    it("should receive previous value in setup reducer", () => {
      const myHook = hook(10);

      const setup = myHook((prev) => prev + 5);
      const release = setup();
      expect(myHook.current).toBe(15);

      release();
      expect(myHook.current).toBe(10);
    });
  });

  describe("hook.use", () => {
    it("should temporarily set hook value during function execution", () => {
      const myHook = hook(0);

      const result = hook.use([myHook(() => 42)], () => {
        expect(myHook.current).toBe(42);
        return "done";
      });

      expect(result).toBe("done");
      expect(myHook.current).toBe(0);
    });

    it("should support multiple hooks", () => {
      const hookA = hook("a");
      const hookB = hook("b");

      hook.use([hookA(() => "A"), hookB(() => "B")], () => {
        expect(hookA.current).toBe("A");
        expect(hookB.current).toBe("B");
      });

      expect(hookA.current).toBe("a");
      expect(hookB.current).toBe("b");
    });

    it("should restore values even if function throws", () => {
      const myHook = hook(0);

      expect(() => {
        hook.use([myHook(() => 42)], () => {
          expect(myHook.current).toBe(42);
          throw new Error("test error");
        });
      }).toThrow("test error");

      expect(myHook.current).toBe(0);
    });

    it("should support nested hook.use calls", () => {
      const myHook = hook(0);

      hook.use([myHook(() => 1)], () => {
        expect(myHook.current).toBe(1);

        hook.use([myHook(() => 2)], () => {
          expect(myHook.current).toBe(2);
        });

        expect(myHook.current).toBe(1);
      });

      expect(myHook.current).toBe(0);
    });

    it("should release hooks in reverse order", () => {
      const order: string[] = [];
      const hookA = hook<string | undefined>();
      const hookB = hook<string | undefined>();

      // Create custom setups that track release order
      const setupA = () => {
        hookA.current = "A";
        return () => {
          order.push("release A");
          hookA.current = undefined;
        };
      };

      const setupB = () => {
        hookB.current = "B";
        return () => {
          order.push("release B");
          hookB.current = undefined;
        };
      };

      hook.use([setupA, setupB], () => {
        expect(hookA.current).toBe("A");
        expect(hookB.current).toBe("B");
      });

      expect(order).toEqual(["release B", "release A"]);
    });

    it("should work with empty setups array", () => {
      const result = hook.use([], () => "result");
      expect(result).toBe("result");
    });

    it("should return the function result", () => {
      const myHook = hook(0);
      const result = hook.use([myHook(() => 1)], () => {
        return { value: myHook.current };
      });
      expect(result).toEqual({ value: 1 });
    });

    it("should support reducer composition in hook.use", () => {
      const myHook = hook(10);

      hook.use([myHook((prev) => prev + 5)], () => {
        expect(myHook.current).toBe(15);
      });

      expect(myHook.current).toBe(10);
    });
  });
});
