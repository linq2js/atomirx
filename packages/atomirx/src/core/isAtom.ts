import { Atom, SYMBOL_ATOM } from "./types";

export function isAtom<T>(value: any): value is Atom<T> {
  return value && typeof value === "object" && value[SYMBOL_ATOM] === true;
}
