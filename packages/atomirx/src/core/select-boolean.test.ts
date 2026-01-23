import { describe, it, expect, vi } from "vitest";
import { atom } from "./atom";
import { derived } from "./derived";

describe("SelectContext boolean operators", () => {
  describe("and()", () => {
    it("should return true when all atoms are truthy", async () => {
      const a$ = atom(true);
      const b$ = atom(1);
      const c$ = atom("hello");

      const result$ = derived(({ and }) => and([a$, b$, c$]));

      expect(await result$.get()).toBe(true);
    });

    it("should return false when any atom is falsy", async () => {
      const a$ = atom(true);
      const b$ = atom(0);
      const c$ = atom("hello");

      const result$ = derived(({ and }) => and([a$, b$, c$]));

      expect(await result$.get()).toBe(false);
    });

    it("should work with static booleans", async () => {
      const a$ = atom(true);

      const result1$ = derived(({ and }) => and([true, a$]));
      const result2$ = derived(({ and }) => and([false, a$]));

      expect(await result1$.get()).toBe(true);
      expect(await result2$.get()).toBe(false);
    });

    it("should short-circuit on falsy value (lazy not called)", async () => {
      const a$ = atom(false);
      const lazyFn = vi.fn(() => atom(true));

      const result$ = derived(({ and }) => and([a$, lazyFn]));

      expect(await result$.get()).toBe(false);
      expect(lazyFn).not.toHaveBeenCalled();
    });

    it("should call lazy function when previous conditions are truthy", async () => {
      const a$ = atom(true);
      const b$ = atom("value");
      const lazyFn = vi.fn(() => b$);

      const result$ = derived(({ and }) => and([a$, lazyFn]));

      expect(await result$.get()).toBe(true);
      expect(lazyFn).toHaveBeenCalledTimes(1);
    });

    it("should support lazy functions returning booleans", async () => {
      const a$ = atom(true);

      const result1$ = derived(({ and }) => and([a$, () => true]));
      const result2$ = derived(({ and }) => and([a$, () => false]));

      expect(await result1$.get()).toBe(true);
      expect(await result2$.get()).toBe(false);
    });

    it("should support nested and/or", async () => {
      const a$ = atom(true);
      const b$ = atom(false);
      const c$ = atom(true);

      // (a && b) || c = (true && false) || true = true
      const result$ = derived(({ and, or }) => or([and([a$, b$]), c$]));

      expect(await result$.get()).toBe(true);
    });

    it("should return true for empty array", async () => {
      const result$ = derived(({ and }) => and([]));

      expect(await result$.get()).toBe(true);
    });

    it("should recompute when atom changes", async () => {
      const a$ = atom(true);
      const b$ = atom(true);

      const result$ = derived(({ and }) => and([a$, b$]));

      expect(await result$.get()).toBe(true);

      a$.set(false);
      expect(await result$.get()).toBe(false);

      a$.set(true);
      expect(await result$.get()).toBe(true);
    });
  });

  describe("or()", () => {
    it("should return true when any atom is truthy", async () => {
      const a$ = atom(false);
      const b$ = atom(0);
      const c$ = atom("hello");

      const result$ = derived(({ or }) => or([a$, b$, c$]));

      expect(await result$.get()).toBe(true);
    });

    it("should return false when all atoms are falsy", async () => {
      const a$ = atom(false);
      const b$ = atom(0);
      const c$ = atom("");

      const result$ = derived(({ or }) => or([a$, b$, c$]));

      expect(await result$.get()).toBe(false);
    });

    it("should work with static booleans", async () => {
      const a$ = atom(false);

      const result1$ = derived(({ or }) => or([true, a$]));
      const result2$ = derived(({ or }) => or([false, a$]));

      expect(await result1$.get()).toBe(true);
      expect(await result2$.get()).toBe(false);
    });

    it("should short-circuit on truthy value (lazy not called)", async () => {
      const a$ = atom(true);
      const lazyFn = vi.fn(() => atom(false));

      const result$ = derived(({ or }) => or([a$, lazyFn]));

      expect(await result$.get()).toBe(true);
      expect(lazyFn).not.toHaveBeenCalled();
    });

    it("should call lazy function when previous conditions are falsy", async () => {
      const a$ = atom(false);
      const b$ = atom("value");
      const lazyFn = vi.fn(() => b$);

      const result$ = derived(({ or }) => or([a$, lazyFn]));

      expect(await result$.get()).toBe(true);
      expect(lazyFn).toHaveBeenCalledTimes(1);
    });

    it("should support lazy functions returning booleans", async () => {
      const a$ = atom(false);

      const result1$ = derived(({ or }) => or([a$, () => true]));
      const result2$ = derived(({ or }) => or([a$, () => false]));

      expect(await result1$.get()).toBe(true);
      expect(await result2$.get()).toBe(false);
    });

    it("should support nested and/or", async () => {
      const a$ = atom(false);
      const b$ = atom(true);
      const c$ = atom(true);

      // a || (b && c) = false || (true && true) = true
      const result$ = derived(({ and, or }) => or([a$, and([b$, c$])]));

      expect(await result$.get()).toBe(true);
    });

    it("should return false for empty array", async () => {
      const result$ = derived(({ or }) => or([]));

      expect(await result$.get()).toBe(false);
    });

    it("should recompute when atom changes", async () => {
      const a$ = atom(false);
      const b$ = atom(false);

      const result$ = derived(({ or }) => or([a$, b$]));

      expect(await result$.get()).toBe(false);

      a$.set(true);
      expect(await result$.get()).toBe(true);

      a$.set(false);
      expect(await result$.get()).toBe(false);
    });
  });

  describe("complex compositions", () => {
    it("should handle deeply nested conditions", async () => {
      const a$ = atom(true);
      const b$ = atom(false);
      const c$ = atom(true);
      const d$ = atom(true);

      // (a && (b || c)) && d = (true && (false || true)) && true = true
      const result$ = derived(({ and, or }) => and([a$, or([b$, c$]), d$]));

      expect(await result$.get()).toBe(true);
    });

    it("should handle mixed static and dynamic conditions", async () => {
      const feature = true; // Static config
      const isLoggedIn$ = atom(true);
      const hasPermission$ = atom(false);
      const isAdmin$ = atom(true);

      // feature && isLoggedIn && (hasPermission || isAdmin)
      const canAccess$ = derived(({ and, or }) =>
        and([feature, isLoggedIn$, or([hasPermission$, isAdmin$])])
      );

      expect(await canAccess$.get()).toBe(true);

      isAdmin$.set(false);
      expect(await canAccess$.get()).toBe(false);

      hasPermission$.set(true);
      expect(await canAccess$.get()).toBe(true);
    });

    it("should handle lazy fallback chain", async () => {
      const primary$ = atom<string | null>(null);
      const secondary$ = atom<string | null>(null);
      const fallback$ = atom<string | null>("fallback");

      const hasData$ = derived(({ or }) =>
        or([() => primary$, () => secondary$, () => fallback$])
      );

      expect(await hasData$.get()).toBe(true); // fallback is truthy

      primary$.set("primary");
      expect(await hasData$.get()).toBe(true);
    });

    it("should handle permission-like logic with lazy checks", async () => {
      const isLoggedIn$ = atom(false);
      const hasRole$ = atom(true);
      const checkCount = { value: 0 };

      const lazyRoleCheck = () => {
        checkCount.value++;
        return hasRole$;
      };

      const canAccess$ = derived(({ and }) =>
        and([isLoggedIn$, lazyRoleCheck])
      );

      // Not logged in - lazy check should not be called
      expect(await canAccess$.get()).toBe(false);
      expect(checkCount.value).toBe(0);

      // Now logged in - lazy check should be called
      isLoggedIn$.set(true);
      expect(await canAccess$.get()).toBe(true);
      expect(checkCount.value).toBe(1);
    });
  });
});
