/**
 * Options for configuring an abortable promise.
 */
export interface AbortableOptions {
  /**
   * External signal(s) to link. The abortable promise will abort when any
   * of these signals abort. Useful for hierarchical cancellation.
   *
   * @example Single signal
   * ```ts
   * const controller = new AbortController();
   * const req = abortable((signal) => fetch('/api', { signal }), {
   *   signal: controller.signal
   * });
   * controller.abort(); // Aborts the request
   * ```
   *
   * @example Multiple signals (e.g., timeout + user cancel)
   * ```ts
   * const req = abortable((signal) => fetch('/api', { signal }), {
   *   signal: [AbortSignal.timeout(5000), userCancelSignal]
   * });
   * ```
   */
  signal?: AbortSignal | AbortSignal[];

  /**
   * Callback invoked when the operation is aborted. Called once, regardless
   * of abort source (manual abort, linked signal, or inner AbortError).
   *
   * @param reason - The abort reason (string, Error, or any value)
   *
   * @example
   * ```ts
   * const req = abortable((signal) => fetch('/api', { signal }), {
   *   onAbort: (reason) => console.log('Aborted:', reason)
   * });
   * ```
   */
  onAbort?: (reason: unknown) => void;
}

/**
 * Promise with abort control capabilities.
 *
 * Extends the standard Promise interface with:
 * - `abort(reason?)` - Cancel the operation
 * - `aborted()` - Check if operation was aborted
 */
export interface AbortablePromise<T> extends Promise<T> {
  /**
   * Abort the operation with an optional reason.
   *
   * - Immediately rejects the promise with an AbortError
   * - Calls the `onAbort` callback if provided
   * - Signals abort to the inner function via its AbortSignal
   * - Safe to call multiple times (subsequent calls are no-ops)
   *
   * @param reason - Optional abort reason (passed to onAbort and error message)
   *
   * @example
   * ```ts
   * const req = abortable((signal) => fetch('/api', { signal }));
   * req.abort('User cancelled');
   * ```
   */
  abort(reason?: unknown): void;

  /**
   * Returns true if the operation was aborted.
   *
   * Aborted state is set when:
   * - `abort()` is called explicitly
   * - A linked signal aborts
   * - The inner function throws an AbortError
   *
   * @returns boolean indicating abort state
   *
   * @example
   * ```ts
   * const req = abortable((signal) => fetch('/api', { signal }));
   * req.abort();
   * console.log(req.aborted()); // true
   * ```
   */
  aborted(): boolean;
}

/**
 * Creates an AbortError (DOMException with name 'AbortError').
 *
 * @param reason - Optional reason for the abort (string, Error, or any value)
 * @returns DOMException with name 'AbortError'
 *
 * @example
 * ```ts
 * throw createAbortError('User cancelled');
 * throw createAbortError({ message: 'Timeout exceeded' });
 * ```
 */
export function createAbortError(reason?: unknown): DOMException {
  const message =
    (reason as { message?: string })?.message ??
    (typeof reason === "string" ? reason : "The operation was aborted");
  return new DOMException(message, "AbortError");
}

/**
 * Checks if an error is an AbortError.
 *
 * Returns true for:
 * - DOMException with name 'AbortError'
 * - Error with name 'AbortError'
 *
 * @param error - The error to check
 * @returns true if the error is an AbortError
 *
 * @example
 * ```ts
 * try {
 *   await abortableRequest;
 * } catch (e) {
 *   if (isAbortError(e)) {
 *     console.log('Request was cancelled');
 *   } else {
 *     throw e;
 *   }
 * }
 * ```
 */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/**
 * Wraps an async function with abort control.
 *
 * Returns a Promise that can be aborted, with automatic cleanup and
 * hierarchical cancellation support.
 *
 * ## Features
 *
 * - **Guaranteed rejection on abort**: Immediate rejection when abort is called
 * - **Hierarchical cancellation**: Link to parent signals for nested abort
 * - **Bidirectional abort detection**: Detects abort from both external and internal sources
 * - **Safe abort**: Multiple abort() calls are no-ops
 *
 * ## Behavior Table
 *
 * | Trigger                    | Promise         | aborted() | onAbort |
 * |----------------------------|-----------------|-----------|---------|
 * | `abort()` called           | Rejects         | `true`    | ✓       |
 * | Linked signal aborts       | Rejects         | `true`    | ✓       |
 * | Inner fn throws AbortError | Rejects         | `true`    | ✓       |
 * | Inner fn throws other      | Rejects         | `false`   | ✗       |
 * | Inner fn resolves          | Resolves        | `false`   | ✗       |
 *
 * @param fn - Function that receives an AbortSignal. Can return sync value or Promise.
 * @param options - Optional configuration (linked signals, onAbort callback)
 * @returns AbortablePromise with abort() and aborted() methods
 *
 * @example Basic usage with async function
 * ```ts
 * const req = abortable((signal) => fetch('/api', { signal }));
 * req.abort('User cancelled');
 * console.log(req.aborted()); // true
 * ```
 *
 * @example Sync function (always returns a Promise)
 * ```ts
 * const result = await abortable(() => computeExpensiveValue());
 * ```
 *
 * @example With timeout and cleanup
 * ```ts
 * const req = abortable(
 *   (signal) => fetch('/api/slow', { signal }),
 *   {
 *     signal: AbortSignal.timeout(5000),
 *     onAbort: () => console.log('Request timed out or cancelled')
 *   }
 * );
 * ```
 *
 * @example Composing nested abortable operations
 * ```ts
 * const parent = abortable(async (signal) => {
 *   const a = await abortable((s) => fetchA(s), { signal });
 *   const b = await abortable((s) => fetchB(s), { signal });
 *   return { a, b };
 * });
 * parent.abort(); // Cancels entire chain
 * ```
 *
 * @example Component unmount pattern
 * ```ts
 * const unmountController = new AbortController();
 *
 * // In component effect
 * const req = abortable(
 *   (signal) => fetchUserData(signal),
 *   { signal: unmountController.signal }
 * );
 *
 * // On unmount
 * unmountController.abort();
 * ```
 */
export function abortable<T>(
  fn: (signal: AbortSignal) => T | Promise<T>,
  options?: AbortableOptions
): AbortablePromise<T> {
  const controller = new AbortController();
  const signal = controller.signal;

  return Object.assign(
    new Promise<T>(async (resolve, reject) => {
      try {
        // Track parent signal listeners for cleanup
        const subscriptions = new Map<AbortSignal, VoidFunction>();

        // Central abort handler - cleans up listeners and rejects promise
        const handleAbort = () => {
          // Remove all parent signal listeners to prevent memory leaks
          subscriptions.forEach((listener, parentSignal) =>
            parentSignal.removeEventListener("abort", listener)
          );
          subscriptions.clear();

          // Reject with AbortError and notify callback
          reject(createAbortError(signal.reason));
          options?.onAbort?.(signal.reason);
        };

        // Listen for abort on our own signal (from manual abort() or parent cascade)
        signal.addEventListener("abort", handleAbort, { once: true });

        // Link parent signals - when any parent aborts, abort our controller
        const parentSignals = options?.signal
          ? Array.isArray(options.signal)
            ? options.signal
            : [options.signal]
          : [];

        for (const parentSignal of parentSignals) {
          // If parent already aborted, abort immediately and exit
          if (parentSignal.aborted) {
            controller.abort(parentSignal.reason);
            return;
          }

          // Forward parent abort to our controller
          const listener = () => controller.abort(parentSignal.reason);
          subscriptions.set(parentSignal, listener);
          parentSignal.addEventListener("abort", listener, { once: true });
        }

        // Execute the function - await handles both sync and async returns
        const result = await fn(controller.signal);

        // Only resolve if not aborted (abort listener handles rejection)
        if (!signal.aborted) {
          resolve(result);
        }
      } catch (error) {
        if (isAbortError(error)) {
          // fn threw AbortError - trigger abort to fire handleAbort
          // This ensures onAbort is called and promise rejects properly
          if (!signal.aborted) {
            controller.abort();
          }
        } else {
          // Non-abort error - reject directly
          reject(error);
        }
      }
    }),
    {
      // Manual abort - triggers signal listener which calls handleAbort
      abort: (reason?: unknown) => controller.abort(reason),
      // Expose abort state via controller's signal
      aborted: () => controller.signal.aborted,
    }
  );
}
