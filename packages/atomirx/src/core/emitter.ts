import { Listener, SingleOrMultipleListeners } from "./types";

/**
 * Event emitter interface for pub/sub pattern.
 *
 * @template T - The type of payload emitted to listeners (defaults to void)
 */
export interface Emitter<T = void> {
  /**
   * Subscribe to events with one or more listeners.
   *
   * @param listeners - Single listener or array of listeners
   * @returns Unsubscribe function (idempotent - safe to call multiple times)
   */
  on(listeners: SingleOrMultipleListeners<T>): VoidFunction;

  /**
   * Subscribe with a mapping function that filters and transforms events.
   *
   * The map function receives the emitted value and returns either:
   * - `{ value: TValue }` - Listener is called with the transformed value
   * - `undefined` - Listener is NOT called (event filtered out)
   *
   * @template TValue - The transformed value type passed to listeners
   * @param map - Transform function that can filter (return undefined) or map values
   * @param listeners - Single listener or array of listeners for transformed values
   * @returns Unsubscribe function
   *
   * @example Filter and transform
   * ```ts
   * const emitter = emitter<{ type: string; data: number }>();
   *
   * // Only listen to 'success' events, extract just the data
   * emitter.on(
   *   (event) => event.type === 'success' ? { value: event.data } : undefined,
   *   (data) => console.log('Success data:', data)
   * );
   * ```
   */
  on<TValue>(
    map: (value: T) => { value: TValue } | undefined,
    listeners: SingleOrMultipleListeners<TValue>
  ): VoidFunction;

  /**
   * Emit an event to all registered listeners.
   *
   * @param payload - The value to pass to all listeners
   */
  emit(payload: T): void;

  /**
   * Emit an event to all registered listeners in LIFO (reverse) order.
   * Useful for cleanup scenarios where resources should be released
   * in reverse order of acquisition.
   *
   * @param payload - The value to pass to all listeners
   */
  emitLifo(payload: T): void;

  /**
   * Remove all registered listeners.
   */
  clear(): void;

  /**
   * Emit an event to all listeners, then clear all listeners.
   * Useful for one-time events like disposal.
   *
   * @param payload - The value to pass to all listeners
   */
  emitAndClear(payload: T): void;

  /**
   * Emit an event to all listeners in LIFO (reverse) order, then clear.
   * Useful for cleanup scenarios where resources should be released
   * in reverse order of acquisition.
   *
   * @param payload - The value to pass to all listeners
   */
  emitAndClearLifo(payload: T): void;

  /**
   * Emit to all listeners, clear, and "settle" the emitter.
   *
   * After settling:
   * - Any new `on()` call immediately invokes the listener with the settled payload
   * - Returns a no-op unsubscribe function
   * - `emit()` and `emitAndClear()` become no-ops
   *
   * Useful for one-time events where late subscribers should still receive the value
   * (similar to Promise behavior).
   *
   * @param payload - The final value to pass to all listeners
   */
  settle(payload: T): void;

  /** Number of registered listeners */
  size(): number;

  /** Whether the emitter has been settled */
  settled(): boolean;

  /**
   * Iterate over all registered listeners.
   * Used for batching to dedupe listeners across multiple atoms.
   */
  forEach(callback: (listener: Listener<T>) => void): void;
}

const noop = () => {};

/**
 * Class-based emitter implementation for better V8 optimization.
 * All instances share methods via prototype.
 */
class EmitterImpl<T = void> implements Emitter<T> {
  /** Set of registered listeners */
  private _listeners: Set<Listener<T>>;
  /** Settled payload (if settled) */
  private _settledPayload: T | undefined = undefined;
  /** Whether the emitter has been settled */
  private _isSettled = false;

  constructor(initialListeners?: Listener<T>[]) {
    this._listeners = new Set<Listener<T>>(initialListeners);
    // Bind 'on' to preserve 'this' context when passed as callback
  }

  size = (): number => {
    return this._listeners.size;
  };

  settled = (): boolean => {
    return this._isSettled;
  };

  forEach = (callback: (listener: Listener<T>) => void): void => {
    this._listeners.forEach(callback);
  };

  on = (listenersOrMap: any, mappedListeners?: any): VoidFunction => {
    let newListeners: Listener<T>[];

    if (mappedListeners === undefined) {
      // Simple form: on(listeners)
      newListeners = Array.isArray(listenersOrMap)
        ? listenersOrMap
        : [listenersOrMap];
    } else {
      // Mapped form: on(map, listeners)
      const map = listenersOrMap as (value: T) => { value: any } | undefined;
      const sourceListeners: Listener<any>[] = Array.isArray(mappedListeners)
        ? mappedListeners
        : [mappedListeners];

      newListeners = [
        (value: T) => {
          const mappedValue = map(value);
          if (mappedValue) {
            for (let i = 0; i < sourceListeners.length; i++) {
              sourceListeners[i]!(mappedValue.value);
            }
          }
        },
      ];
    }

    // If settled, call listeners immediately and return no-op
    if (this._isSettled) {
      const payload = this._settledPayload as T;
      for (let i = 0; i < newListeners.length; i++) {
        newListeners[i]!(payload);
      }
      return noop;
    }

    const listeners = this._listeners;
    for (let i = 0; i < newListeners.length; i++) {
      listeners.add(newListeners[i]!);
    }

    return () => {
      for (let i = 0; i < newListeners.length; i++) {
        listeners.delete(newListeners[i]!);
      }
    };
  };

  emit = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, false, false);
  };

  emitLifo = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, false, true);
  };

  clear = (): void => {
    this._listeners.clear();
  };

  emitAndClear = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, true, false);
  };

  emitAndClearLifo = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, true, true);
  };

  settle = (payload: T): void => {
    if (this._isSettled) return;
    this._settledPayload = payload;
    this._isSettled = true;
    this._doEmit(payload, true, false);
  };

  /**
   * Internal emit implementation.
   * Creates snapshot to handle modifications during iteration.
   */
  private _doEmit = (payload: T, clear: boolean, lifo: boolean): void => {
    const listeners = this._listeners;
    const size = listeners.size;
    if (size === 0) return;

    // Create snapshot - necessary because Set.forEach includes items added during iteration
    const copy = Array.from(listeners);
    if (clear) {
      listeners.clear();
    }

    // Use traditional for loop for maximum performance
    if (lifo) {
      for (let i = size - 1; i >= 0; i--) {
        copy[i]!(payload);
      }
    } else {
      for (let i = 0; i < size; i++) {
        copy[i]!(payload);
      }
    }
  };
}

/**
 * Creates an event emitter for managing and notifying listeners.
 *
 * An emitter provides a simple pub/sub pattern for managing event listeners.
 * It's used internally by atoms and effects to manage subscriptions and notifications.
 *
 * ## Key Features
 *
 * 1. **Subscribe/Unsubscribe**: Add listeners that will be notified when events are emitted
 * 2. **Emit events**: Notify all registered listeners with a payload
 * 3. **Mapped subscriptions**: Filter and transform events before they reach listeners
 * 4. **LIFO emission**: Emit in reverse order for cleanup scenarios
 * 5. **Settle pattern**: One-time events where late subscribers still receive the value
 * 6. **Idempotent unsubscribe**: Safe to call unsubscribe multiple times
 *
 * ## Emission Methods
 *
 * | Method | Order | Clears | Settles | Use Case |
 * |--------|-------|--------|---------|----------|
 * | `emit()` | FIFO | No | No | Normal notifications |
 * | `emitLifo()` | LIFO | No | No | Cleanup in reverse order |
 * | `emitAndClear()` | FIFO | Yes | No | One-time broadcast |
 * | `emitAndClearLifo()` | LIFO | Yes | No | One-time cleanup |
 * | `settle()` | FIFO | Yes | Yes | Promise-like one-time events |
 *
 * ## Settle Behavior
 *
 * After `settle()` is called:
 * - New `on()` calls immediately invoke the listener with the settled payload
 * - Returns a no-op unsubscribe function
 * - `emit()` and other methods become no-ops
 *
 * This is similar to how Promises work - late `.then()` calls still receive the value.
 *
 * @template T - The type of payload emitted to listeners (defaults to void)
 * @param initialListeners - Optional array of listeners to start with
 * @returns An Emitter instance
 *
 * @example Basic usage
 * ```ts
 * const events = emitter<string>();
 *
 * // Subscribe
 * const unsubscribe = events.on((message) => {
 *   console.log('Received:', message);
 * });
 *
 * // Emit
 * events.emit('Hello'); // Logs: "Received: Hello"
 *
 * // Unsubscribe
 * unsubscribe();
 *
 * events.emit('World'); // Nothing logged
 * ```
 *
 * @example Multiple listeners
 * ```ts
 * const events = emitter<number>();
 *
 * events.on((n) => console.log('A:', n));
 * events.on((n) => console.log('B:', n));
 *
 * events.emit(42);
 * // Logs: "A: 42"
 * // Logs: "B: 42"
 * ```
 *
 * @example Mapped subscriptions (filter and transform)
 * ```ts
 * const events = emitter<{ type: string; data: number }>();
 *
 * // Only listen to 'success' events, extract just the data
 * events.on(
 *   (event) => event.type === 'success' ? { value: event.data } : undefined,
 *   (data) => console.log('Success data:', data)
 * );
 *
 * events.emit({ type: 'error', data: 0 });   // Nothing logged (filtered)
 * events.emit({ type: 'success', data: 42 }); // Logs: "Success data: 42"
 * ```
 *
 * @example LIFO emission for cleanup
 * ```ts
 * const cleanup = emitter();
 *
 * cleanup.on(() => console.log('First registered, last to clean'));
 * cleanup.on(() => console.log('Second registered, second to clean'));
 * cleanup.on(() => console.log('Last registered, first to clean'));
 *
 * cleanup.emitLifo();
 * // Logs in reverse order:
 * // "Last registered, first to clean"
 * // "Second registered, second to clean"
 * // "First registered, last to clean"
 * ```
 *
 * @example Settle pattern (Promise-like)
 * ```ts
 * const ready = emitter<{ config: Config }>();
 *
 * // Early subscriber
 * ready.on((payload) => console.log('Early:', payload.config));
 *
 * // Settle the emitter
 * ready.settle({ config: loadedConfig });
 * // Logs: "Early: ..."
 *
 * // Late subscriber - still receives the value immediately
 * ready.on((payload) => console.log('Late:', payload.config));
 * // Logs: "Late: ..." (immediately)
 * ```
 *
 * @example Void emitter (no payload)
 * ```ts
 * const tick = emitter(); // emitter<void>
 *
 * tick.on(() => console.log('Tick!'));
 *
 * tick.emit(); // Logs: "Tick!"
 * ```
 *
 * @example Array of listeners
 * ```ts
 * const events = emitter<string>();
 *
 * // Subscribe multiple listeners at once
 * const unsubscribe = events.on([
 *   (msg) => console.log('Logger 1:', msg),
 *   (msg) => console.log('Logger 2:', msg),
 * ]);
 *
 * events.emit('Hello');
 * // Logs: "Logger 1: Hello"
 * // Logs: "Logger 2: Hello"
 *
 * unsubscribe(); // Removes both listeners
 * ```
 */
export function emitter<T = void>(
  initialListeners?: Listener<T>[]
): Emitter<T> {
  return new EmitterImpl<T>(initialListeners);
}
