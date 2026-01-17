import { Getter } from './types';
/**
 * Status of a getter after invocation.
 */
export type GetterStatusResult<T> = {
    status: "resolved";
    value: T;
    error: undefined;
    promise: undefined;
} | {
    status: "rejected";
    value: undefined;
    error: unknown;
    promise: undefined;
} | {
    status: "loading";
    value: undefined;
    error: undefined;
    promise: PromiseLike<unknown>;
};
/**
 * Detect the status of a getter by invoking it.
 *
 * - If getter returns a value → resolved
 * - If getter throws a PromiseLike → loading
 * - If getter throws anything else → rejected (error)
 *
 * @param getter - The getter function to invoke
 * @returns The status result with value, error, or promise
 *
 * @example
 * ```ts
 * const status = getterStatus(myGetter);
 * if (status.status === 'resolved') {
 *   console.log(status.value);
 * } else if (status.status === 'loading') {
 *   await status.promise;
 * } else {
 *   console.error(status.error);
 * }
 * ```
 */
export declare function getterStatus<T>(getter: Getter<T>): GetterStatusResult<T>;
/**
 * Result type for settled getter.
 */
export type SettledResult<T> = {
    status: "resolved";
    value: T;
} | {
    status: "rejected";
    error: unknown;
};
/**
 * Custom AggregateError for ES2020 compatibility.
 * Represents multiple errors wrapped in a single error.
 */
export declare class AllGettersRejectedError extends Error {
    readonly errors: unknown[] | Record<string, unknown>;
    constructor(errors: unknown[] | Record<string, unknown>, message?: string);
}
/**
 * Returns the first settled getter's value with its key (like Promise.race).
 *
 * Suspense-mode API - no await needed:
 * - If any getter is resolved → returns `[key, value]` tuple
 * - If any getter is rejected (and no resolved before it) → throws that error
 * - If all getters are loading → throws `Promise.race(pendingPromises)`
 *
 * @param getters - Object of getter functions
 * @returns Tuple of [winner key, value] of first settled, or throws error/promise
 *
 * @example
 * ```ts
 * const [winner, value] = race({ user: getUser, cache: getCache });
 * ```
 */
export declare function race<T extends Record<string, Getter<unknown>>>(getters: T): [keyof T & string, ReturnType<T[keyof T]>];
/**
 * Returns all getter values as an array when all are resolved (like Promise.all).
 *
 * Suspense-mode API - no await needed:
 * - If all getters are resolved → returns array of values
 * - If any getter is rejected → throws that error immediately
 * - If any getter is loading (and none rejected) → throws `Promise.all(pendingPromises)`
 *
 * @param getters - Array of getter functions
 * @returns Array of all resolved values, or throws error/promise
 *
 * @example
 * ```ts
 * const [user, settings, prefs] = all([getUser, getSettings, getPrefs]);
 * ```
 */
export declare function all<const T extends readonly Getter<unknown>[]>(getters: T): {
    [K in keyof T]: T[K] extends Getter<infer U> ? U : never;
};
/**
 * Returns all getter values as an object when all are resolved (like Promise.all).
 *
 * Suspense-mode API - no await needed:
 * - If all getters are resolved → returns object with all values
 * - If any getter is rejected → throws that error immediately
 * - If any getter is loading (and none rejected) → throws `Promise.all(pendingPromises)`
 *
 * @param getters - Object of getter functions
 * @returns Object with all resolved values, or throws error/promise
 *
 * @example
 * ```ts
 * const { user, settings } = all({ user: getUser, settings: getSettings });
 * ```
 */
export declare function all<T extends Record<string, Getter<unknown>>>(getters: T): {
    [K in keyof T]: T[K] extends Getter<infer U> ? U : never;
};
/**
 * Returns the first resolved getter's value with its key (like Promise.any).
 *
 * Suspense-mode API - no await needed:
 * - If any getter is resolved → returns `[key, value]` tuple (skips errors)
 * - If all getters are rejected → throws `AllGettersRejectedError`
 * - If some are loading and rest are rejected → throws `promiseAny(pendingPromises)`
 *
 * @param getters - Object of getter functions
 * @returns Tuple of [winner key, value] of first resolved, or throws AllGettersRejectedError/promise
 *
 * @example
 * ```ts
 * const [winner, value] = any({ primary: getPrimary, fallback: getFallback });
 * ```
 */
export declare function any<T extends Record<string, Getter<unknown>>>(getters: T): [keyof T & string, ReturnType<T[keyof T]>];
/**
 * Returns the status of all getters as an array when all are settled (like Promise.allSettled).
 *
 * Suspense-mode API - no await needed:
 * - If all getters are settled (resolved or rejected) → returns array of statuses
 * - If any getter is loading → throws `Promise.all(pendingPromises)`
 *
 * @param getters - Array of getter functions
 * @returns Array of settled results, or throws promise
 *
 * @example
 * ```ts
 * const results = settled([getUser, getSettings]);
 * for (const result of results) {
 *   if (result.status === 'resolved') {
 *     console.log(result.value);
 *   } else {
 *     console.error(result.error);
 *   }
 * }
 * ```
 */
export declare function settled<const T extends readonly Getter<unknown>[]>(getters: T): {
    [K in keyof T]: T[K] extends Getter<infer U> ? SettledResult<U> : never;
};
/**
 * Returns the status of all getters as an object when all are settled (like Promise.allSettled).
 *
 * Suspense-mode API - no await needed:
 * - If all getters are settled (resolved or rejected) → returns object with statuses
 * - If any getter is loading → throws `Promise.all(pendingPromises)`
 *
 * @param getters - Object of getter functions
 * @returns Object with settled results, or throws promise
 *
 * @example
 * ```ts
 * const { user, settings } = settled({ user: getUser, settings: getSettings });
 * if (user.status === 'resolved') {
 *   console.log(user.value);
 * } else {
 *   console.error(user.error);
 * }
 * ```
 */
export declare function settled<T extends Record<string, Getter<unknown>>>(getters: T): {
    [K in keyof T]: T[K] extends Getter<infer U> ? SettledResult<U> : never;
};
