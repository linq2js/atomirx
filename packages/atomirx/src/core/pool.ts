import { atom, AtomContext } from "./atom";
import { emitter, Emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { isPromiseLike } from "./isPromiseLike";
import { onCreateHook } from "./onCreateHook";
import { trackPromise } from "./promiseCache";
import { MutableAtom, Pool, PoolOptions, SYMBOL_POOL } from "./types";

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
 * - VirtualAtom pattern to prevent memory leaks from stale references
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
 * - `onChange(cb)` - Subscribe to value changes
 * - `onRemove(cb)` - Subscribe to removals
 *
 * ## Reactive Context (via SelectContext.from())
 *
 * In derived/effect/useSelector, use `from(pool, params)` to get a VirtualAtom:
 * ```ts
 * derived(({ read, from }) => {
 *   const user$ = from(userPool, "user-1");
 *   return read(user$);
 * });
 * ```
 *
 * The VirtualAtom is automatically disposed after the computation,
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
  const paramsEqual = resolveEquality(options.equals ?? "shallow");

  // Entry cache - use array for equality-based lookup
  const cache: PoolEntry<P, T>[] = [];

  // Global event emitters
  const changeEmitter = emitter<{ params: P; value: T }>();
  const removeEmitter = emitter<{ params: P; value: T }>();

  /**
   * Find an entry by params using equality comparison.
   * Returns the entry and its index, or undefined if not found.
   */
  const findEntry = (
    params: P
  ): { entry: PoolEntry<P, T>; index: number } | undefined => {
    for (let i = 0; i < cache.length; i++) {
      if (paramsEqual(cache[i].params, params)) {
        return { entry: cache[i], index: i };
      }
    }
    return undefined;
  };

  /**
   * Creates a new pool entry for params.
   */
  const createEntry = (params: P): PoolEntry<P, T> => {
    const entryAtom = atom((context) => init(params, context));
    let changeToken = {};
    let gcTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Tries to start the GC timer.
     * If value is a pending Promise, waits for it to settle first.
     */
    const tryToStartGC = (value: T) => {
      // Clear any existing timer
      if (gcTimeout) {
        clearTimeout(gcTimeout);
        gcTimeout = null;
      }

      const prevToken = (changeToken = {});

      // If value is a pending Promise, wait for it to settle
      if (isPromiseLike(value)) {
        const state = trackPromise(value as PromiseLike<unknown>);
        if (state.status === "pending") {
          const onSettled = () => {
            // Only proceed if value hasn't changed
            if (changeToken !== prevToken) return;
            // Retry GC with same value (now settled)
            tryToStartGC(value);
          };
          // Wait for Promise to settle before starting GC
          value.then(onSettled, onSettled);
          return;
        }
      }

      // Start GC timer
      gcTimeout = setTimeout(() => {
        // Verify value hasn't changed
        if (changeToken !== prevToken) return;
        // Remove entry
        removeEntry(params);
      }, gcTime);
    };

    const resetGC = () => tryToStartGC(entryAtom.get());

    const cleanup = () => {
      if (gcTimeout) {
        clearTimeout(gcTimeout);
        gcTimeout = null;
      }
      unsubAtom();
    };

    // Subscribe to atom value changes to reset GC and emit onChange
    const unsubAtom = entryAtom.on(() => {
      changeToken = {};
      const newValue = entryAtom.get();
      resetGC();
      changeEmitter.emit({ params, value: newValue });
    });

    // Start initial GC timer
    resetGC();

    // Create entry structure
    return {
      atom: entryAtom,
      params,
      disposeEmitter: emitter(),
      resetGC,
      cleanup,
    };
  };

  /**
   * Gets or creates an entry for params.
   */
  const getOrCreateEntry = (params: P): PoolEntry<P, T> => {
    const found = findEntry(params);
    if (found) {
      return found.entry;
    }

    const entry = createEntry(params);
    cache.push(entry);
    return entry;
  };

  /**
   * Removes an entry and notifies listeners.
   */
  const removeEntry = (params: P) => {
    const found = findEntry(params);
    if (!found) return;

    const { entry, index } = found;

    // Cleanup resources
    entry.cleanup();

    // Get last value before removing
    const lastValue = entry.atom.get();
    const entryParams = entry.params;

    // Notify entry-specific disposal listeners
    entry.disposeEmitter.emitAndClear();

    // Remove from cache (use splice for array)
    cache.splice(index, 1);

    // Notify global remove listeners
    removeEmitter.emit({ params: entryParams, value: lastValue });
  };

  // Create the pool object
  const poolInstance: Pool<P, T> = {
    [SYMBOL_POOL]: true as const,
    meta,

    get(params: P): T {
      const entry = getOrCreateEntry(params);
      entry.resetGC();
      return entry.atom.get();
    },

    set(params: P, value: T | ((prev: T) => T)): void {
      const entry = getOrCreateEntry(params);
      entry.resetGC();
      entry.atom.set(value);
    },

    has(params: P): boolean {
      return findEntry(params) !== undefined;
    },

    remove(params: P): void {
      removeEntry(params);
    },

    reset(params: P): void {
      const entry = getOrCreateEntry(params);
      entry.resetGC();
      entry.atom.reset();
    },

    clear(): void {
      // Copy to avoid mutation during iteration
      const entries = [...cache];
      for (const entry of entries) {
        removeEntry(entry.params);
      }
    },

    forEach(callback: (value: T, params: P) => void): void {
      for (const entry of cache) {
        callback(entry.atom.get(), entry.params);
      }
    },

    onChange(listener: (params: P, value: T) => void): VoidFunction {
      return changeEmitter.on(({ params, value }) => listener(params, value));
    },

    onRemove(listener: (params: P, value: T) => void): VoidFunction {
      return removeEmitter.on(({ params, value }) => listener(params, value));
    },

    _getAtom(params: P): MutableAtom<T> {
      const entry = getOrCreateEntry(params);
      return entry.atom;
    },

    _onRemove(params: P, listener: VoidFunction): VoidFunction {
      const found = findEntry(params);

      if (!found) {
        // Entry doesn't exist, nothing to clean up - return no-op
        return () => {};
      }

      return found.entry.disposeEmitter.on(listener);
    },
  };

  onCreateHook.current?.({
    type: "pool",
    key: meta?.key,
    meta,
    instance: poolInstance,
  });

  return poolInstance;
}

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
