import { isPromiseLike } from "./isPromiseLike";
import { trackPromise } from "./promiseCache";
import { SelectContext } from "./select";
import { Atom } from "./types";

/**
 * Extension interface that adds `ready()` method to SelectContext.
 * Used in derived atoms and effects to wait for non-null values.
 */
export interface WithReadySelectContext {
  /**
   * Wait for an atom to have a non-null/non-undefined value.
   *
   * If the value is null/undefined, the computation suspends until the atom
   * changes to a non-null value, then automatically resumes.
   *
   * **IMPORTANT: Only use in `derived()` or `effect()` context**
   *
   * @param atom - The atom to read and wait for
   * @returns The non-null value (type excludes null | undefined)
   *
   * @example
   * ```ts
   * // Wait for currentArticleId to be set before computing
   * const currentArticle$ = derived(({ ready, read }) => {
   *   const id = ready(currentArticleId$); // Suspends if null
   *   const cache = read(articleCache$);
   *   return cache[id];
   * });
   * ```
   */
  ready<T>(
    atom: Atom<T>
  ): T extends PromiseLike<any> ? never : Exclude<T, null | undefined>;

  /**
   * Wait for a selected value from an atom to be non-null/non-undefined.
   *
   * If the selected value is null/undefined, the computation suspends until the
   * selected value changes to a non-null value, then automatically resumes.
   *
   * **IMPORTANT: Only use in `derived()` or `effect()` context**
   *
   * @param atom - The atom to read
   * @param selector - Function to extract/transform the value
   * @returns The non-null selected value
   *
   * @example
   * ```ts
   * // Wait for user's email to be set
   * const emailDerived$ = derived(({ ready }) => {
   *   const email = ready(user$, u => u.email); // Suspends if email is null
   *   return `Contact: ${email}`;
   * });
   * ```
   */
  ready<T, R>(
    atom: Atom<T>,
    selector: (current: Awaited<T>) => R
  ): R extends PromiseLike<any> ? never : Exclude<R, null | undefined>;
}

/**
 * Internal helper that suspends computation if value is null/undefined.
 */
function waitForValue<T>(value: T): Exclude<T, null | undefined> {
  if (value === undefined || value === null) {
    throw new Promise(() => {});
  }
  return value as Exclude<T, null | undefined>;
}

/**
 * Plugin that adds `ready()` method to a SelectContext.
 *
 * `ready()` enables a "reactive suspension" pattern where derived atoms
 * wait for required values before computing. This is useful for:
 *
 * - Route-based entity loading (`/article/:id` - wait for ID to be set)
 * - Authentication-gated content (wait for user to be logged in)
 * - Conditional data dependencies (wait for prerequisite data)
 *
 * @example
 * ```ts
 * // Used internally by derived() - you don't need to call this directly
 * const result = select((context) => fn(context.use(withReady())));
 * ```
 */
export function withReady() {
  return <TContext extends SelectContext>(
    context: TContext
  ): TContext & WithReadySelectContext => {
    return {
      ...context,
      ready: (atom: Atom<any>, selector?: (current: any) => any): any => {
        const value = context.read(atom);
        // we allow selector to return a promise, and wait for that promise if it is not resolved yet
        const selected = selector ? selector(value) : value;
        // Handle async selectors: when the selector returns a Promise,
        // we track its state and handle suspension/resolution accordingly
        if (isPromiseLike(selected)) {
          const p = trackPromise(selected);

          // Promise is still pending - suspend computation by throwing
          // the tracked promise. This enables React Suspense integration.
          if (p.status === "pending") {
            throw p.promise;
          }

          // Promise resolved successfully - return the resolved value.
          // Note: This bypasses null/undefined checking for async results,
          // allowing async selectors to return any value including null.
          if (p.status === "fulfilled") {
            return p.value;
          }

          // Promise rejected - propagate the error
          throw p.error;
        }

        // For sync values (no selector, or selector returned sync value),
        // check for null/undefined and suspend if not ready
        return waitForValue(selected);
      },
    };
  };
}
