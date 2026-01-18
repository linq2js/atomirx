import { batch } from "./batch";
import { derived } from "./derived";
import { emitter } from "./emitter";
import { isPromiseLike } from "./isPromiseLike";
import { SelectContext } from "./select";
import { EffectOptions } from "./types";

/**
 * Context object passed to effect functions.
 * Extends `SelectContext` with cleanup and error handling utilities.
 */
export interface EffectContext extends SelectContext {
  /**
   * Register a cleanup function that runs before the next execution or on dispose.
   * Multiple cleanup functions can be registered; they run in FIFO order.
   *
   * @param cleanup - Function to run during cleanup
   *
   * @example
   * ```ts
   * effect(({ get, onCleanup }) => {
   *   const id = setInterval(() => console.log('tick'), 1000);
   *   onCleanup(() => clearInterval(id));
   * });
   * ```
   */
  onCleanup: (cleanup: VoidFunction) => void;

  /**
   * Register an error handler for synchronous errors thrown in the effect.
   * If registered, prevents errors from propagating to `options.onError`.
   *
   * @param handler - Function to handle errors
   *
   * @example
   * ```ts
   * effect(({ get, onError }) => {
   *   onError((e) => console.error('Effect failed:', e));
   *   riskyOperation();
   * });
   * ```
   */
  onError: (handler: (error: unknown) => void) => void;
}

/**
 * Callback function for effects.
 * Receives the effect context with `{ get, all, any, race, settled, onCleanup, onError }` utilities.
 */
export type EffectFn = (context: EffectContext) => void;

/**
 * Creates a side-effect that runs when accessed atom(s) change.
 *
 * Effects are similar to derived atoms but for side-effects rather than computed values.
 * They inherit derived's behavior:
 * - **Suspense-like async**: Waits for async atoms to resolve before running
 * - **Conditional dependencies**: Only tracks atoms actually accessed via `get()`
 * - **Automatic cleanup**: Previous cleanup runs before next execution
 * - **Batched updates**: Atom updates within the effect are batched
 *
 * ## IMPORTANT: Effect Function Must Be Synchronous
 *
 * **The effect function MUST NOT be async or return a Promise.**
 *
 * ```ts
 * // ❌ WRONG - Don't use async function
 * effect(async ({ get }) => {
 *   const data = await fetch('/api');
 *   console.log(data);
 * });
 *
 * // ✅ CORRECT - Create async atom and read with get()
 * const data$ = atom(fetch('/api').then(r => r.json()));
 * effect(({ get }) => {
 *   console.log(get(data$)); // Suspends until resolved
 * });
 * ```
 *
 * ## Basic Usage
 *
 * ```ts
 * const dispose = effect(({ get }) => {
 *   localStorage.setItem('count', String(get(countAtom)));
 * });
 * ```
 *
 * ## With Cleanup
 *
 * Use `onCleanup` to register cleanup functions that run before the next execution or on dispose:
 *
 * ```ts
 * const dispose = effect(({ get, onCleanup }) => {
 *   const interval = get(intervalAtom);
 *   const id = setInterval(() => console.log('tick'), interval);
 *   onCleanup(() => clearInterval(id));
 * });
 * ```
 *
 * ## Error Handling
 *
 * Use `onError` callback to handle errors within the effect, or `options.onError` for unhandled errors:
 *
 * ```ts
 * // Callback-based error handling
 * const dispose = effect(({ get, onError }) => {
 *   onError((e) => console.error('Effect failed:', e));
 *   const data = get(dataAtom);
 *   riskyOperation(data);
 * });
 *
 * // Option-based error handling (for unhandled errors)
 * const dispose = effect(
 *   ({ get }) => {
 *     const data = get(dataAtom);
 *     riskyOperation(data);
 *   },
 *   { onError: (e) => console.error('Effect failed:', e) }
 * );
 * ```
 *
 * @param fn - Effect callback receiving context with `{ get, all, any, race, settled, onCleanup, onError }`.
 *             Must be synchronous (not async).
 * @param options - Optional configuration (key, onError for unhandled errors)
 * @returns Dispose function to stop the effect and run final cleanup
 * @throws Error if effect function returns a Promise
 */
export function effect(fn: EffectFn, options?: EffectOptions): VoidFunction {
  let disposed = false;
  const cleanupEmitter = emitter();
  const errorEmitter = emitter<unknown>();

  // Create a derived atom that runs the effect on each recomputation.
  const derivedAtom = derived((context) => {
    // Run previous cleanup before next execution
    errorEmitter.clear();
    cleanupEmitter.emitAndClear();

    // Skip effect execution if disposed
    if (disposed) return;

    try {
      // Run effect in a batch - multiple atom updates will only notify once
      batch(() =>
        fn({
          ...context,
          onCleanup: cleanupEmitter.on,
          onError: errorEmitter.on,
        })
      );
    } catch (error) {
      if (isPromiseLike(error)) {
        // let derived atom handle the promise
        throw error;
      }
      // Emit to registered handlers, or fall back to options.onError
      if (errorEmitter.size() > 0) {
        errorEmitter.emitAndClear(error);
      } else if (options?.onError && error instanceof Error) {
        options.onError(error);
      }
    }
  });

  // Access .value to trigger initial computation (derived is lazy)
  // Handle the promise
  derivedAtom.value.catch((error) => {
    if (options?.onError && error instanceof Error) {
      options.onError(error);
    }
    // Silently ignore if no error handler
  });

  return () => {
    // Guard against multiple dispose calls
    if (disposed) return;

    // Mark as disposed
    disposed = true;
    errorEmitter.clear();
    // Run final cleanup
    cleanupEmitter.emitAndClear();
  };
}
