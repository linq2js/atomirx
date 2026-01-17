import { emitter, Emitter } from "./emitter";
import { resolveEquality } from "./equality";
import { scheduleNotifyHook } from "./scheduleNotifyHook";
import { Equality } from "./types";

/**
 * Options for creating an atomState.
 */
export interface AtomStateOptions<T, TFallback = undefined> {
  /** Equality strategy for change detection (default: "strict") */
  equals?: Equality<T>;
  /**
   * Fallback value to use during loading or error states.
   * When set, enables "stale" mode where value is never undefined.
   */
  fallback?: TFallback;
  /**
   * Whether fallback mode is enabled.
   * When true, getValue() returns fallback/lastResolved during loading/error.
   */
  hasFallback?: boolean;
}

/**
 * API for managing atom state with async support.
 */
export interface AtomStateAPI<T, TFallback = undefined> {
  /** Get the current value (undefined if loading or error, unless fallback mode) */
  getValue(): TFallback extends undefined ? T | undefined : T | TFallback;
  /** Get the loading state */
  getLoading(): boolean;
  /** Get the error (undefined if no error) */
  getError(): any;
  /** Get the current promise */
  getPromise(): PromiseLike<T>;

  /** Set the value (clears loading and error, notifies if changed) */
  setValue(value: T, silent?: boolean): void;
  /** Set loading state with a promise (clears value and error, notifies) */
  setLoading(promise: PromiseLike<T>, silent?: boolean): void;
  /** Set error state (clears value and loading, notifies if changed) */
  setError(error: any, silent?: boolean): void;
  /** Reset to initial state (notifies if was not already initial) */
  reset(): void;

  /** Get current version (for race condition handling) */
  getVersion(): number;
  /** Check if a version is stale (older than current) */
  isVersionStale(version: number): boolean;

  /**
   * Returns true if fallback mode is enabled AND (loading OR error).
   * When true, getValue() returns fallback or last resolved value.
   */
  stale(): boolean;

  /**
   * Returns true if value has been changed by setValue() (not during init).
   */
  isDirty(): boolean;

  /**
   * Marks the state as dirty (called when set() is used).
   */
  markDirty(): void;

  /**
   * Clears the dirty flag (called on reset).
   */
  clearDirty(): void;

  /** Subscribe to state changes */
  on: Emitter["on"];
}

/**
 * Creates a state container for atoms with async support.
 *
 * Handles:
 * - Value, loading, and error states
 * - Version tracking for race condition handling
 * - Equality checking for change detection
 * - Notification scheduling
 * - Fallback mode for stale-while-revalidate pattern
 *
 * @template T - The type of value stored
 * @template TFallback - The type of fallback value (default: undefined)
 * @param options - Configuration options
 * @returns AtomStateAPI for managing the state
 *
 * @example
 * ```ts
 * const state = atomState<number>();
 *
 * state.setValue(42);
 * console.log(state.getValue()); // 42
 *
 * state.setLoading(fetchData());
 * console.log(state.getLoading()); // true
 *
 * state.on(() => console.log('State changed!'));
 * ```
 *
 * @example With fallback
 * ```ts
 * const state = atomState<User, User>({
 *   fallback: { name: 'Guest' },
 *   hasFallback: true
 * });
 *
 * state.setLoading(fetchUser());
 * console.log(state.getValue()); // { name: 'Guest' }
 * console.log(state.isStale()); // true
 * ```
 */
export function atomState<T, TFallback = undefined>(
  options: AtomStateOptions<T, TFallback> = {}
): AtomStateAPI<T, TFallback> {
  const changeEmitter = emitter();
  const eq = resolveEquality(options.equals as Equality<unknown>);

  // Fallback configuration
  const hasFallback = options.hasFallback ?? false;
  const fallbackValue = options.fallback as TFallback;

  // Internal state
  let value: T | undefined = undefined;
  let loading = false;
  let error: any = undefined;
  let promise: PromiseLike<T> = Promise.resolve(undefined as T);
  let version = 0;

  // Track last resolved value for stale-while-revalidate
  let lastResolvedValue: T | undefined = undefined;

  // Track if value has been modified by set()
  let dirty = false;

  /**
   * Schedules notification to all subscribers.
   * Each listener is scheduled individually to enable deduping in batch().
   */
  const notify = () => {
    changeEmitter.forEach((listener) => {
      scheduleNotifyHook.current(listener);
    });
  };

  /**
   * Checks if state is in initial state (no value, not loading, no error).
   */
  const isInitialState = () => {
    return value === undefined && !loading && error === undefined;
  };

  const api: AtomStateAPI<T, TFallback> = {
    getValue: () => {
      // If fallback mode enabled and in loading/error state
      if (hasFallback && (loading || error !== undefined)) {
        // Return last resolved value if available, otherwise fallback
        return (lastResolvedValue ?? fallbackValue) as any;
      }
      return value as any;
    },
    getLoading: () => loading,
    getError: () => error,
    getPromise: () => promise,
    getVersion: () => version,

    isVersionStale: (v: number) => v !== version,

    stale: () => {
      // Returns true if fallback mode enabled AND (loading OR error)
      return hasFallback && (loading || error !== undefined);
    },

    isDirty: () => dirty,

    markDirty: () => {
      dirty = true;
    },

    clearDirty: () => {
      dirty = false;
    },

    setValue: (newValue: T, silent = false) => {
      // Check equality before updating (only if we have a previous value)
      if (
        value !== undefined &&
        eq(newValue, value) &&
        !loading &&
        error === undefined
      ) {
        return;
      }

      value = newValue;
      loading = false;
      error = undefined;
      promise = Promise.resolve(newValue);
      version++;

      // Track last resolved value for fallback mode
      lastResolvedValue = newValue;

      if (!silent) notify();
    },

    setLoading: (newPromise: PromiseLike<T>, silent = false) => {
      // In fallback mode, don't clear value - it will be returned via getValue()
      // But internally we track that we're loading
      value = undefined;
      loading = true;
      error = undefined;
      promise = newPromise;
      version++;
      if (!silent) notify();
    },

    setError: (newError: any, silent = false) => {
      // Check if error is the same
      if (Object.is(error, newError) && !loading && value === undefined) {
        return;
      }

      value = undefined;
      loading = false;
      error = newError;
      version++;
      if (!silent) notify();
    },

    reset: () => {
      // Don't notify if already in initial state
      if (isInitialState() && lastResolvedValue === undefined && !dirty) {
        return;
      }

      value = undefined;
      loading = false;
      error = undefined;
      promise = Promise.resolve(undefined as T);
      version++;
      // Clear last resolved value on reset
      lastResolvedValue = undefined;
      // Clear dirty flag on reset
      dirty = false;
      notify();
    },

    on: changeEmitter.on,
  };

  return api;
}
