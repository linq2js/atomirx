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
 * Symbol to identify scoped atoms (temporary wrappers for pool atoms).
 */
export const SYMBOL_SCOPED = Symbol.for("atomirx.scoped");

/**
 * Symbol to identify pool instances.
 */
export const SYMBOL_POOL = Symbol.for("atomirx.pool");

/**
 * Symbol to identify event instances.
 */
export const SYMBOL_EVENT = Symbol.for("atomirx.event");

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

  use<TPlugin extends object>(
    plugin: TPlugin
  ): TPlugin extends any[] ? this : this & TPlugin;
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

  /**
   * Dispose the atom, aborting any pending operations and running cleanup functions.
   * @internal - Used by pool when removing entries.
   */
  _dispose(): void;
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

  /**
   * Dispose the derived atom, cleaning up all subscriptions.
   * @internal - Reserved for future use.
   */
  _dispose(): void;
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
 * Single entry in a KeyedResult - hybrid tuple + object for one key-value pair.
 * @internal
 */
export type KeyedResultEntry<K extends string, V> = readonly [K, V] & {
  readonly key: K;
  readonly value: V;
};

/**
 * Result type for race() and any() - discriminated union of hybrid tuple + object.
 * Supports both destructuring patterns:
 * - Object: `const { key, value } = race(...)`
 * - Tuple: `const [key, value] = race(...)`
 *
 * The type preserves key-value correlation from the input record, enabling
 * TypeScript to narrow the `value` type when you check `key`.
 *
 * @template T - Record of key to value types (preserves correlation)
 *
 * @example
 * ```ts
 * const result = race({ num: numAtom$, bool: boolAtom$ });
 *
 * // Discriminated union narrowing
 * if (result.key === "num") {
 *   result.value; // narrowed to number
 * } else {
 *   result.value; // narrowed to boolean
 * }
 *
 * // Tuple destructuring
 * const [winner, data] = result;
 *
 * // Works with ready()
 * const r = ready(race({ num: numAtom$, bool: boolAtom$ }));
 * ```
 */
export type KeyedResult<T extends Record<string, unknown>> = {
  [K in keyof T & string]: KeyedResultEntry<K, T[K]>;
}[keyof T & string];

/**
 * Helper type to exclude null/undefined from KeyedResult values.
 * Preserves discriminated union behavior.
 * @internal
 */
export type NonNullableKeyedResult<T extends Record<string, unknown>> =
  KeyedResult<{ [K in keyof T]: Exclude<T[K], null | undefined> }>;

/**
 * Creates a KeyedResultEntry with both tuple and object access patterns.
 * @internal
 */
export function createKeyedResult<K extends string, V>(
  key: K,
  value: V
): KeyedResultEntry<K, V> {
  const tuple = [key, value] as const;
  return Object.assign(tuple, { key, value }) as KeyedResultEntry<K, V>;
}

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
 * Event emitted by pool's `on()` method.
 *
 * @template P - The type of params used to index entries
 * @template T - The type of value stored in each entry
 */
export type PoolEvent<P, T> =
  | { type: "create"; params: P; value: T }
  | { type: "change"; params: P; value: T }
  | { type: "remove"; params: P; value: T };

/**
 * A scoped atom is a temporary wrapper around a real atom from a pool.
 * It is only valid during a select() context and throws if accessed outside.
 *
 * ScopedAtoms prevent memory leaks by ensuring pool atom references
 * cannot be stored and used after the computation completes.
 *
 * @template T - The type of value stored in the underlying atom
 */
export interface ScopedAtom<T> extends Atom<T> {
  /** Symbol marker to identify scoped atom instances */
  readonly [SYMBOL_SCOPED]: true;

  /**
   * Get the underlying real atom.
   * @internal
   * @throws Error if called outside select() context
   */
  _getAtom(): Atom<T>;

  /**
   * Mark this scoped atom as disposed.
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
 * and ScopedAtom pattern to prevent memory leaks.
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

  size(): number;

  /**
   * Iterate over all entries in the pool.
   *
   * @param callback - Called for each entry with (value, params)
   */
  forEach(callback: (value: T, params: P) => void): void;

  /**
   * Subscribe to pool events.
   *
   * Event types:
   * - `create` - New entry created
   * - `change` - Existing entry value changed
   * - `remove` - Entry removed (manual or GC)
   *
   * @param listener - Called with event object containing type, params, and value
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsub = userPool.on((event) => {
   *   switch (event.type) {
   *     case "create":
   *       console.log("Created:", event.params, event.value);
   *       break;
   *     case "change":
   *       console.log("Changed:", event.params, event.value);
   *       break;
   *     case "remove":
   *       console.log("Removed:", event.params, event.value);
   *       break;
   *   }
   * });
   * ```
   */
  on(listener: (event: PoolEvent<P, T>) => void): VoidFunction;

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

// ============================================================================
// Event Types
// ============================================================================

/**
 * Metadata for event instances.
 */
export interface EventMeta extends AtomirxMeta {
  key?: string;
}

/**
 * An event is an ephemeral signal that can be fired with a payload.
 * Unlike atoms which hold state, events represent occurrences.
 *
 * Events implement the `Atom<Promise<T>>` interface, so they work directly
 * with `read()`, `race()`, `all()` - no `wait()` wrapper needed.
 *
 * ## Behavior
 *
 * - Created with a **pending** promise (suspends until first fire)
 * - `fire(payload)` resolves the pending promise OR creates new resolved promise
 * - Subsequent fires create new promises, triggering reactive updates
 * - Use `equals` option to dedupe identical payloads
 *
 * @template T - The type of payload (void for no payload)
 *
 * @example Basic usage
 * ```ts
 * const submitEvent = event<FormData>();
 * const cancelEvent = event(); // void payload
 *
 * // Fire events
 * submitEvent.fire(formData);
 * cancelEvent.fire();
 * ```
 *
 * @example In derived - works directly with read()
 * ```ts
 * const result$ = derived(({ read }) => {
 *   const data = read(submitEvent); // suspends until fire
 *   return processSubmit(data);
 * });
 * ```
 *
 * @example Race multiple events
 * ```ts
 * const result$ = derived(({ race }) => {
 *   const { key, value } = race({
 *     submit: submitEvent,
 *     cancel: cancelEvent,
 *   });
 *   return key === 'cancel' ? null : processSubmit(value);
 * });
 * ```
 *
 * @example With equals (dedupe)
 * ```ts
 * const searchEvent = event<string>({ equals: "shallow" });
 * searchEvent.fire("hello");  // Promise1 resolves
 * searchEvent.fire("hello");  // No-op (same value)
 * searchEvent.fire("world");  // Promise2 created
 * ```
 */
export interface Event<T = void> extends Atom<Promise<T>> {
  /** Symbol marker to identify event instances */
  readonly [SYMBOL_EVENT]: true;

  /** Symbol marker to identify as atom (for isAtom() compatibility) */
  readonly [SYMBOL_ATOM]: true;

  /** Optional metadata for the event */
  readonly meta?: EventMeta;

  /**
   * Get the current promise.
   * - Before first fire: returns pending promise
   * - After fire: returns resolved promise
   *
   * Does NOT create a new promise - just returns current state.
   */
  get(): Promise<T>;

  /**
   * Subscribe to promise changes.
   * Listener is called when `fire()` creates a new promise (after first fire).
   *
   * @param listener - Callback invoked when promise changes
   * @returns Unsubscribe function
   */
  on(listener: VoidFunction): VoidFunction;

  /**
   * Fire the event with a payload.
   *
   * - First fire: resolves the initial pending promise
   * - Subsequent fires: creates new resolved promise (if payload changed)
   *
   * Use `equals` option in event() to control when payloads are considered equal.
   * Default equals is `() => false`, meaning every fire creates a new promise.
   *
   * @param payload - The payload to emit (omit for void events)
   */
  fire: T extends void ? () => void : (payload: T) => void;

  /**
   * Get a promise for the next meaningful fire.
   * Creates a new pending promise lazily if none exists.
   *
   * Unlike `get()` which returns the current promise (may be resolved),
   * `next()` always returns a pending promise that resolves on the next `fire()`.
   *
   * **Respects `equals` option** - duplicate fires (where eq returns true) will NOT resolve this promise.
   * This ensures `next()` only triggers for actual data changes, consistent with reactive subscribers.
   *
   * Useful for imperative awaiting outside reactive context.
   *
   * @returns Promise that resolves on the next meaningful fire
   *
   * @example
   * ```ts
   * submitEvent.fire("first");
   *
   * // Wait for the NEXT fire (not the current resolved value)
   * const data = await submitEvent.next();
   * submitEvent.fire("second");
   * // data = "second"
   * ```
   *
   * @example With equals - skips duplicate fires
   * ```ts
   * const e = event<number>({ equals: "shallow" });
   * e.fire(1);
   * const p = e.next();
   * e.fire(1);  // Skipped - same value
   * e.fire(2);  // p resolves with 2
   * ```
   */
  next(): Promise<T>;

  /**
   * Get the last fired payload.
   *
   * @returns The last payload, or undefined if never fired
   */
  last(): T | undefined;
}
