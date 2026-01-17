import { Listener, SingleOrMultipleListeners } from './types';
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
    on<TValue>(map: (value: T) => {
        value: TValue;
    } | undefined, listeners: SingleOrMultipleListeners<TValue>): VoidFunction;
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
export declare function emitter<T = void>(initialListeners?: Listener<T>[]): Emitter<T>;
