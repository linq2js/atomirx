import { isPromiseLike } from "./isPromiseLike";
import { isAtom } from "./isAtom";
import { trackPromise } from "./promiseCache";
import { SelectContext } from "./select";
import { Atom, KeyedResult, NonNullableKeyedResult } from "./types";

/**
 * Extension interface that adds `ready()` method to SelectContext.
 * Used in derived atoms and effects to wait for non-null values.
 */
export interface WithReadyContext {
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

  /**
   * Wait for a KeyedResult (from race/any) to have non-null/non-undefined value.
   *
   * If the value is null/undefined, the computation suspends until
   * re-executed with a non-null value. Preserves discriminated union behavior.
   *
   * **IMPORTANT: Only use in `derived()` or `effect()` context**
   *
   * @param result - KeyedResult from race() or any()
   * @returns KeyedResult with value guaranteed non-null, narrowing preserved
   *
   * @example
   * ```ts
   * // Use with race() - suspend if winning value is null/undefined
   * const winner$ = derived(({ ready, race }) => {
   *   const result = ready(race({ cache: cache$, api: api$ }));
   *   // result.value is guaranteed non-null
   *   // Type narrowing still works:
   *   if (result.key === "cache") {
   *     result.value; // narrowed to cache type (non-null)
   *   }
   *   return { source: result.key, data: result.value };
   * });
   * ```
   */
  ready<T extends Record<string, unknown>>(
    result: KeyedResult<T>
  ): NonNullableKeyedResult<T>;

  /**
   * Wait for all values in a tuple to be non-null/non-undefined.
   *
   * If any value is null/undefined, the computation suspends until
   * re-executed with all non-null values.
   *
   * **IMPORTANT: Only use in `derived()` or `effect()` context**
   *
   * This overload is designed for use with async combinators like `all()`
   * to ensure all returned values are ready.
   *
   * @param values - Tuple of values to check (typically from all())
   * @returns The same tuple with null/undefined excluded from each element type
   *
   * @example
   * ```ts
   * // Use with all() - suspend if any atom value is null/undefined
   * const combined$ = derived(({ ready, all }) => {
   *   const [user, posts] = ready(all([user$, posts$]));
   *   // user and posts are guaranteed non-null
   *   return { user, posts };
   * });
   * ```
   */
  ready<const A extends readonly unknown[]>(
    values: A
  ): { [K in keyof A]: Exclude<A[K], null | undefined> };
}

/**
 * Internal helper that suspends computation if value is null/undefined.
 */
function waitForValue<T>(value: T): any {
  if (value === undefined || value === null) {
    throw new Promise(() => {});
  }

  // Handle async selectors: when the selector returns a Promise,
  // we track its state and handle suspension/resolution accordingly
  if (isPromiseLike(value)) {
    const p = trackPromise(value);

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
 * const { result } = select((context) => fn(context.use(withReady())));
 * ```
 */
/**
 * Check if all values in array are non-null/non-undefined.
 * Throws never-resolve promise if any value is null/undefined.
 */
function waitForAllValues<A extends readonly unknown[]>(values: A): A {
  for (const value of values) {
    if (value === undefined || value === null) {
      throw new Promise(() => {});
    }
  }
  return values;
}

export function withReady() {
  return <TContext extends SelectContext>(
    context: TContext
  ): TContext & WithReadyContext => {
    return {
      ...context,
      ready: (
        atomOrValues: Atom<any> | readonly unknown[],
        selector?: (current: any) => any
      ): any => {
        // Array overload: check each element for null/undefined
        if (Array.isArray(atomOrValues)) {
          return waitForAllValues(atomOrValues);
        }

        // Must be an atom at this point
        if (!isAtom(atomOrValues)) {
          throw new Error(
            "ready() expects an Atom or an array of values. " +
              "Use ready(atom$) or ready(atom$, selector) for atoms, " +
              "or ready(values) for arrays from all()/race()/any()."
          );
        }

        const value = context.read(atomOrValues);
        // we allow selector to return a promise, and wait for that promise if it is not resolved yet
        const selected = selector ? selector(value) : value;

        return waitForValue(selected);
      },
    };
  };
}
