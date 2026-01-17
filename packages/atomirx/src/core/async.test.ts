import { describe, it, expect } from "vitest";
import {
  race,
  all,
  any,
  settled,
  getterStatus,
  AllGettersRejectedError,
} from "./async";
import { atom } from "./atom";
import { derived } from "./derived";
import { Getter } from "./types";

/**
 * Helper to create a getter from an atom
 */
const createGetter = <T>(a: ReturnType<typeof atom<T>>): Getter<T> => {
  return () => {
    if (a.loading) {
      throw a; // Atom is PromiseLike
    }
    if (a.error !== undefined) {
      throw a.error;
    }
    return a.value as T;
  };
};

/**
 * Helper to create a resolved getter
 */
const resolvedGetter =
  <T>(value: T): Getter<T> =>
  () =>
    value;

/**
 * Helper to create a rejected getter
 */
const rejectedGetter =
  (error: Error): Getter<never> =>
  () => {
    throw error;
  };

/**
 * Helper to create a loading getter
 */
const loadingGetter =
  <T>(promise: PromiseLike<T>): Getter<T> =>
  () => {
    throw promise;
  };

describe("async combinators", () => {
  describe("race", () => {
    it("should return first resolved value as tuple [key, value]", () => {
      const getters = {
        a: resolvedGetter(1),
        b: resolvedGetter(2),
      };

      const result = race(getters);
      expect(result).toEqual(["a", 1]);
    });

    it("should return first resolved even if others are loading", () => {
      const pending = new Promise<number>(() => {});
      const getters = {
        loading1: loadingGetter<number>(pending),
        resolved: resolvedGetter(42),
        loading2: loadingGetter<number>(pending),
      };

      const result = race(getters);
      expect(result).toEqual(["resolved", 42]);
    });

    it("should throw error if first settled is error", () => {
      const pending = new Promise<number>(() => {});
      const error = new Error("Failed");
      const getters = {
        loading: loadingGetter<number>(pending),
        failed: rejectedGetter(error),
      };

      expect(() => race(getters)).toThrow(error);
    });

    it("should throw combined promise if all are loading", () => {
      const promise1 = new Promise<number>(() => {});
      const promise2 = new Promise<number>(() => {});
      const getters = {
        a: loadingGetter(promise1),
        b: loadingGetter(promise2),
      };

      expect(() => race(getters)).toThrow();
      try {
        race(getters);
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Promise);
      }
    });

    it("should work with real atoms", async () => {
      const a = atom(Promise.resolve(1));
      const b = atom(Promise.resolve(2));

      // Initially loading
      expect(() => race({ a: createGetter(a), b: createGetter(b) })).toThrow();

      // Wait for first to resolve
      await a;

      const result = race({ a: createGetter(a), b: createGetter(b) });
      expect(result).toEqual(["a", 1]);
    });

    it("should return undefined for empty input", () => {
      const result = race({});
      expect(result).toBeUndefined();
    });
  });

  describe("all", () => {
    it("should return object with all values when all resolved", () => {
      const getters = {
        a: resolvedGetter(1),
        b: resolvedGetter("hello"),
        c: resolvedGetter(true),
      };

      const result = all(getters);
      expect(result).toEqual({ a: 1, b: "hello", c: true });
    });

    it("should throw promise if any is loading", () => {
      const pending = new Promise<number>(() => {});
      const getters = {
        a: resolvedGetter(1),
        b: loadingGetter(pending),
      };

      expect(() => all(getters)).toThrow();
      try {
        all(getters);
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Promise);
      }
    });

    it("should throw error if any has error", () => {
      const error = new Error("Failed");
      const getters = {
        a: resolvedGetter(1),
        b: rejectedGetter(error),
      };

      expect(() => all(getters)).toThrow(error);
    });

    it("should throw first error encountered", () => {
      const error1 = new Error("First error");
      const error2 = new Error("Second error");
      const getters = {
        a: rejectedGetter(error1),
        b: rejectedGetter(error2),
      };

      expect(() => all(getters)).toThrow(error1);
    });

    it("should return empty object for empty input", () => {
      const result = all({});
      expect(result).toEqual({});
    });

    it("should work with real atoms", async () => {
      const a = atom(Promise.resolve(1));
      const b = atom(Promise.resolve(2));

      // Initially loading
      expect(() => all({ a: createGetter(a), b: createGetter(b) })).toThrow();

      // Wait for all
      await Promise.all([a, b]);

      const result = all({ a: createGetter(a), b: createGetter(b) });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it("should combine all loading promises", async () => {
      let resolve1: (v: number) => void;
      let resolve2: (v: number) => void;
      const promise1 = new Promise<number>((r) => (resolve1 = r));
      const promise2 = new Promise<number>((r) => (resolve2 = r));

      const getters = {
        a: loadingGetter(promise1),
        b: loadingGetter(promise2),
      };

      let thrown: unknown;
      try {
        all(getters);
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(Promise);

      // The combined promise should resolve when all resolve
      resolve1!(1);
      resolve2!(2);
      await thrown;
    });

    it("should prioritize errors over loading", () => {
      const pending = new Promise<number>(() => {});
      const error = new Error("Error");

      const getters = {
        loading: loadingGetter(pending),
        failed: rejectedGetter(error),
        resolved: resolvedGetter(42),
      };

      // all should throw error immediately if any has error
      expect(() => all(getters)).toThrow(error);
    });
  });

  describe("any", () => {
    it("should return first resolved value as tuple [key, value]", () => {
      const getters = {
        a: resolvedGetter(1),
        b: resolvedGetter(2),
      };

      const result = any(getters);
      expect(result).toEqual(["a", 1]);
    });

    it("should skip errors and return first resolved as tuple", () => {
      const error = new Error("Failed");
      const getters = {
        failed: rejectedGetter(error),
        success: resolvedGetter(42),
      };

      const result = any(getters);
      expect(result).toEqual(["success", 42]);
    });

    it("should skip loading and return first resolved", () => {
      const pending = new Promise<number>(() => {});
      const getters = {
        loading: loadingGetter(pending),
        resolved: resolvedGetter(42),
      };

      const result = any(getters);
      expect(result).toEqual(["resolved", 42]);
    });

    it("should throw AllGettersRejectedError if all have errors", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      const getters = {
        a: rejectedGetter(error1),
        b: rejectedGetter(error2),
      };

      expect(() => any(getters)).toThrow(AllGettersRejectedError);
      try {
        any(getters);
      } catch (e) {
        expect((e as AllGettersRejectedError).errors).toEqual({
          a: error1,
          b: error2,
        });
      }
    });

    it("should throw promise if all are loading", () => {
      const promise1 = new Promise<number>(() => {});
      const promise2 = new Promise<number>(() => {});
      const getters = {
        a: loadingGetter(promise1),
        b: loadingGetter(promise2),
      };

      expect(() => any(getters)).toThrow();
      try {
        any(getters);
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Promise);
      }
    });

    it("should throw promise if some loading and rest errored", () => {
      const pending = new Promise<number>(() => {});
      const error = new Error("Failed");
      const getters = {
        loading: loadingGetter(pending),
        failed: rejectedGetter(error),
      };

      expect(() => any(getters)).toThrow();
      try {
        any(getters);
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Promise);
      }
    });

    it("should throw AllGettersRejectedError for empty input", () => {
      expect(() => any({})).toThrow(AllGettersRejectedError);
    });

    it("should continue searching after errors", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");

      const getters = {
        a: rejectedGetter(error1),
        b: rejectedGetter(error2),
        c: resolvedGetter(42),
      };

      const result = any(getters);
      expect(result).toEqual(["c", 42]);
    });
  });

  describe("settled", () => {
    it("should return object with all statuses", () => {
      const error = new Error("Failed");
      const getters = {
        success: resolvedGetter(42),
        failure: rejectedGetter(error),
      };

      const result = settled(getters);
      expect(result).toEqual({
        success: { status: "resolved", value: 42 },
        failure: { status: "rejected", error },
      });
    });

    it("should throw promise if any is loading", () => {
      const pending = new Promise<number>(() => {});
      const getters = {
        resolved: resolvedGetter(1),
        loading: loadingGetter(pending),
      };

      expect(() => settled(getters)).toThrow();
      try {
        settled(getters);
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Promise);
      }
    });

    it("should return empty object for empty input", () => {
      const result = settled({});
      expect(result).toEqual({});
    });

    it("should work with all resolved", () => {
      const getters = {
        a: resolvedGetter(1),
        b: resolvedGetter(2),
      };

      const result = settled(getters);
      expect(result).toEqual({
        a: { status: "resolved", value: 1 },
        b: { status: "resolved", value: 2 },
      });
    });

    it("should work with all rejected", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      const getters = {
        a: rejectedGetter(error1),
        b: rejectedGetter(error2),
      };

      const result = settled(getters);
      expect(result).toEqual({
        a: { status: "rejected", error: error1 },
        b: { status: "rejected", error: error2 },
      });
    });

    it("should collect all errors without throwing", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");

      const getters = {
        a: rejectedGetter(error1),
        b: resolvedGetter(42),
        c: rejectedGetter(error2),
      };

      const result = settled(getters);
      expect(result).toEqual({
        a: { status: "rejected", error: error1 },
        b: { status: "resolved", value: 42 },
        c: { status: "rejected", error: error2 },
      });
    });
  });

  describe("getterStatus helper", () => {
    it("should detect resolved status", () => {
      const getter = resolvedGetter(42);
      const status = getterStatus(getter);

      expect(status.status).toBe("resolved");
      expect(status.value).toBe(42);
      expect(status.error).toBeUndefined();
      expect(status.promise).toBeUndefined();
    });

    it("should detect rejected status", () => {
      const error = new Error("Failed");
      const getter = rejectedGetter(error);
      const status = getterStatus(getter);

      expect(status.status).toBe("rejected");
      expect(status.value).toBeUndefined();
      expect(status.error).toBe(error);
      expect(status.promise).toBeUndefined();
    });

    it("should detect loading status", () => {
      const promise = new Promise<number>(() => {});
      const getter = loadingGetter(promise);
      const status = getterStatus(getter);

      expect(status.status).toBe("loading");
      expect(status.value).toBeUndefined();
      expect(status.error).toBeUndefined();
      expect(status.promise).toBe(promise);
    });
  });

  describe("edge cases", () => {
    it("race should handle mixed states correctly", () => {
      const pending = new Promise<number>(() => {});
      const error = new Error("Error");

      // Loading, Error, Resolved - error comes before resolved in iteration
      const getters1 = {
        loading: loadingGetter<number>(pending),
        failed: rejectedGetter(error),
        resolved: resolvedGetter(42),
      };
      expect(() => race(getters1)).toThrow(error);

      // Loading, Resolved, Error - resolved comes before error
      const getters2 = {
        loading: loadingGetter<number>(pending),
        resolved: resolvedGetter(42),
        failed: rejectedGetter(error),
      };
      expect(race(getters2)).toEqual(["resolved", 42]);
    });
  });

  describe("using all/race inside derived computation", () => {
    it("all inside derived should work with sync atoms", () => {
      const priceAtom = atom(100);
      const discountAtom = atom(0.2);

      const finalPriceAtom = derived(
        [priceAtom, discountAtom],
        (price, discount) => {
          const { price: p, discount: d } = all({ price, discount });
          return p * (1 - d);
        }
      );

      expect(finalPriceAtom.loading).toBe(false);
      expect(finalPriceAtom.value).toBe(80);
    });

    it("all inside derived should be loading when any source is pending", async () => {
      const priceAtom = atom(100);
      const discountAtom = atom(Promise.resolve(0.2));

      const finalPriceAtom = derived(
        [priceAtom, discountAtom],
        (price, discount) => {
          const { price: p, discount: d } = all({ price, discount });
          return p * (1 - d);
        }
      );

      // Initially loading because discountAtom is pending
      expect(finalPriceAtom.loading).toBe(true);
      expect(finalPriceAtom.value).toBeUndefined();

      // Wait for discount to resolve
      await discountAtom;

      expect(finalPriceAtom.loading).toBe(false);
      expect(finalPriceAtom.value).toBe(80);
    });

    it("all inside derived should propagate errors", async () => {
      const error = new Error("Discount fetch failed");
      let reject: (e: Error) => void;
      const priceAtom = atom(100);
      const discountAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );

      const finalPriceAtom = derived(
        [priceAtom, discountAtom],
        (price, discount) => {
          const { price: p, discount: d } = all({ price, discount });
          return p * (1 - d);
        }
      );

      // Initially loading
      expect(finalPriceAtom.loading).toBe(true);

      // Trigger rejection
      discountAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(finalPriceAtom.loading).toBe(false);
      expect(finalPriceAtom.error).toBe(error);
    });

    it("race inside derived should return first resolved", () => {
      const primaryPriceAtom = atom(100);
      const fallbackPriceAtom = atom(90);

      const priceAtom = derived(
        [primaryPriceAtom, fallbackPriceAtom],
        (primary, fallback) => {
          const [, value] = race({ primary, fallback });
          return value;
        }
      );

      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toBe(100);
    });

    it("race inside derived should skip loading sources", async () => {
      const primaryPriceAtom = atom(Promise.resolve(100)); // pending
      const fallbackPriceAtom = atom(90); // resolved

      const priceAtom = derived(
        [primaryPriceAtom, fallbackPriceAtom],
        (primary, fallback) => {
          const [winner, value] = race({ primary, fallback });
          return { source: winner, price: value };
        }
      );

      // fallback is resolved, so race returns it immediately
      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toEqual({ source: "fallback", price: 90 });
    });

    it("race inside derived should be loading when all sources are pending", async () => {
      const primaryPriceAtom = atom(Promise.resolve(100));
      const fallbackPriceAtom = atom(Promise.resolve(90));

      const priceAtom = derived(
        [primaryPriceAtom, fallbackPriceAtom],
        (primary, fallback) => {
          const [winner, value] = race({ primary, fallback });
          return { source: winner, price: value };
        }
      );

      // Both are pending, so derived is loading
      expect(priceAtom.loading).toBe(true);

      // Wait for both to resolve
      await Promise.all([primaryPriceAtom, fallbackPriceAtom]);

      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toEqual({ source: "primary", price: 100 });
    });

    it("any inside derived should skip errors and return first resolved", async () => {
      const error = new Error("Primary failed");
      let reject: (e: Error) => void;
      const primaryAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );
      const fallbackAtom = atom(90);

      const priceAtom = derived(
        [primaryAtom, fallbackAtom],
        (primary, fallback) => {
          const [winner, value] = any({ primary, fallback });
          return { source: winner, price: value };
        }
      );

      // fallback is resolved, any returns it (skips pending primary)
      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toEqual({ source: "fallback", price: 90 });

      // Even after primary rejects, result is the same
      primaryAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(priceAtom.value).toEqual({ source: "fallback", price: 90 });
    });

    it("settled inside derived should return all statuses", async () => {
      const error = new Error("Failed");
      let reject: (e: Error) => void;
      const successAtom = atom(100);
      const failingAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );

      const statusAtom = derived(
        [successAtom, failingAtom],
        (success, failing) => {
          return settled({ success, failing });
        }
      );

      // Initially loading because failingAtom is pending
      expect(statusAtom.loading).toBe(true);

      // Trigger rejection
      failingAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(statusAtom.loading).toBe(false);
      expect(statusAtom.value).toEqual({
        success: { status: "resolved", value: 100 },
        failing: { status: "rejected", error },
      });
    });

    it("derived with all should update when source atoms change", async () => {
      const priceAtom = atom(100);
      const discountAtom = atom(0.1);

      const finalPriceAtom = derived(
        [priceAtom, discountAtom],
        (price, discount) => {
          const { price: p, discount: d } = all({ price, discount });
          return p * (1 - d);
        }
      );

      expect(finalPriceAtom.value).toBe(90);

      // Update price
      priceAtom.set(200);
      expect(finalPriceAtom.value).toBe(180);

      // Update discount
      discountAtom.set(0.5);
      expect(finalPriceAtom.value).toBe(100);
    });

    it("complex example: cart total with async tax rate", async () => {
      const itemsAtom = atom([
        { name: "Item 1", price: 100 },
        { name: "Item 2", price: 50 },
      ]);
      const taxRateAtom = atom(Promise.resolve(0.08));

      const cartTotalAtom = derived(
        [itemsAtom, taxRateAtom],
        (items, taxRate) => {
          const { items: cartItems, taxRate: tax } = all({ items, taxRate });
          const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
          return {
            subtotal,
            tax: subtotal * tax,
            total: subtotal * (1 + tax),
          };
        }
      );

      // Initially loading
      expect(cartTotalAtom.loading).toBe(true);

      // Wait for tax rate
      await taxRateAtom;

      expect(cartTotalAtom.loading).toBe(false);
      expect(cartTotalAtom.value).toEqual({
        subtotal: 150,
        tax: 12,
        total: 162,
      });

      // Update items
      itemsAtom.set([
        { name: "Item 1", price: 100 },
        { name: "Item 2", price: 50 },
        { name: "Item 3", price: 25 },
      ]);

      expect(cartTotalAtom.value).toEqual({
        subtotal: 175,
        tax: 14,
        total: 189,
      });
    });

    // Array overload tests
    it("all with array inside derived should work with sync atoms", () => {
      const priceAtom = atom(100);
      const discountAtom = atom(0.2);

      const finalPriceAtom = derived(
        [priceAtom, discountAtom] as const,
        (price, discount) => {
          const [p, d] = all([price, discount]);
          return p * (1 - d);
        }
      );

      expect(finalPriceAtom.loading).toBe(false);
      expect(finalPriceAtom.value).toBe(80);
    });

    it("all with array inside derived should be loading when any source is pending", async () => {
      const priceAtom = atom(100);
      const discountAtom = atom(Promise.resolve(0.2));

      const finalPriceAtom = derived(
        [priceAtom, discountAtom] as const,
        (price, discount) => {
          const [p, d] = all([price, discount]);
          return p * (1 - d);
        }
      );

      // Initially loading because discountAtom is pending
      expect(finalPriceAtom.loading).toBe(true);
      expect(finalPriceAtom.value).toBeUndefined();

      // Wait for discount to resolve
      await discountAtom;

      expect(finalPriceAtom.loading).toBe(false);
      expect(finalPriceAtom.value).toBe(80);
    });

    it("all with array inside derived should propagate errors", async () => {
      const error = new Error("Discount fetch failed");
      let reject: (e: Error) => void;
      const priceAtom = atom(100);
      const discountAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );

      const finalPriceAtom = derived(
        [priceAtom, discountAtom] as const,
        (price, discount) => {
          const [p, d] = all([price, discount]);
          return p * (1 - d);
        }
      );

      // Initially loading
      expect(finalPriceAtom.loading).toBe(true);

      // Trigger rejection
      discountAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(finalPriceAtom.loading).toBe(false);
      expect(finalPriceAtom.error).toBe(error);
    });

    it("race with object inside derived (array source) should return first resolved", () => {
      const primaryPriceAtom = atom(100);
      const fallbackPriceAtom = atom(90);

      const priceAtom = derived(
        [primaryPriceAtom, fallbackPriceAtom] as const,
        (primary, fallback) => {
          const [, value] = race({ primary, fallback });
          return value;
        }
      );

      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toBe(100);
    });

    it("race with object inside derived (array source) should skip loading sources", async () => {
      const primaryPriceAtom = atom(Promise.resolve(100)); // pending
      const fallbackPriceAtom = atom(90); // resolved

      const priceAtom = derived(
        [primaryPriceAtom, fallbackPriceAtom] as const,
        (primary, fallback) => {
          const [, value] = race({ primary, fallback });
          return value;
        }
      );

      // fallback is resolved, so race returns it immediately
      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toBe(90);
    });

    it("any with object inside derived (array source) should skip errors", async () => {
      const error = new Error("Primary failed");
      let reject: (e: Error) => void;
      const primaryAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );
      const fallbackAtom = atom(90);

      const priceAtom = derived(
        [primaryAtom, fallbackAtom] as const,
        (primary, fallback) => {
          const [, value] = any({ primary, fallback });
          return value;
        }
      );

      // fallback is resolved, any returns it
      expect(priceAtom.loading).toBe(false);
      expect(priceAtom.value).toBe(90);

      // Even after primary rejects, result is the same
      primaryAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(priceAtom.value).toBe(90);
    });

    it("settled with array inside derived should return all statuses", async () => {
      const error = new Error("Failed");
      let reject: (e: Error) => void;
      const successAtom = atom(100);
      const failingAtom = atom(
        new Promise<number>((_, r) => {
          reject = r;
        })
      );

      const statusAtom = derived(
        [successAtom, failingAtom] as const,
        (success, failing) => {
          return settled([success, failing]);
        }
      );

      // Initially loading because failingAtom is pending
      expect(statusAtom.loading).toBe(true);

      // Trigger rejection
      failingAtom.loading;
      reject!(error);
      await new Promise((r) => setTimeout(r, 0));

      expect(statusAtom.loading).toBe(false);
      expect(statusAtom.value).toEqual([
        { status: "resolved", value: 100 },
        { status: "rejected", error },
      ]);
    });

    it("complex example with array: multiple prices with tax", async () => {
      const price1Atom = atom(100);
      const price2Atom = atom(Promise.resolve(50));
      const taxRateAtom = atom(0.1);

      const totalAtom = derived(
        [price1Atom, price2Atom, taxRateAtom] as const,
        (price1, price2, taxRate) => {
          const [p1, p2, tax] = all([price1, price2, taxRate]);
          const subtotal = p1 + p2;
          return {
            subtotal,
            tax: subtotal * tax,
            total: subtotal * (1 + tax),
          };
        }
      );

      // Initially loading
      expect(totalAtom.loading).toBe(true);

      // Wait for price2
      await price2Atom;

      expect(totalAtom.loading).toBe(false);
      expect(totalAtom.value).toEqual({
        subtotal: 150,
        tax: 15,
        total: 165,
      });
    });
  });
});
