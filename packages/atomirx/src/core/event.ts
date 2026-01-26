import { atom } from "./atom";
import { resolveEquality } from "./equality";
import { onCreateHook } from "./onCreateHook";
import { createResolvedPromise } from "./promiseCache";
import {
  Equality,
  Event,
  EventMeta,
  MutableAtom,
  SYMBOL_ATOM,
  SYMBOL_EVENT,
} from "./types";

/**
 * Options for creating an event.
 *
 * @template T - The type of payload
 */
export interface EventOptions<T = void> {
  /** Optional metadata for debugging/devtools */
  meta?: EventMeta;

  /**
   * Equality function to compare payloads.
   *
   * When `fire(payload)` is called after the first fire:
   * - If `equals(lastPayload, payload)` returns true → no-op (no new promise)
   * - If `equals(lastPayload, payload)` returns false → create new resolved promise
   *
   * **Default: `() => false`** - every fire creates a new promise.
   * This is important for void events where `fire()` is called multiple times.
   *
   * @example Dedupe identical payloads
   * ```ts
   * const searchEvent = event<string>({ equals: "shallow" });
   * searchEvent.fire("hello");  // Promise1 resolves
   * searchEvent.fire("hello");  // No-op (same value)
   * searchEvent.fire("world");  // Promise2 created
   * ```
   */
  equals?: Equality<T>;

  /**
   * If true, the event can only fire once.
   * After first fire, subsequent `fire()` calls are no-op.
   * `next()` returns the same resolved promise forever.
   *
   * Useful for one-time events like initialization, login, or data load.
   *
   * @example
   * ```ts
   * const initEvent = event<Config>({ once: true });
   * initEvent.fire(config);   // Promise resolved
   * initEvent.fire(config2);  // No-op (already fired)
   * initEvent.get();          // Same resolved promise
   * initEvent.next();         // Same resolved promise
   * ```
   */
  once?: boolean;
}

/**
 * Creates an event - a reactive signal that can be fired with a payload.
 *
 * Events implement `Atom<Promise<T>>`, so they work directly with
 * `read()`, `race()`, `all()` in derived/effect - no wrapper needed.
 *
 * ## Behavior
 *
 * ```
 * event<T>() created
 *        │
 *        ▼
 *    atom.value = Promise1 (pending)
 *        │
 * fire(A) ────────────────────────────────┐
 *        │                                │
 *    First fire?                          │
 *        │Yes                             │
 *        ▼                                │
 *    Promise1.resolve(A)                  │
 *    last = { data: A }                   │
 *        │                                │
 * fire(B) ────────────────────────────────┤
 *        │                                │
 *    !equals(A, B)?                       │
 *        │Yes                             │
 *        ▼                                │
 *    atom.value = Promise2 (resolved B)   │
 *    → subscribers notified               │
 *    last = { data: B }                   │
 * ```
 *
 * ## Key Features
 *
 * 1. **Atom-compatible**: Works with `read()`, `race()`, `all()` directly
 * 2. **Suspend until fire**: `read(event)` suspends if promise is pending
 * 3. **Reactive**: `fire()` triggers derived recomputation via subscription
 * 4. **Deduplication**: Use `equals` option to skip identical payloads
 *
 * @template T - The type of payload (void for no payload)
 * @param options - Optional configuration (meta, equals)
 * @returns An Event instance that implements Atom<Promise<T>>
 *
 * @example Basic usage
 * ```ts
 * const clickEvent = event<{ x: number; y: number }>();
 *
 * // Fire the event
 * clickEvent.fire({ x: 100, y: 200 });
 *
 * // Get last fired payload
 * clickEvent.last(); // { x: 100, y: 200 }
 *
 * // Get current promise
 * const promise = clickEvent.get();
 * ```
 *
 * @example Void event (no payload)
 * ```ts
 * const cancelEvent = event();
 * cancelEvent.fire(); // No payload needed
 * cancelEvent.fire(); // Each fire creates new promise (default equals)
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
 * @example With equals (dedupe identical payloads)
 * ```ts
 * const searchEvent = event<string>({ equals: "shallow" });
 * searchEvent.fire("hello");  // Promise1 resolves
 * searchEvent.fire("hello");  // No-op (same value)
 * searchEvent.fire("world");  // Promise2 created, subscribers notified
 * ```
 */
export function event<T = void>(options: EventOptions<T> = {}): Event<T> {
  // Track last fired payload - undefined means never fired
  // Using { data: T } wrapper to distinguish "never fired" from "fired with undefined"
  let last: { data: T } | undefined = undefined;

  // Count of meaningful fires (not skipped by equals or once)
  let count = 0;

  // Pending promise - created lazily by next(), serves as both initial and subsequent
  // Cleared after fire(), recreated on demand by next()
  let nextPromise: Promise<T> | undefined = undefined;
  let nextResolve: ((value: T) => void) | null = null;

  // Equality function - default always returns false (every fire triggers update)
  // This is important for void events where fire() is called multiple times
  const eq = options.equals ? resolveEquality(options.equals) : () => false;

  /**
   * Get a promise for the next meaningful fire.
   * Creates a new pending promise lazily if none exists.
   *
   * Respects `equals` option - duplicate fires (where eq returns true) will NOT resolve this promise.
   * Useful for imperative awaiting outside reactive context.
   */
  const next = (): Promise<T> => {
    if (!nextPromise) {
      nextPromise = new Promise<T>((resolve) => {
        nextResolve = resolve;
      });
    }
    return nextPromise;
  };

  // Internal atom holding the promise
  const internalAtom: MutableAtom<Promise<T>> = atom(next);

  /**
   * Fire the event with a payload.
   *
   * - First fire: resolves the initial pending promise
   * - Subsequent fires: creates new resolved promise if payload changed (per equals)
   * - Always resolves any pending next() promise
   */
  const fire = (payload?: T): void => {
    // If once and already fired, no-op
    if (options.once && last) {
      return;
    }

    const data = payload as T;
    const resolve = nextResolve;

    // Only process if first fire OR data changed (per equals)
    // Skip if eq returns true (same data) - respects deduplication for both atom and next()
    if (!last || !eq(last.data, data)) {
      const isSubsequentFire = !!last;
      last = { data };
      count++;
      // for subsequent fires with different data, create new pre-cached resolved promise
      if (isSubsequentFire) {
        internalAtom.set(createResolvedPromise(data));
      }
      resolve?.(data);

      // Clear next() promise unless once (keep resolved promise for subsequent next() calls)
      if (!options.once) {
        nextResolve = null;
        nextPromise = undefined;
      }
    }
  };

  /**
   * Get the last fired payload.
   */
  const lastFn = (): T | undefined => {
    return last?.data;
  };

  const noop = () => {};

  const eventInstance: Event<T> = {
    [SYMBOL_EVENT]: true as const,
    [SYMBOL_ATOM]: true as const,
    meta: options.meta,

    // Atom interface
    get: () => internalAtom.get(),
    on: (listener) => {
      // If once and already fired, trigger immediately and return no-op
      // (no point subscribing to an atom that will never change)
      if (options.once && last) {
        listener();
        return noop;
      }
      return internalAtom.on(listener);
    },

    // Event-specific
    fire: fire as Event<T>["fire"],
    next,
    last: lastFn,
    get fireCount() {
      return count;
    },
    sealed: () => !!(options.once && last),
  };

  // Notify devtools/plugins of event creation
  onCreateHook.current?.({
    type: "event",
    key: options.meta?.key,
    meta: options.meta,
    instance: eventInstance as Event<unknown>,
  });

  return eventInstance;
}

/**
 * Type guard to check if a value is an Event.
 *
 * @param value - The value to check
 * @returns true if the value is an Event
 *
 * @example
 * ```ts
 * if (isEvent(value)) {
 *   value.fire(payload);
 * }
 * ```
 */
export function isEvent<T = unknown>(value: unknown): value is Event<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    SYMBOL_EVENT in value &&
    (value as Event<T>)[SYMBOL_EVENT] === true
  );
}
