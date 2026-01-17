/**
 * Generic function type that accepts any arguments and returns any value.
 * Used internally for type-safe function handling.
 */
export type AnyFunc = (...args: any[]) => any;

/**
 * Unique symbol used to identify atom instances.
 * Uses Symbol.for() to ensure the same symbol across different module instances.
 */
export const SYMBOL_ATOM = Symbol.for("atomirx.atom");

/**
 * Interface for objects that support the `.use()` plugin pattern.
 *
 * The `.use()` method enables chainable transformations via plugins.
 * Return type behavior:
 * - `void` → returns original source (side-effect only)
 * - Object with `.use` → returns as-is (already pipeable)
 * - Object without `.use` → wraps with Pipeable
 * - Primitive → returns directly (not chainable)
 *
 * @example
 * ```ts
 * const enhanced = atom(0)
 *   .use(source => ({ ...source, double: () => source.value * 2 }))
 *   .use(source => ({ ...source, triple: () => source.value * 3 }));
 * ```
 */
export interface Pipeable {
  use<TNew = void>(
    plugin: (source: this) => TNew
  ): void extends TNew
    ? this
    : TNew extends object
    ? TNew extends { use: any }
      ? TNew
      : Pipeable & TNew
    : TNew;
}

/**
 * Represents the possible states of an atom's value.
 *
 * An atom can be in one of three states:
 * 1. **Loading** - Waiting for async value (loading: true, value: TFallback)
 * 2. **Resolved** - Has a value (loading: false, value: T)
 * 3. **Error** - Failed to load (loading: false, value: TFallback, error: defined)
 *
 * When `fallback` option is provided, `TFallback` is the fallback type,
 * otherwise it's `undefined`.
 *
 * @template T - The type of the atom's value when resolved
 * @template TFallback - The type of the fallback value (default: undefined)
 */
export type AtomState<T, TFallback = undefined> =
  | {
      readonly loading: true;
      readonly value: TFallback;
      readonly error: undefined;
    }
  | {
      readonly loading: false;
      readonly value: T;
      readonly error: undefined;
    }
  | {
      readonly loading: false;
      readonly value: TFallback;
      readonly error: unknown;
    };

/**
 * A read-only reactive atom that holds a value and notifies subscribers on change.
 *
 * Atoms are the core primitive of atomirx. They:
 * - Hold a single value that can be sync or async
 * - Notify subscribers when the value changes
 * - Are thenable (can be awaited like a Promise)
 * - Have a unique symbol for type identification
 *
 * @template T - The type of value stored in the atom
 * @template TFallback - The type of the fallback value (default: undefined)
 *
 * @example
 * ```ts
 * const count: Atom<number> = atom(0);
 * console.log(count.value); // 0
 * count.on(() => console.log('changed!'));
 * await count; // Wait for async atoms
 * ```
 *
 * @example With fallback (never undefined)
 * ```ts
 * const user = atom(fetchUser(), { fallback: { name: 'Guest' } });
 * console.log(user.value); // { name: 'Guest' } during loading
 * console.log(user.stale()); // true during loading/error
 * ```
 */
export type Atom<T, TFallback = undefined> = NoInfer<
  AtomState<T, TFallback>
> & {
  /** Symbol marker to identify atom instances */
  readonly [SYMBOL_ATOM]: true;
  /** Optional identifier for debugging/devtools */
  readonly key: string | undefined;
  /** Optional metadata for the atom */
  readonly meta: AtomMeta | undefined;
  /**
   * Returns true if fallback mode is enabled AND atom is in loading or error state.
   * When stale() returns true, `value` returns the fallback or previous resolved value.
   */
  stale(): boolean;
  /**
   * Subscribe to value changes.
   * @param listener - Callback invoked when value changes
   * @returns Unsubscribe function
   */
  on(listener: VoidFunction): VoidFunction;
} & PromiseLike<T>;

/**
 * A mutable atom that can be updated via `set()` and reset to initial state.
 *
 * Extends the base Atom with mutation capabilities:
 * - `set()` - Update the value directly or via reducer
 * - `reset()` - Return to initial state
 * - `use()` - Plugin system for extensions
 *
 * @template T - The type of value stored in the atom
 * @template TFallback - The type of the fallback value (default: undefined)
 *
 * @example
 * ```ts
 * const count = atom(0);
 * count.set(5);           // Direct value
 * count.set(n => n + 1);  // Reducer function
 * count.reset();          // Back to 0
 * ```
 */
export type MutableAtom<T, TFallback = undefined> = Atom<T, TFallback> & {
  /** Reset atom to its initial state */
  reset(): void;
  /**
   * Update the atom's value.
   *
   * Accepts a direct value, a Promise, or a reducer function:
   * - Direct value: updates immediately
   * - Promise: enters loading state, resolves to value or error
   * - Reducer: computes new value from previous
   *
   * @param value - New value, Promise, or reducer function (prev) => newValue
   */
  set(
    value: Awaited<T> | PromiseLike<Awaited<T>> | ((prev: T) => Awaited<T>)
  ): void;
  /**
   * Returns true if the value has been changed by set() since creation or last reset().
   * Useful for tracking if the atom has been modified from its initial state.
   */
  dirty(): boolean;
} & Pipeable;

/**
 * Configuration options for creating an atom.
 *
 * @template T - The type of value stored in the atom
 */
export interface AtomOptions<T> {
  /** Optional identifier for debugging/devtools */
  key?: string;
  /** Equality strategy for change detection (default: "strict") */
  equals?: Equality<T>;
  /** Optional metadata for the atom */
  meta?: AtomMeta;
}

export interface DerivedOptions {
  meta?: AtomMeta;
}

/**
 * Reads values from multiple getters at once.
 *
 * @param getters - Array of getter functions
 * @returns Array of values in the same order
 *
 * @example
 * ```ts
 * const [a, b, c] = readAll([getA, getB, getC]);
 * ```
 */
export declare function readAll<const TGetters extends readonly Getter<any>[]>(
  getters: TGetters
): {
  [K in keyof TGetters]: ReturnType<TGetters[K]>;
};

/**
 * Reads values from a record of getters.
 *
 * @param getters - Object with getter functions as values
 * @returns Object with same keys and resolved values
 *
 * @example
 * ```ts
 * const { user, settings } = readAll({ user: getUser, settings: getSettings });
 * ```
 */
export declare function readAll<TGetters extends Record<string, Getter<any>>>(
  getters: TGetters
): {
  [K in keyof TGetters]: ReturnType<TGetters[K]>;
};

/**
 * A function that returns a value when called.
 * Used for lazy evaluation in derived atoms.
 *
 * @template T - The type of value returned
 */
export type Getter<T> = () => T;

/**
 * Type guard to check if a value is an Atom.
 *
 * @template T - Expected atom value type
 * @param value - Value to check
 * @returns True if value is an Atom
 *
 * @example
 * ```ts
 * if (isAtom(maybeAtom)) {
 *   console.log(maybeAtom.value);
 * }
 * ```
 */
export declare function isAtom<T>(value: any): value is Atom<T>;

/**
 * Built-in equality strategy names.
 *
 * Used with atoms to control when subscribers are notified:
 * - `"strict"` - Object.is (default, fastest)
 * - `"shallow"` - Compare object keys/array items with Object.is
 * - `"shallow2"` - 2 levels deep
 * - `"shallow3"` - 3 levels deep
 * - `"deep"` - Full recursive comparison (slowest)
 */
export type EqualityShorthand =
  | "strict"
  | "shallow"
  | "shallow2"
  | "shallow3"
  | "deep";

/**
 * Equality strategy for change detection.
 *
 * Can be a shorthand string or custom comparison function.
 * Used by atoms to determine if value has "changed" -
 * if equal, subscribers won't be notified.
 *
 * @template T - Type of values being compared
 *
 * @example
 * ```ts
 * // Using shorthand
 * const [user, setUser] = atom(data, { equals: "shallow" });
 *
 * // Using custom function
 * const [user, setUser] = atom(data, {
 *   equals: (a, b) => a.id === b.id
 * });
 * ```
 */
export type Equality<T = unknown> =
  | EqualityShorthand
  | ((a: T, b: T) => boolean);

/**
 * Prettify a type by adding all properties to the type.
 * @template T - The type to prettify
 * @returns The prettified type
 * @example
 * ```ts
 * type Person = { name: string; age: number };
 * type PrettifyPerson = Prettify<Person>; // { name: string; age: number; }
 * ```
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export interface AtomMeta {}

export interface ModuleMeta {}

export type Listener<T> = (value: T) => void;

export type SingleOrMultipleListeners<T> = Listener<T> | Listener<T>[];
