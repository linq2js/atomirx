import { describe, it, expect } from "vitest";
import {
  atom,
  batch,
  define,
  derived,
  effect,
  emitter,
  isAtom,
  isDerived,
  select,
  getAtomState,
  isPending,
} from "./index";

describe("atomirx exports", () => {
  it("should export atom", () => {
    expect(typeof atom).toBe("function");
    const count = atom(0);
    expect(count.get()).toBe(0);
  });

  it("should export batch", () => {
    expect(typeof batch).toBe("function");
  });

  it("should export define", () => {
    expect(typeof define).toBe("function");
  });

  it("should export derived", async () => {
    expect(typeof derived).toBe("function");
    const count = atom(5);
    const doubled = derived(({ read }) => read(count) * 2);
    expect(await doubled.get()).toBe(10);
  });

  it("should export effect", () => {
    expect(typeof effect).toBe("function");
  });

  it("should export emitter", () => {
    expect(typeof emitter).toBe("function");
  });

  it("should export isAtom", () => {
    expect(typeof isAtom).toBe("function");
    const count = atom(0);
    expect(isAtom(count)).toBe(true);
    expect(isAtom({})).toBe(false);
  });

  it("should export isDerived", () => {
    expect(typeof isDerived).toBe("function");
    const count = atom(0);
    const doubled = derived(({ read }) => read(count) * 2);
    expect(isDerived(count)).toBe(false);
    expect(isDerived(doubled)).toBe(true);
  });

  it("should export select", () => {
    expect(typeof select).toBe("function");
  });

  it("should export getAtomState", () => {
    expect(typeof getAtomState).toBe("function");
    const count = atom(42);
    const state = getAtomState(count);
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.value).toBe(42);
    }
  });

  it("should export isPending", () => {
    expect(typeof isPending).toBe("function");
    expect(isPending(42)).toBe(false);
    expect(isPending(new Promise(() => {}))).toBe(true);
  });
});
