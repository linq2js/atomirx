import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { atom } from "../core/atom";
import { derived } from "../core/derived";
import { effect } from "../core/effect";
import { pool } from "../core/pool";
import { define } from "../core/define";
import {
  setupDevtools,
  getDevtoolsRegistry,
  isDevtoolsEnabled,
  _resetDevtools,
} from "./setup";

describe("devtools", () => {
  beforeEach(() => {
    _resetDevtools();
  });

  afterEach(() => {
    _resetDevtools();
  });

  describe("setupDevtools", () => {
    it("should enable devtools and return cleanup function", () => {
      expect(isDevtoolsEnabled()).toBe(false);

      const cleanup = setupDevtools();

      expect(isDevtoolsEnabled()).toBe(true);
      expect(typeof cleanup).toBe("function");

      cleanup();

      expect(isDevtoolsEnabled()).toBe(false);
    });

    it("should return existing cleanup if already enabled", () => {
      const cleanup1 = setupDevtools();
      const cleanup2 = setupDevtools();

      expect(cleanup1).toBe(cleanup2);

      cleanup1();
    });
  });

  describe("registry", () => {
    it("should track mutable atoms", () => {
      setupDevtools();

      atom(0, { meta: { key: "count" } });

      const registry = getDevtoolsRegistry();
      expect(registry).not.toBeNull();

      const stats = registry!.getStats();
      expect(stats.mutableCount).toBe(1);
      expect(stats.totalCount).toBe(1);

      const atoms = registry!.getByType("mutable");
      expect(atoms.length).toBe(1);
      expect(atoms[0].key).toBe("count");
    });

    it("should track derived atoms", () => {
      const cleanup = setupDevtools();

      const count$ = atom(0);
      derived(({ read }) => read(count$) * 2, {
        meta: { key: "double" },
      });

      const registry = getDevtoolsRegistry();
      const stats = registry!.getStats();

      expect(stats.mutableCount).toBe(1);
      expect(stats.derivedCount).toBe(1);
      expect(stats.totalCount).toBe(2);

      cleanup();
    });

    it("should track effects", () => {
      const cleanup = setupDevtools();

      const count$ = atom(0);
      const eff = effect(
        ({ read }) => {
          read(count$);
        },
        { meta: { key: "logger" } }
      );

      const registry = getDevtoolsRegistry();
      const stats = registry!.getStats();

      expect(stats.effectCount).toBe(1);

      eff.dispose();
      cleanup();
    });

    it("should track pools", () => {
      const cleanup = setupDevtools();

      pool((id: string) => ({ id, name: `User ${id}` }), {
        gcTime: 60000,
        meta: { key: "userPool" },
      });

      const registry = getDevtoolsRegistry();
      const stats = registry!.getStats();

      expect(stats.poolCount).toBe(1);

      cleanup();
    });

    it("should track modules", () => {
      const cleanup = setupDevtools();

      const counterModule = define(
        () => {
          const count$ = atom(0);
          return {
            count$,
            increment: () => count$.set((n) => n + 1),
          };
        },
        { key: "counter" }
      );

      // Access the module to trigger creation
      counterModule();

      const registry = getDevtoolsRegistry();
      const stats = registry!.getStats();

      // Module + the atom inside it
      expect(stats.moduleCount).toBe(1);
      expect(stats.mutableCount).toBe(1);

      cleanup();
    });

    it("should track value changes in history", async () => {
      const cleanup = setupDevtools();

      const count$ = atom(0, { meta: { key: "count" } });

      count$.set(1);
      count$.set(2);
      count$.set(3);

      const registry = getDevtoolsRegistry();
      const atoms = registry!.getByType("mutable");
      const countInfo = atoms.find((a) => a.key === "count");

      expect(countInfo).toBeDefined();
      expect(countInfo!.changeCount).toBe(3);

      if (countInfo!.type === "mutable") {
        expect(countInfo!.history.length).toBe(3);
        expect(countInfo!.history[0].newValue).toBe("3");
        expect(countInfo!.history[0].previousValue).toBe("2");
      }

      cleanup();
    });

    it("should notify subscribers on changes", async () => {
      const cleanup = setupDevtools();
      const registry = getDevtoolsRegistry()!;

      const listener = vi.fn();
      const unsubscribe = registry.subscribe(listener);

      // Create an atom - should trigger notification (async via queueMicrotask)
      const count$ = atom(0);
      await new Promise<void>((r) => queueMicrotask(r));
      expect(listener).toHaveBeenCalled();

      // Change value - should trigger notification
      listener.mockClear();
      count$.set(1);
      await new Promise<void>((r) => queueMicrotask(r));
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      cleanup();
    });

    it("should clear registry", () => {
      const cleanup = setupDevtools();

      atom(0);
      atom(1);
      atom(2);

      const registry = getDevtoolsRegistry()!;
      expect(registry.getStats().totalCount).toBe(3);

      registry.clear();
      expect(registry.getStats().totalCount).toBe(0);

      cleanup();
    });

    it("should get entity by id", () => {
      const cleanup = setupDevtools();

      atom(0, { meta: { key: "testAtom" } });

      const registry = getDevtoolsRegistry()!;
      const atoms = registry.getByType("mutable");
      const atomInfo = atoms[0];

      const retrieved = registry.get(atomInfo.id);
      expect(retrieved).toBe(atomInfo);
      expect(retrieved?.key).toBe("testAtom");

      cleanup();
    });

    it("should filter entities by type", () => {
      const cleanup = setupDevtools();

      atom(0);
      atom(1);
      const count$ = atom(5);
      derived(({ read }) => read(count$) * 2);
      const eff = effect(({ read }) => {
        read(count$);
      });
      eff.dispose();

      const registry = getDevtoolsRegistry()!;

      expect(registry.getByType("mutable").length).toBe(3);
      expect(registry.getByType("derived").length).toBeGreaterThanOrEqual(1);
      expect(registry.getByType("effect").length).toBe(1);
      expect(registry.getByType("pool").length).toBe(0);

      cleanup();
    });
  });

  describe("getDevtoolsRegistry", () => {
    it("should return null when devtools not enabled", () => {
      expect(getDevtoolsRegistry()).toBeNull();
    });

    it("should return registry when devtools enabled", () => {
      const cleanup = setupDevtools();

      expect(getDevtoolsRegistry()).not.toBeNull();

      cleanup();
    });
  });
});
