import { Atom, DerivedAtom, SYMBOL_ATOM, SYMBOL_DERIVED } from "./types";

/**
 * Type guard to check if a value is an Atom.
 */
export function isAtom<T>(value: unknown): value is Atom<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_ATOM in value &&
    (value as Atom<T>)[SYMBOL_ATOM] === true
  );
}

/**
 * Type guard to check if a value is a DerivedAtom.
 */
export function isDerived<T>(
  value: unknown
): value is DerivedAtom<T, boolean> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_DERIVED in value &&
    (value as DerivedAtom<T, boolean>)[SYMBOL_DERIVED] === true
  );
}
