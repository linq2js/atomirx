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
 * Symbol to identify derived atoms.
 */
export const SYMBOL_DERIVED = Symbol.for("atomirx.derived");

/**
 * Symbol to identify virtual atoms (temporary wrappers for pool atoms).
 */
export const SYMBOL_VIRTUAL = Symbol.for("atomirx.virtual");

/**
 * Symbol to identify pool instances.
 */
export const SYMBOL_POOL = Symbol.for("atomirx.pool");

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
 *   .use(source => ({ ...source, double: () => source.get() * 2 }))
 *   .use(source => ({ ...source, triple: () => source.get() * 3 }));
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
 * Optional metadata for atoms.
 */
export interface AtomMeta extends AtomirxMeta {
  key?: string;
}

/**
 * Base interface for all atoms.
 * Represents a reactive value container with subscription capability.
 *
 * @template T - The type of value stored in the atom
 */
export interface Atom<T> {
  /** Symbol marker to identify atom instances */
  readonly [SYMBOL_ATOM]: true;

  /** Optional metadata for the atom */
  readonly meta?: AtomMeta;

  /** Get the current value */
  get(): T;

  /**
   * Subscribe to value changes.
   * @param listener - Callback invoked when value changes
   * @returns Unsubscribe function
   */
  on(listener: VoidFunction): VoidFunction;
}

/**
 * A mutable atom that can be updated via `set()` and reset to initial state.
 *
 * MutableAtom is a raw storage container. It stores values as-is, including Promises.
 * Unlike DerivedAtom, it does not automatically unwrap or track Promise states.
 *
 * @template T - The type of value stored in the atom
 *
 * @example
 * ```ts
 * // Sync value
 * const count = atom(0);
 * count.set(5);           // Direct value
 * count.set(n => n + 1);  // Reducer function
 * count.reset();          // Back to 0
 *
 * // Async value (stores Promise as-is)
 * const posts = atom(fetchPosts());
 * posts.get(); // Promise<Post[]>
 * posts.set(fetchPosts()); // Store new Promise
 * ```
 */
export interface MutableAtom<T> extends Atom<T>, Pipeable {
  /** Reset atom to its initial state (also clears dirty flag) */
  reset(): void;
  /**
   * Update the atom's value.
   *
   * @param value - New value or reducer function (prev) => newValue
   */
  set(value: T | ((prev: T) => T)): void;
  /**
   * Returns `true` if the value has changed since initialization or last `reset()`.
   *
   * Useful for:
   * - Tracking unsaved changes
   * - Enabling/disabling save buttons
   * - Detecting form modifications
   *
   * @example
   * ```ts
   * const form$ = atom({ name: "", email: "" });
   *
   * form$.dirty(); // false - just initialized
   *
   * form$.set({ name: "John", email: "" });
   * form$.dirty(); // true - value changed
   *
   * form$.reset();
   * form$.dirty(); // false - reset clears dirty flag
   * ```
   */
  dirty(): boolean;
}

/**
 * A derived (computed) atom that always returns Promise<T> for its value.
 *
 * DerivedAtom computes its value from other atoms. The computation is
 * re-run whenever dependencies change. The `.get()` always returns a Promise,
 * even for synchronous computations.
 *
 * @template T - The resolved type of the computed value
 * @template F - Whether fallback is provided (affects staleValue type)
 *
 * @example
 * ```ts
 * // Without fallback
 * const double$ = derived(({ read }) => read(count$) * 2);
 * await double$.get(); // number
 * double$.staleValue;  // number | undefined
 * double$.state();     // { status: "ready", value: 10 }
 *
 * // With fallback - during loading
 * const double$ = derived(({ read }) => read(count$) * 2, { fallback: 0 });
 * double$.staleValue;  // number (guaranteed)
 * double$.state();     // { status: "loading", promise } during loading
 * ```
 */
export interface DerivedAtom<T, F extends boolean = false> extends Atom<
  Promise<T>
> {
  /** Symbol marker to identify derived atom instances */
  readonly [SYMBOL_DERIVED]: true;
  /** Re-run the computation */
  refresh(): void;
  /**
   * Get the current state of the derived atom.
   * Returns a discriminated union with status, value/error, and stale flag.
   */
  state(): AtomState<T>;
  /**
   * The stale value - fallback or last resolved value.
   * - Without fallback: T | undefined
   * - With fallback: T (guaranteed)
   */
  readonly staleValue: F extends true ? T : T | undefined;
}

/**
 * Union type for any atom (mutable or derived).
 */
export type AnyAtom<T> = MutableAtom<T> | DerivedAtom<T, boolean>;

/**
 * Extract the value type from an atom.
 * For DerivedAtom, returns the awaited type.
 */
export type AtomValue<A> =
  A extends DerivedAtom<infer V, boolean>
    ? V
    : A extends Atom<infer V>
      ? Awaited<V>
      : never;

/**
 * Represents the state of an atom as a discriminated union.
 *
 * Uses intuitive state terms:
 * - `ready` - Value is available
 * - `error` - Computation failed
 * - `loading` - Waiting for async value
 *
 * @template T - The type of the atom's value
 */
export type AtomState<T> =
  | { status: "ready"; value: T; error?: undefined; promise?: undefined }
  | { status: "error"; error: unknown; value?: undefined; promise?: undefined }
  | {
      status: "loading";
      promise: Promise<T>;
      value?: undefined;
      error?: undefined;
    };

/**
 * Result type for SelectContext.state() - simplified AtomState without promise.
 *
 * All properties (`status`, `value`, `error`) are always present:
 * - `value` is `T` when ready, `undefined` otherwise
 * - `error` is the error when errored, `undefined` otherwise
 *
 * This enables easy destructuring without type narrowing:
 * ```ts
 * const { status, value, error } = state(atom$);
 * ```
 *
 * Equality comparisons work correctly (no promise reference issues).
 */
export type SelectStateResult<T> =
  | { status: "ready"; value: T; error: undefined }
  | { status: "error"; value: undefined; error: unknown }
  | { status: "loading"; value: undefined; error: undefined };

/**
 * Result type for race() and any() - includes winning key.
 *
 * @template K - The key type (string literal union)
 * @template V - The value type
 */
export type KeyedResult<K extends string, V> = {
  /** The key that won the race/any */
  key: K;
  /** The resolved value */
  value: V;
};

export type AtomPlugin = <T extends Atom<any>>(atom: T) => T | void;

/**
 * Result type for settled operations.
 */
export type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };

/**
 * Configuration options for creating a mutable atom.
 *
 * @template T - The type of value stored in the atom
 */
export interface AtomOptions<T> {
  /** Optional metadata for the atom */
  meta?: MutableAtomMeta;
  /** Equality strategy for change detection (default: "strict") */
  equals?: Equality<T>;
}

export interface MutableAtomMeta extends AtomMeta {}

export interface DerivedAtomMeta extends AtomMeta {}

/**
 * Configuration options for creating a derived atom.
 *
 * @template T - The type of the derived value
 */
export interface DerivedOptions<T> {
  /** Optional metadata for the atom */
  meta?: DerivedAtomMeta;
  /** Equality strategy for change detection (default: "strict") */
  equals?: Equality<T>;
  /**
   * Callback invoked when the derived computation throws an error.
   * This is called for actual errors, NOT for Promise throws (Suspense).
   *
   * @param error - The error thrown during computation
   *
   * @example
   * ```ts
   * const data$ = derived(
   *   ({ read }) => {
   *     const raw = read(source$);
   *     return JSON.parse(raw); // May throw SyntaxError
   *   },
   *   {
   *     onError: (error) => {
   *       console.error('Derived computation failed:', error);
   *       reportToSentry(error);
   *     }
   *   }
   * );
   * ```
   */
  onError?: (error: unknown) => void;
}

/**
 * Configuration options for effects.
 */
export interface EffectOptions {
  meta?: EffectMeta;
  /**
   * Callback invoked when the effect computation throws an error.
   * This is called for actual errors, NOT for Promise throws (Suspense).
   *
   * @param error - The error thrown during effect execution
   *
   * @example
   * ```ts
   * effect(
   *   ({ read }) => {
   *     const data = read(source$);
   *     riskyOperation(data); // May throw
   *   },
   *   {
   *     onError: (error) => {
   *       console.error('Effect failed:', error);
   *       showErrorNotification(error);
   *     }
   *   }
   * );
   * ```
   */
  onError?: (error: unknown) => void;
}

export interface AtomirxMeta {
  key?: string;
}

export interface EffectMeta extends AtomirxMeta {}

/**
 * A function that returns a value when called.
 * Used for lazy evaluation in derived atoms.
 *
 * @template T - The type of value returned
 */
export type Getter<T> = () => T;

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
 */
export type Equality<T = unknown> =
  | EqualityShorthand
  | ((a: T, b: T) => boolean);

/**
 * Prettify a type by adding all properties to the type.
 * @template T - The type to prettify
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export interface ModuleMeta {}

export type Listener<T> = (value: T) => void;

export type SingleOrMultipleListeners<T> = Listener<T> | Listener<T>[];

// ============================================================================
// Pool Types
// ============================================================================

/**
 * A virtual atom is a temporary wrapper around a real atom from a pool.
 * It is only valid during a select() context and throws if accessed outside.
 *
 * VirtualAtoms prevent memory leaks by ensuring pool atom references
 * cannot be stored and used after the computation completes.
 *
 * @template T - The type of value stored in the underlying atom
 */
export interface VirtualAtom<T> extends Atom<T> {
  /** Symbol marker to identify virtual atom instances */
  readonly [SYMBOL_VIRTUAL]: true;

  /**
   * Get the underlying real atom.
   * @internal
   * @throws Error if called outside select() context
   */
  _getAtom(): Atom<T>;

  /**
   * Mark this virtual atom as disposed.
   * After disposal, any method call will throw.
   * @internal
   */
  _dispose(): void;
}

/**
 * Configuration options for creating a pool.
 *
 * @template P - The type of params used to index pool entries (must be object)
 */
export interface PoolOptions<P> {
  /**
   * Time in milliseconds before an unused entry is garbage collected.
   * The GC timer resets on:
   * - Entry creation
   * - Value change
   * - Access (get/set)
   *
   * GC is paused while the entry's value is a pending Promise.
   */
  gcTime: number;

  /**
   * Equality strategy for params comparison (default: "shallow").
   * Used to determine if two params objects refer to the same cache entry.
   *
   * With default "shallow" equality:
   * - `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are considered equal (same entry)
   * - Property order doesn't matter
   *
   * @example
   * ```ts
   * // Default shallow equality
   * const userPool = pool((params: { id: string }) => fetchUser(params.id), {
   *   gcTime: 60_000,
   * });
   * userPool.get({ id: "1" });
   * userPool.get({ id: "1" }); // Same entry (shallow equal)
   *
   * // Custom equality
   * const pool = pool((params: { a: number; b: number }) => params.a + params.b, {
   *   gcTime: 60_000,
   *   equals: (a, b) => a.a === b.a && a.b === b.b,
   * });
   * ```
   */
  equals?: Equality<P>;

  /**
   * Optional metadata for the pool.
   */
  meta?: PoolMeta;
}

/**
 * Metadata for pool instances.
 */
export interface PoolMeta extends AtomirxMeta {
  key?: string;
}

/**
 * A pool is a collection of atoms indexed by params.
 * Similar to atomFamily in Jotai/Recoil, but with automatic GC
 * and VirtualAtom pattern to prevent memory leaks.
 *
 * @template P - The type of params used to index entries
 * @template T - The type of value stored in each entry
 *
 * @example
 * ```ts
 * // Create a pool
 * const userPool = pool(
 *   (id: string) => fetchUser(id),
 *   { gcTime: 60_000 }
 * );
 *
 * // Public API (value-based)
 * userPool.get("user-1");  // T | undefined
 * userPool.set("user-1", newUser);
 * userPool.remove("user-1");
 *
 * // In reactive context
 * derived(({ read, from }) => {
 *   const user$ = from(userPool, "user-1");
 *   return read(user$);
 * });
 * ```
 */
export interface Pool<P, T> {
  /** Symbol marker to identify pool instances */
  readonly [SYMBOL_POOL]: true;

  /** Optional metadata for the pool */
  readonly meta?: PoolMeta;

  /**
   * Get the current value for params.
   * Creates entry if it doesn't exist.
   * Extends GC timer on access.
   *
   * @param params - The params to look up
   * @returns The current value
   */
  get(params: P): T;

  /**
   * Set the value for params.
   * Creates entry if it doesn't exist.
   * Extends GC timer on access.
   *
   * @param params - The params to set
   * @param value - The new value or reducer function
   */
  set(params: P, value: T | ((prev: T) => T)): void;

  /**
   * Check if an entry exists for params.
   *
   * @param params - The params to check
   * @returns true if entry exists
   */
  has(params: P): boolean;

  /**
   * Remove an entry from the pool.
   * Triggers onRemove listeners.
   *
   * @param params - The params to remove
   */
  remove(params: P): void;

  /**
   * Remove all entries from the pool.
   * Triggers onRemove listeners for each entry.
   */
  clear(): void;

  /**
   * Iterate over all entries in the pool.
   *
   * @param callback - Called for each entry with (value, params)
   */
  forEach(callback: (value: T, params: P) => void): void;

  /**
   * Subscribe to value changes for any entry.
   *
   * @param listener - Called with (params, newValue) when any entry changes
   * @returns Unsubscribe function
   */
  onChange(listener: (params: P, value: T) => void): VoidFunction;

  /**
   * Subscribe to entry removals.
   *
   * @param listener - Called with (params, lastValue) when an entry is removed
   * @returns Unsubscribe function
   */
  onRemove(listener: (params: P, value: T) => void): VoidFunction;

  /**
   * Reset the value for params.
   * @param params - The params to reset
   */
  reset(params: P): void;

  /**
   * Get the underlying atom for params.
   * @internal - Use `from(pool, params)` in SelectContext instead.
   */
  _getAtom(params: P): MutableAtom<T>;

  /**
   * Subscribe to removal of a specific entry.
   * @internal - Used by SelectContext for automatic recomputation.
   */
  _onRemove(params: P, listener: VoidFunction): VoidFunction;
}
