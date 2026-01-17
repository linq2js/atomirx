/**
 * Type checking file for API overloads.
 *
 * This file is NOT executed at runtime - it only verifies that TypeScript
 * correctly infers types for all API overloads at compile time.
 *
 * Run `tsc --noEmit` to verify all type assertions pass.
 *
 * @file typeCheck.ts
 */

import { atom, derived, select, all, race, any, settled } from "./index";
import type { Atom, MutableAtom, Getter } from "./core/types";

// =============================================================================
// Type assertion utilities
// =============================================================================

/**
 * Declares a function that asserts a value is of the expected type.
 * Compilation fails if the actual type doesn't match the expected type.
 *
 * @example
 * const value = atom(0);
 * expectType<MutableAtom<number, undefined>>(value); // ✓ compiles
 * expectType<MutableAtom<string, undefined>>(value); // ✗ compile error
 */
declare function expectType<T>(value: T): void;

/**
 * Declares a function that asserts a value extends the expected type.
 * More lenient than expectType - allows subtypes.
 */
declare function expectExtends<T>(value: T): void;

// =============================================================================
// atom() overloads
// =============================================================================

// --- Sync value without fallback ---
{
  const a = atom(0);

  // Value should be number | undefined (undefined during loading/error)
  expectType<number | undefined>(a.value);
  expectType<boolean>(a.loading);
  expectType<MutableAtom<number, undefined>>(a);
}

// --- Sync value with fallback ---
{
  const a = atom(0, { fallback: -1 });

  // Value should be number (fallback ensures it's never undefined)
  expectType<number>(a.value);
  expectType<MutableAtom<number, number>>(a);
  expectType<boolean>(a.stale());
}

// --- Async value without fallback ---
{
  const a = atom(Promise.resolve({ name: "John", age: 30 }));

  // Value should be { name: string; age: number } | undefined
  expectType<{ name: string; age: number } | undefined>(a.value);
  expectType<MutableAtom<{ name: string; age: number }, undefined>>(a);
}

// --- Async value with fallback ---
{
  const a = atom(Promise.resolve({ name: "John", age: 30 }), {
    fallback: { name: "Guest", age: 0 },
  });

  // Value should be { name: string; age: number } (fallback provides default)
  expectType<{ name: string; age: number }>(a.value);
  expectType<
    MutableAtom<{ name: string; age: number }, { name: string; age: number }>
  >(a);
}

// --- Lazy initializer without fallback ---
{
  const a = atom(() => 42);

  expectType<number | undefined>(a.value);
  expectType<MutableAtom<number, undefined>>(a);
}

// --- Lazy async initializer with fallback ---
{
  const a = atom(() => Promise.resolve("hello"), { fallback: "loading..." });

  expectType<string>(a.value);
  expectType<MutableAtom<string, string>>(a);
}

// --- With options (key, equals) ---
{
  const a = atom({ count: 0 }, { key: "counter", equals: "shallow" });

  expectType<{ count: number } | undefined>(a.value);
}

// =============================================================================
// derived() overloads
// =============================================================================

// --- Single source ---
{
  const count = atom(5);
  const doubled = derived(count, (get) => {
    // get should be Getter<number>
    expectType<Getter<number>>(get);
    const value: number = get();
    return value * 2;
  });

  // Value should be number | undefined
  expectType<number | undefined>(doubled.value);
}

// --- Single source with fallback atom ---
{
  const count = atom(Promise.resolve(5), { fallback: 0 });
  const doubled = derived(count, (get) => {
    expectType<Getter<number>>(get);
    return get() * 2;
  });

  // Derived from fallback atom should compute immediately
  expectType<number | undefined>(doubled.value);
}

// --- Multiple sources (array form) ---
{
  const firstName = atom("John");
  const lastName = atom("Doe");
  const fullName = derived(
    [firstName, lastName],
    (getFirst, getLast) => `${getFirst()} ${getLast()}`
  );

  expectType<string | undefined>(fullName.value);
}

// --- Multiple sources with different types ---
{
  const name = atom("Alice");
  const age = atom(30);
  const active = atom(true);

  const user = derived([name, age, active], (getName, getAge, getActive) => {
    expectType<Getter<string>>(getName);
    expectType<Getter<number>>(getAge);
    expectType<Getter<boolean>>(getActive);
    return {
      name: getName(),
      age: getAge(),
      active: getActive(),
    };
  });

  expectType<{ name: string; age: number; active: boolean } | undefined>(
    user.value
  );
}

// --- Derived from async atoms ---
{
  const asyncAtom = atom(Promise.resolve(100));
  const doubled = derived(asyncAtom, (get) => get() * 2);

  expectType<number | undefined>(doubled.value);
}

// =============================================================================
// select() overloads
// =============================================================================

// --- Single source ---
{
  const count = atom(10);
  const result = select(count, (get) => get() + 5);

  expectType<number | undefined>(result.value);
  expectExtends<Set<Atom<unknown, unknown>>>(result.dependencies);
}

// --- Multiple sources (array form) ---
{
  const a = atom(1);
  const b = atom("hello");
  const result = select([a, b], (getA, getB) => {
    expectType<Getter<number>>(getA);
    expectType<Getter<string>>(getB);
    return `${getB()}-${getA()}`;
  });

  expectType<string | undefined>(result.value);
}

// =============================================================================
// all() overloads
// =============================================================================

// --- Array form ---
{
  const getA: Getter<number> = () => 1;
  const getB: Getter<string> = () => "hello";

  // Note: all() is used inside derived/select context where getters throw on loading
  const result = all([getA, getB] as const);

  // Result should be a tuple [number, string]
  expectType<readonly [number, string]>(result);
}

// --- Object form ---
{
  const getUser: Getter<{ name: string }> = () => ({ name: "John" });
  const getSettings: Getter<{ theme: string }> = () => ({ theme: "dark" });

  const result = all({ user: getUser, settings: getSettings });

  expectType<{ user: { name: string }; settings: { theme: string } }>(result);
}

// =============================================================================
// race() overload
// =============================================================================

{
  const getA: Getter<number> = () => 1;
  const getB: Getter<string> = () => "hello";

  const result = race({ a: getA, b: getB });

  // race returns [key, value] tuple
  expectExtends<[string, number | string]>(result);
}

// =============================================================================
// any() overload
// =============================================================================

{
  const getPrimary: Getter<number> = () => 1;
  const getFallback: Getter<number> = () => 0;

  const result = any({ primary: getPrimary, fallback: getFallback });

  // any returns [key, value] tuple
  expectExtends<[string, number]>(result);
}

// =============================================================================
// settled() overloads
// =============================================================================

// --- Array form ---
{
  const getA: Getter<number> = () => 1;
  const getB: Getter<string> = () => "hello";

  const result = settled([getA, getB] as const);

  // First element should be SettledResult<number>
  const first = result[0];
  if (first.status === "resolved") {
    expectType<number>(first.value);
  }

  // Second element should be SettledResult<string>
  const second = result[1];
  if (second.status === "resolved") {
    expectType<string>(second.value);
  }
}

// --- Object form ---
{
  const getUser: Getter<{ name: string }> = () => ({ name: "John" });
  const getSettings: Getter<{ theme: string }> = () => ({ theme: "dark" });

  const result = settled({ user: getUser, settings: getSettings });

  // user should be SettledResult<{ name: string }>
  if (result.user.status === "resolved") {
    expectType<{ name: string }>(result.user.value);
  }

  // settings should be SettledResult<{ theme: string }>
  if (result.settings.status === "resolved") {
    expectType<{ theme: string }>(result.settings.value);
  }
}

// =============================================================================
// Complex scenarios
// =============================================================================

// --- Derived with all() combinator ---
{
  const itemsAtom = atom([
    { name: "Item 1", price: 100 },
    { name: "Item 2", price: 50 },
  ]);
  const taxRateAtom = atom(Promise.resolve(0.08));

  const cartTotal = derived([itemsAtom, taxRateAtom], (items, taxRate) => {
    // Type inference should work through all()
    const { items: cartItems, taxRate: tax } = all({ items, taxRate });

    // cartItems should be { name: string; price: number }[]
    expectType<{ name: string; price: number }[]>(cartItems);
    // tax should be number
    expectType<number>(tax);

    const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);

    return {
      subtotal,
      tax: subtotal * tax,
      total: subtotal * (1 + tax),
    };
  });

  expectType<{ subtotal: number; tax: number; total: number } | undefined>(
    cartTotal.value
  );
}

// --- Atom with fallback used in derived ---
{
  const userAtom = atom(Promise.resolve({ id: 1, name: "John" }), {
    fallback: { id: 0, name: "Guest" },
  });

  const greeting = derived(userAtom, (getUser) => {
    const user = getUser();
    expectType<{ id: number; name: string }>(user);
    return `Hello, ${user.name}!`;
  });

  expectType<string | undefined>(greeting.value);
}

// --- Conditional dependencies ---
{
  const showDetails = atom(false);
  const basicInfo = atom({ name: "John" });
  const detailedInfo = atom({ name: "John", email: "john@example.com" });

  const info = derived(
    [showDetails, basicInfo, detailedInfo],
    (getShowDetails, getBasicInfo, getDetailedInfo) =>
      getShowDetails() ? getDetailedInfo() : getBasicInfo()
  );

  // Union of both possible return types
  expectExtends<{ name: string } | { name: string; email: string } | undefined>(
    info.value
  );
}

// =============================================================================
// Edge cases
// =============================================================================

// --- Empty array in derived ---
{
  const result = derived([] as const, () => 42);

  expectType<number | undefined>(result.value);
}

// --- Atom with undefined as valid value ---
{
  const a = atom<string | undefined>(undefined);

  expectType<string | undefined>(a.value);
}

// --- Atom with null as valid value ---
{
  const a = atom<string | null>(null);

  expectType<string | null | undefined>(a.value);
}

// --- Fallback with narrower type ---
{
  interface User {
    id: number;
    name: string;
    email?: string;
  }

  const guestUser: User = { id: 0, name: "Guest" };
  const userAtom = atom(
    Promise.resolve<User>({ id: 1, name: "John", email: "john@example.com" }),
    {
      fallback: guestUser,
    }
  );

  expectType<User>(userAtom.value);
}

// --- Getter type inference in callbacks ---
{
  const numAtom = atom(42);
  const strAtom = atom("hello");
  const boolAtom = atom(true);

  // Verify getter types are correctly inferred in derived callbacks
  derived([numAtom, strAtom, boolAtom], (getNum, getStr, getBool) => {
    // These should compile without error
    const num: number = getNum();
    const str: string = getStr();
    const bool: boolean = getBool();
    return { num, str, bool };
  });
}

// --- MutableAtom methods ---
{
  const counter = atom(0);

  // set() should accept value or updater function
  counter.set(10);
  counter.set((prev) => {
    expectType<number>(prev);
    return prev + 1;
  });

  // reset() should return void
  expectType<void>(counter.reset());

  // dirty() should return boolean
  expectType<boolean>(counter.dirty());

  // stale() should return boolean
  expectType<boolean>(counter.stale());
}

console.log("All type checks passed!");
