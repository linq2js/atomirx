import { SelectContext } from "./select";

/**
 * Extended context providing abort capabilities.
 *
 * Added to the select context when using `withAbort()` extension.
 */
export interface WithAbortContext {
  /**
   * AbortSignal that is automatically aborted when the effect/derived
   * re-runs or is disposed. Use this to cancel async operations.
   *
   * @example
   * ```ts
   * effect(({ read, onCleanup }) => {
   *   const ctx = context.use(withAbort(onCleanup));
   *   fetch('/api/data', { signal: ctx.signal });
   * });
   * ```
   */
  readonly signal: AbortSignal;

  /**
   * Manually trigger abort. Safe to call multiple times - subsequent
   * calls after the first abort are no-ops.
   *
   * @example
   * ```ts
   * effect(({ read, onCleanup }) => {
   *   const ctx = context.use(withAbort(onCleanup));
   *   if (shouldCancel) ctx.abort();
   * });
   * ```
   */
  abort(): void;
}

/**
 * Context extension that provides an AbortSignal for cancellation.
 *
 * Use this to cancel async operations (fetch, timers, etc.) when an
 * effect or derived atom re-runs or is disposed. The signal is
 * automatically aborted when the cleanup function runs.
 *
 * ## Usage Pattern
 *
 * The `withAbort` function takes an `onCleanup` registration function
 * and returns a context extender that can be used with `.use()`:
 *
 * ```ts
 * effect(({ read, onCleanup }) => {
 *   const ctx = context.use(withAbort(onCleanup));
 *
 *   // Signal is aborted when effect re-runs or disposes
 *   fetch('/api/data', { signal: ctx.signal })
 *     .then(r => r.json())
 *     .then(data => results$.set(data));
 * });
 * ```
 *
 * ## Key Features
 *
 * - **Automatic cleanup**: Signal aborts when `onCleanup` fires
 * - **Manual abort**: Call `ctx.abort()` to cancel immediately
 * - **Safe re-abort**: Multiple `abort()` calls are no-ops
 *
 * @param onCleanup - Cleanup registration function (from effect context)
 * @returns Context extender function for use with `.use()`
 *
 * @example Basic fetch cancellation
 * ```ts
 * effect(({ read, onCleanup }) => {
 *   const userId = read(userId$);
 *   const ctx = context.use(withAbort(onCleanup));
 *
 *   fetch(`/api/users/${userId}`, { signal: ctx.signal })
 *     .then(r => r.json())
 *     .then(user => user$.set(user))
 *     .catch(err => {
 *       if (err.name !== 'AbortError') throw err;
 *     });
 * });
 * ```
 *
 * @example With timeout
 * ```ts
 * effect(({ read, onCleanup }) => {
 *   const ctx = context.use(withAbort(onCleanup));
 *
 *   // Abort after 5 seconds
 *   const timeout = setTimeout(() => ctx.abort(), 5000);
 *   onCleanup(() => clearTimeout(timeout));
 *
 *   fetch('/api/slow', { signal: ctx.signal });
 * });
 * ```
 */
export function withAbort(onCleanup: (cleanup: VoidFunction) => void) {
  return <TContext extends SelectContext>(
    context: TContext
  ): TContext & WithAbortContext => {
    const abortController = new AbortController();

    // Register abort to run on cleanup (effect re-run or dispose)
    onCleanup(() => abortController.abort());

    return {
      ...context,
      signal: abortController.signal,
      // Safe abort - no-op if already aborted
      abort: () => !abortController.signal.aborted && abortController.abort(),
    };
  };
}
