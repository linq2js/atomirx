import { hook } from "./hook";
import { CreateInfo } from "./onCreateHook";

/**
 * Information provided when an error occurs in an atom, derived, or effect.
 */
export interface ErrorInfo {
  /** The source that produced the error (atom, derived, or effect) */
  source: CreateInfo;
  /** The error that was thrown */
  error: unknown;
}

/**
 * Global hook that fires whenever an error occurs in a derived atom or effect.
 *
 * This is useful for:
 * - **Global error logging** - capture all errors in one place
 * - **Error monitoring** - send errors to monitoring services (Sentry, etc.)
 * - **DevTools integration** - show errors in developer tools
 * - **Debugging** - track which atoms/effects are failing
 *
 * **IMPORTANT**: Always use `.override()` to preserve the hook chain.
 * Direct assignment to `.current` will break existing handlers.
 *
 * @example Basic logging
 * ```ts
 * onErrorHook.override((prev) => (info) => {
 *   prev?.(info); // call existing handlers first
 *   console.error(`Error in ${info.source.type}: ${info.source.key ?? "anonymous"}`, info.error);
 * });
 * ```
 *
 * @example Send to monitoring service
 * ```ts
 * onErrorHook.override((prev) => (info) => {
 *   prev?.(info); // preserve chain
 *   Sentry.captureException(info.error, {
 *     tags: {
 *       source_type: info.source.type,
 *       source_key: info.source.key,
 *     },
 *   });
 * });
 * ```
 *
 * @example Reset to default (disable all handlers)
 * ```ts
 * onErrorHook.reset();
 * ```
 */
export const onErrorHook = hook<(info: ErrorInfo) => void>();
