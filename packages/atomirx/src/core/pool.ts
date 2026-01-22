/**
 * @fileoverview Pool implementation - a collection of atoms indexed by params with automatic GC.
 *
 * Pools solve the "atomFamily" problem with better memory management:
 * - Automatic garbage collection prevents memory leaks
 * - Promise-aware GC avoids collecting pending async operations
 * - ScopedAtom pattern ensures safe usage in reactive contexts
 *
 * @module core/pool
 */

import { atom, AtomContext } from "./atom";
import { emitter, Emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { isPromiseLike } from "./isPromiseLike";
import { onCreateHook } from "./onCreateHook";
import { trackPromise } from "./promiseCache";
import {
  MutableAtom,
  Pool,
  PoolEvent,
  PoolOptions,
  SYMBOL_POOL,
} from "./types";

/**
 * Internal entry structure for pool management.
 */
interface PoolEntry<P, T> {
  /** The underlying mutable atom */
  atom: MutableAtom<T>;
  /** Params used to create this entry (for iteration and equality comparison) */
  params: P;
  /** Emitter for removal notifications */
  disposeEmitter: Emitter;
  /** Reset the GC timer (called on access) */
  resetGC: VoidFunction;
  /** Cleanup resources (clear GC timer, unsubscribe from atom) */
  cleanup: VoidFunction;
}

/**
 * Creates a pool - a collection of atoms indexed by params with automatic GC.
 *
 * A pool is similar to atomFamily in Jotai/Recoil, but with:
 * - Automatic garbage collection based on `gcTime`
 * - ScopedAtom pattern to prevent memory leaks from stale references
 * - Promise-aware GC (never GC while value is a pending Promise)
 * - GC timer resets on create, value change, and access
 *
 * ## Public API (Value-based)
 *
 * The public API works with values, not atoms:
 * - `get(params)` - Get current value
 * - `set(params, value)` - Set value
 * - `has(params)` - Check if entry exists
 * - `remove(params)` - Remove entry
 * - `clear()` - Remove all entries
 * - `forEach(cb)` - Iterate entries
 * - `on(cb)` - Subscribe to pool events (create, change, remove)
 *
 * ## Reactive Context (via SelectContext.from())
 *
 * In derived/effect/useSelector, use `from(pool, params)` to get a ScopedAtom:
 * ```ts
 * derived(({ read, from }) => {
 *   const user$ = from(userPool, "user-1");
 *   return read(user$);
 * });
 * ```
 *
 * The ScopedAtom is automatically disposed after the computation,
 * preventing memory leaks from stale atom references.
 *
 * @template P - The type of params used to index entries
 * @template T - The type of value stored in each entry
 * @param init - Factory function that creates initial value for params
 * @param options - Pool configuration
 * @returns A Pool instance
 *
 * @example Basic usage
 * ```ts
 * const userPool = pool(
 *   (id: string) => ({ name: "", email: "" }),
 *   { gcTime: 60_000 }
 * );
 *
 * // Get/set values
 * userPool.set("user-1", { name: "John", email: "john@example.com" });
 * const user = userPool.get("user-1");
 *
 * // In reactive context
 * derived(({ read, from }) => {
 *   const user$ = from(userPool, "user-1");
 *   return read(user$);
 * });
 * ```
 *
 * @example Async values
 * ```ts
 * const dataPool = pool(
 *   (id: string) => fetchData(id), // Returns Promise
 *   { gcTime: 300_000 }
 * );
 *
 * // GC is paused while Promise is pending
 * // After resolve/reject, GC timer starts
 * ```
 */
export function pool<T, P = unknown>(
  init: (() => T) | ((params: P, context: AtomContext) => T),
  options: PoolOptions<P>
): Pool<P, T> {
  const { gcTime, meta } = options;

  // Default to "shallow" equality for params comparison
  // This means { a: 1 } and { a: 1 } are considered the same entry
  const paramsEqual = resolveEquality(options.equals ?? "shallow");

  // =========================================================================
  // Internal State
  // =========================================================================

  /**
   * Primary cache - stores all pool entries.
   * Uses array for equality-based lookup (O(n) worst case).
   * Order is insertion order.
   */
  const cache: PoolEntry<P, T>[] = [];

  /**
   * Reference cache - O(1) lookup optimization for object params.
   *
   * When the same params object reference is passed multiple times
   * (common in React re-renders), we can skip the O(n) equality search.
   *
   * Uses WeakMap so entries are automatically cleaned up when
   * the params object is garbage collected.
   */
  const refCache = new WeakMap<WeakKey, PoolEntry<P, T>>();

  /**
   * Event emitter for pool lifecycle events.
   * Emits: "create" | "change" | "remove"
   */
  const eventEmitter = emitter<PoolEvent<P, T>>();

  // =========================================================================
  // Helper Functions
  // =========================================================================

  /**
   * Check if params can be used as WeakMap key (non-null object or function).
   */
  const isWeakKey = (params: P): params is P & WeakKey =>
    params !== null &&
    (typeof params === "object" || typeof params === "function");

  /**
   * Find an entry by params using equality comparison.
   * Uses reference cache for O(1) lookup when same object reference is passed.
   * Returns the entry and its index, or undefined if not found.
   *
   * ## Lookup Flow
   *
   * ```
   * findEntry(params)
   *        │
   *        ▼
   *   Is params object?
   *        │
   *   ┌────┴────┐
   *   │Yes      │No (primitive)
   *   ▼         ▼
   * WeakMap    Equality search O(n)
   * lookup
   *   │
   * ┌─┴──┐
   * │Hit │Miss
   * ▼    ▼
   * Validate   Equality search O(n)
   * entry      + cache result
   * exists?
   *   │
   * Return O(1)
   * ```
   *
   * @param params - The params to search for
   * @returns Entry and index if found, undefined otherwise
   */
  const findEntry = (
    params: P
  ): { entry: PoolEntry<P, T>; index: number } | undefined => {
    // Fast path: same object reference (common in React re-renders)
    if (isWeakKey(params)) {
      const cached = refCache.get(params);
      if (cached) {
        const index = cache.indexOf(cached);
        if (index !== -1) {
          return { entry: cached, index };
        }
        // Entry was removed, clean up stale cache
        refCache.delete(params);
      }
    }

    // Slow path: equality-based search
    for (let i = 0; i < cache.length; i++) {
      if (paramsEqual(cache[i].params, params)) {
        // Cache for future same-reference lookups
        if (isWeakKey(params)) {
          refCache.set(params, cache[i]);
        }
        return { entry: cache[i], index: i };
      }
    }
    return undefined;
  };

  // =========================================================================
  // Entry Lifecycle
  // =========================================================================

  /**
   * Creates a new pool entry for the given params.
   *
   * Entry lifecycle:
   * 1. Create atom with initial value from `init(params)`
   * 2. Start GC timer
   * 3. Subscribe to value changes (resets GC, emits "change" event)
   * 4. Entry is removed when GC timer fires or `remove()` is called
   *
   * @param params - The params to create an entry for
   * @returns The created pool entry
   */
  const createEntry = (params: P): PoolEntry<P, T> => {
    // Create the underlying atom with the init function
    const entryAtom = atom((context) => init(params, context));

    // Token to track value changes - used to invalidate stale GC timers
    let changeToken = {};

    // Reference to the active GC timeout (null if no timer running)
    let gcTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Attempts to start the GC timer.
     *
     * ## Promise-Aware GC
     *
     * If the value is a pending Promise, we DON'T start the timer yet.
     * Instead, we wait for the Promise to settle, then start the timer.
     * This prevents collecting entries while async operations are in-flight.
     *
     * ```
     * tryToStartGC(value)
     *        │
     *        ▼
     *   Is value Promise?
     *        │
     *   ┌────┴────┐
     *   │Yes      │No
     *   ▼         ▼
     * Is pending? Start timer
     *   │
     * ┌─┴──┐
     * │Yes │No (settled)
     * ▼    ▼
     * Wait Start timer
     * ```
     *
     * @param value - Current atom value
     */
    const tryToStartGC = (value: T) => {
      // Clear any existing timer to avoid multiple timers
      if (gcTimeout) {
        clearTimeout(gcTimeout);
        gcTimeout = null;
      }

      // Create new token - any value change will invalidate this token
      const prevToken = (changeToken = {});

      // Promise-aware: don't GC while value is a pending Promise
      if (isPromiseLike(value)) {
        const state = trackPromise(value as PromiseLike<unknown>);
        if (state.status === "pending") {
          const onSettled = () => {
            // Abort if value changed while waiting
            if (changeToken !== prevToken) return;
            // Promise settled, now we can start the GC timer
            tryToStartGC(value);
          };
          // Wait for Promise to resolve or reject
          value.then(onSettled, onSettled);
          return;
        }
      }

      // Start the GC timer
      gcTimeout = setTimeout(() => {
        // Abort if value changed since timer started
        if (changeToken !== prevToken) return;
        // Time's up - remove this entry
        removeEntry(params);
      }, gcTime);
    };

    /**
     * Resets the GC timer.
     * Called on: entry creation, value change, get(), set()
     */
    const resetGC = () => tryToStartGC(entryAtom.get());

    /**
     * Cleans up entry resources.
     * Called when entry is removed from pool.
     */
    const cleanup = () => {
      // Cancel pending GC timer
      if (gcTimeout) {
        clearTimeout(gcTimeout);
        gcTimeout = null;
      }
      // Unsubscribe from atom changes
      unsubAtom();
    };

    // Subscribe to atom value changes
    // This handles both direct set() calls and async value updates
    const unsubAtom = entryAtom.on(() => {
      // Invalidate any pending GC timer
      changeToken = {};
      const newValue = entryAtom.get();
      // Restart GC timer with new value
      resetGC();
      // Notify listeners of the change
      eventEmitter.emit({ type: "change", params, value: newValue });
    });

    // Start initial GC timer
    resetGC();

    // Return the entry structure
    return {
      atom: entryAtom,
      params,
      disposeEmitter: emitter(), // For entry-specific removal listeners
      resetGC,
      cleanup,
    };
  };

  /**
   * Gets an existing entry or creates a new one.
   *
   * This is the primary entry point for accessing pool entries.
   * If an entry with matching params exists, returns it.
   * Otherwise, creates a new entry with the init function.
   *
   * @param params - The params to look up or create
   * @returns The existing or newly created entry
   */
  const getOrCreateEntry = (params: P): PoolEntry<P, T> => {
    // Try to find existing entry
    const found = findEntry(params);
    if (found) {
      return found.entry;
    }

    // Create new entry
    const entry = createEntry(params);
    cache.push(entry);

    // Emit "create" event for new entry
    // Callers can use pool.on() to listen for create/change/remove events
    eventEmitter.emit({ type: "create", params, value: entry.atom.get() });

    return entry;
  };

  /**
   * Removes an entry from the pool.
   *
   * Removal sequence:
   * 1. Find entry by params
   * 2. Dispose the underlying atom (aborts signals, runs cleanup)
   * 3. Clean up entry resources (GC timer, subscriptions)
   * 4. Notify entry-specific listeners (via disposeEmitter)
   * 5. Remove from cache
   * 6. Emit "remove" event
   * 7. Notify devtools hook
   *
   * @param params - The params of the entry to remove
   */
  const removeEntry = (params: P) => {
    const found = findEntry(params);
    if (!found) return;

    const { entry, index } = found;

    // Step 1: Dispose atom (abort signals, run cleanup functions)
    entry.atom._dispose();

    // Step 2: Cleanup entry resources (GC timer, atom subscription)
    entry.cleanup();

    // Step 3: Capture values before removing (for events)
    const lastValue = entry.atom.get();
    const entryParams = entry.params;

    // Step 4: Notify entry-specific disposal listeners
    // Used by SelectContext to know when to recompute
    entry.disposeEmitter.emitAndClear();

    // Step 5: Remove from cache
    cache.splice(index, 1);

    // Step 6: Emit "remove" event
    // Callers can use pool.on() to listen for remove events
    eventEmitter.emit({
      type: "remove",
      params: entryParams,
      value: lastValue,
    });
  };

  // =========================================================================
  // Public API
  // =========================================================================

  // Create the pool instance with public API
  const poolInstance: Pool<P, T> = {
    // Symbol marker for type identification
    [SYMBOL_POOL]: true as const,

    // User-provided metadata (for devtools, debugging)
    meta,

    /**
     * Returns the number of entries in the pool.
     */
    size(): number {
      return cache.length;
    },

    /**
     * Gets the value for params.
     * Creates entry if it doesn't exist.
     * Resets GC timer on access (keeps entry alive).
     */
    get(params: P): T {
      const entry = getOrCreateEntry(params);
      entry.resetGC(); // Keep alive on access
      return entry.atom.get();
    },

    /**
     * Sets the value for params.
     * Creates entry if it doesn't exist.
     * Resets GC timer on access.
     *
     * Accepts either a direct value or an updater function.
     */
    set(params: P, value: T | ((prev: T) => T)): void {
      const entry = getOrCreateEntry(params);
      entry.resetGC(); // Keep alive on access
      entry.atom.set(value);
      // Note: "change" event is emitted via atom subscription
    },

    /**
     * Checks if an entry exists for params.
     * Does NOT create entry or reset GC timer.
     */
    has(params: P): boolean {
      return findEntry(params) !== undefined;
    },

    /**
     * Removes an entry from the pool.
     * Triggers "remove" event and cleanup.
     */
    remove(params: P): void {
      removeEntry(params);
    },

    /**
     * Removes all entries from the pool.
     * Triggers "remove" event for each entry.
     */
    clear(): void {
      // Copy array to avoid mutation during iteration
      const entries = [...cache];
      for (const entry of entries) {
        removeEntry(entry.params);
      }
    },

    /**
     * Iterates over all entries in the pool.
     * Callback receives (value, params) for each entry.
     */
    forEach(callback: (value: T, params: P) => void): void {
      for (const entry of cache) {
        callback(entry.atom.get(), entry.params);
      }
    },

    /**
     * Subscribes to pool events.
     *
     * Events:
     * - "create": New entry created
     * - "change": Entry value changed
     * - "remove": Entry removed (manual or GC)
     *
     * @returns Unsubscribe function
     */
    on(listener: (event: PoolEvent<P, T>) => void): VoidFunction {
      return eventEmitter.on(listener);
    },

    // =========================================================================
    // Internal API (used by SelectContext)
    // =========================================================================

    /**
     * Gets the underlying atom for params.
     * @internal Used by SelectContext.from() to create ScopedAtom
     */
    _getAtom(params: P): MutableAtom<T> {
      const entry = getOrCreateEntry(params);
      return entry.atom;
    },

    /**
     * Subscribes to removal of a specific entry.
     * @internal Used by SelectContext for automatic recomputation
     *
     * When an entry is removed while a derived/effect depends on it,
     * this listener triggers recomputation to get a fresh entry.
     */
    _onRemove(params: P, listener: VoidFunction): VoidFunction {
      const found = findEntry(params);

      if (!found) {
        // Entry doesn't exist - return no-op unsubscribe
        return () => {};
      }

      return found.entry.disposeEmitter.on(listener);
    },
  };

  // Notify devtools that a new pool was created
  onCreateHook.current?.({
    type: "pool",
    key: meta?.key,
    meta,
    instance: poolInstance,
  });

  return poolInstance;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a Pool.
 *
 * @param value - The value to check
 * @returns true if value is a Pool instance
 */
export function isPool<P = unknown, T = unknown>(
  value: unknown
): value is Pool<P, T> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_POOL in value &&
    (value as Pool<P, T>)[SYMBOL_POOL] === true
  );
}
