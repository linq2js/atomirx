/**
 * @fileoverview Hook for monitoring action dispatch lifecycle events.
 *
 * This hook enables devtools, logging, and analytics integrations
 * by providing visibility into action execution states.
 *
 * @module react/onDispatchHook
 */

import { hook } from "../core/hook";
import { ActionMeta } from "./useAction";

/**
 * Information provided when an action dispatch event occurs.
 *
 * ## Lifecycle Flow
 *
 * ```
 * dispatch(deps)
 *      │
 *      ▼
 *   "start"  ─── Action invoked
 *      │
 *      ▼
 *   "loading" ── Async operation in progress (if async)
 *      │
 *   ┌──┴──┐
 *   │     │
 *   ▼     ▼
 * "success"  "error" ── Sync result
 *   │         │
 *   │         │
 *   ▼         ▼
 * "resolved" "rejected" ── Async result (if Promise)
 *
 * "abort" ── Called if action is cancelled mid-flight
 * ```
 */
export interface DispatchInfo {
  /**
   * The current dispatch lifecycle state.
   *
   * - `start` - Action was invoked (always first event)
   * - `loading` - Async operation is in progress
   * - `abort` - Action was cancelled (e.g., deps changed, unmount)
   * - `error` - Sync error thrown during execution
   * - `success` - Sync execution completed successfully
   * - `resolved` - Async Promise resolved successfully
   * - `rejected` - Async Promise was rejected
   */
  readonly type:
    | "start"
    | "loading"
    | "abort"
    | "error"
    | "success"
    | "resolved"
    | "rejected";

  /**
   * Action metadata (key, description, etc.).
   * Undefined if action was created without meta options.
   */
  readonly meta: ActionMeta | undefined;

  /**
   * Dependencies passed to the action.
   * Same deps array that was passed to dispatch().
   */
  readonly deps: unknown[];

  /**
   * Error information (only present for "error" and "rejected" types).
   */
  readonly error?: unknown | undefined;
}

/**
 * Global hook that fires on action dispatch lifecycle events.
 *
 * This hook is useful for:
 * - **DevTools integration** - Log action dispatches for debugging
 * - **Analytics** - Track action usage patterns
 * - **Error monitoring** - Capture action failures
 * - **Performance monitoring** - Measure action duration
 *
 * **IMPORTANT**: Always use `.override()` to preserve the hook chain.
 * Direct assignment to `.current` will break existing handlers.
 *
 * @example Basic logging
 * ```ts
 * onDispatchHook.override((prev) => (info) => {
 *   prev?.(info); // Call existing handlers first
 *   console.log(`Action ${info.meta?.key ?? "anonymous"}: ${info.type}`);
 * });
 * ```
 *
 * @example Error tracking
 * ```ts
 * onDispatchHook.override((prev) => (info) => {
 *   prev?.(info);
 *   if (info.type === "error" || info.type === "rejected") {
 *     reportError(info.error, { action: info.meta?.key });
 *   }
 * });
 * ```
 *
 * @example Performance monitoring
 * ```ts
 * const actionTimings = new Map<string, number>();
 *
 * onDispatchHook.override((prev) => (info) => {
 *   prev?.(info);
 *   const key = info.meta?.key ?? "anonymous";
 *
 *   if (info.type === "start") {
 *     actionTimings.set(key, Date.now());
 *   } else if (info.type === "resolved" || info.type === "rejected") {
 *     const start = actionTimings.get(key);
 *     if (start) {
 *       console.log(`Action ${key} took ${Date.now() - start}ms`);
 *       actionTimings.delete(key);
 *     }
 *   }
 * });
 * ```
 */
export const onDispatchHook = hook<(info: DispatchInfo) => void>();
