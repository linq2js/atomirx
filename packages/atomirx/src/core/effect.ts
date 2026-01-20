import { batch } from "./batch";
import { derived } from "./derived";
import { emitter } from "./emitter";
import { EffectInfo, onCreateHook } from "./onCreateHook";
import { ReactiveSelector, SelectContext } from "./select";
import { EffectMeta, EffectOptions } from "./types";
import { WithReadySelectContext } from "./withReady";

/**
 * Context object passed to effect functions.
 * Extends `SelectContext` with cleanup utilities.
 */
export interface EffectContext extends SelectContext, WithReadySelectContext {
  /**
   * Register a cleanup function that runs before the next execution or on dispose.
   * Multiple cleanup functions can be registered; they run in FIFO order.
   *
   * @param cleanup - Function to run during cleanup
   *
   * @example
   * ```ts
   * effect(({ read, onCleanup }) => {
   *   const id = setInterval(() => console.log('tick'), 1000);
   *   onCleanup(() => clearInterval(id));
   * });
   * ```
   */
  onCleanup: (cleanup: VoidFunction) => void;
}

export interface Effect {
  dispose: VoidFunction;
  meta?: EffectMeta;
}

/**
 * Creates a side-effect that runs when accessed atom(s) change.
 *
 * Effects are similar to derived atoms but for side-effects rather than computed values.
 * They inherit derived's behavior:
 * - **Suspense-like async**: Waits for async atoms to resolve before running
 * - **Conditional dependencies**: Only tracks atoms actually accessed via `read()`
 * - **Automatic cleanup**: Previous cleanup runs before next execution
 * - **Batched updates**: Atom updates within the effect are batched
 *
 * ## IMPORTANT: Effect Function Must Be Synchronous
 *
 * **The effect function MUST NOT be async or return a Promise.**
 *
 * ```ts
 * // ❌ WRONG - Don't use async function
 * effect(async ({ read }) => {
 *   const data = await fetch('/api');
 *   console.log(data);
 * });
 *
 * // ✅ CORRECT - Create async atom and read with read()
 * const data$ = atom(fetch('/api').then(r => r.json()));
 * effect(({ read }) => {
 *   console.log(read(data$)); // Suspends until resolved
 * });
 * ```
 *
 * ## Basic Usage
 *
 * ```ts
 * const dispose = effect(({ read }) => {
 *   localStorage.setItem('count', String(read(countAtom)));
 * });
 * ```
 *
 * ## With Cleanup
 *
 * Use `onCleanup` to register cleanup functions that run before the next execution or on dispose:
 *
 * ```ts
 * const dispose = effect(({ read, onCleanup }) => {
 *   const interval = read(intervalAtom);
 *   const id = setInterval(() => console.log('tick'), interval);
 *   onCleanup(() => clearInterval(id));
 * });
 * ```
 *
 * ## IMPORTANT: Do NOT Use try/catch - Use safe() Instead
 *
 * **Never wrap `read()` calls in try/catch blocks.** The `read()` function throws
 * Promises when atoms are loading (Suspense pattern). A try/catch will catch
 * these Promises and break the Suspense mechanism.
 *
 * ```ts
 * // ❌ WRONG - Catches Suspense Promise, breaks loading state
 * effect(({ read }) => {
 *   try {
 *     const data = read(asyncAtom$);
 *     riskyOperation(data);
 *   } catch (e) {
 *     console.error(e); // Catches BOTH errors AND loading promises!
 *   }
 * });
 *
 * // ✅ CORRECT - Use safe() to catch errors but preserve Suspense
 * effect(({ read, safe }) => {
 *   const [err, data] = safe(() => {
 *     const raw = read(asyncAtom$);    // Can throw Promise (Suspense)
 *     return riskyOperation(raw);      // Can throw Error
 *   });
 *
 *   if (err) {
 *     console.error('Operation failed:', err);
 *     return;
 *   }
 *   // Use data safely
 * });
 * ```
 *
 * The `safe()` utility:
 * - **Catches errors** and returns `[error, undefined]`
 * - **Re-throws Promises** to preserve Suspense behavior
 * - Returns `[undefined, result]` on success
 *
 * @param fn - Effect callback receiving context with `{ read, all, any, race, settled, safe, onCleanup }`.
 *             Must be synchronous (not async).
 * @param options - Optional configuration (key)
 * @returns Dispose function to stop the effect and run final cleanup
 * @throws Error if effect function returns a Promise
 */
export function effect(
  fn: ReactiveSelector<void, EffectContext>,
  options?: EffectOptions
): Effect {
  let disposed = false;
  const cleanupEmitter = emitter();

  // Create the Effect object early so we can build EffectInfo
  const e: Effect = {
    meta: options?.meta,
    dispose: () => {
      // Guard against multiple dispose calls
      if (disposed) return;

      // Mark as disposed
      disposed = true;
      // Run final cleanup
      cleanupEmitter.emitAndClear();
    },
  };

  // Create EffectInfo to pass to derived for error attribution
  const effectInfo: EffectInfo = {
    type: "effect",
    key: options?.meta?.key,
    meta: options?.meta,
    instance: e,
  };

  // Create a derived atom that runs the effect on each recomputation.
  // Pass _errorSource so errors are attributed to the effect, not the internal derived
  const derivedAtom = derived(
    (context) => {
      // Run previous cleanup before next execution
      cleanupEmitter.emitAndClear();

      // Skip effect execution if disposed
      if (disposed) return;

      // Run effect in a batch - multiple atom updates will only notify once
      // Cast to EffectContext since we're adding onCleanup to the DerivedContext
      const effectContext = {
        ...context,
        onCleanup: cleanupEmitter.on,
      } as unknown as EffectContext;
      batch(() => fn(effectContext));
    },
    {
      onError: options?.onError,
      _errorSource: effectInfo,
    }
  );

  // Access .get() to trigger initial computation (derived is lazy)
  // Errors are handled via onError callback or safe() in the effect function
  derivedAtom.get();

  // Notify devtools/plugins of effect creation
  onCreateHook.current?.(effectInfo);

  return e;
}
