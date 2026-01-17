import { describe, it, expect } from "vitest";
import { atom, batch, define, derived, emitter, isAtom } from "./index";

describe("atomirx exports", () => {
  it("should export atom", () => {
    expect(typeof atom).toBe("function");
    const count = atom(0);
    expect(count.value).toBe(0);
  });

  it("should export batch", () => {
    expect(typeof batch).toBe("function");
  });

  it("should export define", () => {
    expect(typeof define).toBe("function");
  });

  it("should export derived", () => {
    expect(typeof derived).toBe("function");
    const count = atom(5);
    const doubled = derived(count, (get) => get() * 2);
    expect(doubled.value).toBe(10);
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
});
