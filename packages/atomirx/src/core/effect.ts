import { batch } from "./batch";
import { derived } from "./derived";
import { SelectContext } from "./select";

/**
 * Callback function for effects.
 * Receives the select context with `{ get, all, any, race, settled }` utilities.
 * Can optionally return a cleanup function that runs before the next execution
 * or when the effect is disposed.
 */
export type EffectFn = (context: SelectContext) => void | VoidFunction;

/**
 * Creates a side-effect that runs when accessed atom(s) change.
 *
 * Effects are similar to derived atoms but for side-effects rather than computed values.
 * They inherit derived's behavior:
 * - **Suspense-like async**: Waits for async atoms to resolve before running
 * - **Conditional dependencies**: Only tracks atoms actually accessed via `get()`
 * - **Automatic cleanup**: Previous cleanup runs before next execution
 * - **Batched updates**: Atom updates within the effect are batched (single notification)
 *
 * ## Basic Usage
 *
 * ```ts
 * const dispose = effect(({ get }) => {
 *   localStorage.setItem('count', String(get(countAtom)));
 * });
 * ```
 *
 * ## Multiple Atoms
 *
 * ```ts
 * const dispose = effect(({ get }) => {
 *   const user = get(userAtom);
 *   const settings = get(settingsAtom);
 *   analytics.identify(user.id, settings);
 * });
 * ```
 *
 * ## With Cleanup
 *
 * Return a function to clean up before the next run or on dispose:
 *
 * ```ts
 * const dispose = effect(({ get }) => {
 *   const interval = get(intervalAtom);
 *   const id = setInterval(() => console.log('tick'), interval);
 *   return () => clearInterval(id); // Cleanup
 * });
 * ```
 *
 * ## With Async Atoms
 *
 * Effects wait for async atoms to resolve (Suspense-like behavior):
 *
 * ```ts
 * const dispose = effect(({ all }) => {
 *   // Only runs when BOTH atoms are resolved
 *   const [user, config] = all([asyncUserAtom, asyncConfigAtom]);
 *   initializeApp(user, config);
 * });
 * ```
 *
 * ## Memory Behavior
 *
 * After dispose, the underlying derived atom continues to exist and recompute
 * on source changes, but the effect callback is skipped. This is a trade-off
 * for simpler implementation. For long-lived effects this is negligible;
 * for many short-lived effects, be aware of potential memory accumulation.
 *
 * @param fn - Effect callback receiving context with `{ get, all, any, race, settled }`.
 *             May return a cleanup function.
 * @returns Dispose function to stop the effect and run final cleanup
 *
 * @example Persisting state
 * ```ts
 * const dispose = effect(({ get }) => {
 *   localStorage.setItem('app-state', JSON.stringify(get(stateAtom)));
 * });
 * ```
 *
 * @example Syncing to external system
 * ```ts
 * const dispose = effect(({ get }) => {
 *   const auth = get(authAtom);
 *   const data = get(dataAtom);
 *   const ws = new WebSocket(auth.endpoint);
 *   ws.send(JSON.stringify(data));
 *   return () => ws.close();
 * });
 * ```
 *
 * @example Using async utilities
 * ```ts
 * const dispose = effect(({ all }) => {
 *   const [user, posts] = all([userAtom, postsAtom]);
 *   console.log(`${user.name} has ${posts.length} posts`);
 * });
 * ```
 */
export function effect(fn: EffectFn): VoidFunction {
  let disposed = false;
  let cleanup: VoidFunction | undefined;

  // Create a derived atom that runs the effect on each recomputation.
  // Using derived gives us: dependency tracking, async handling, and batching.
  void derived((context) => {
    // Run previous cleanup before next execution
    cleanup?.();

    // Skip effect execution if disposed
    if (disposed) return;

    // Run effect in a batch - multiple atom updates will only notify once
    const nextCleanup = batch(() => fn(context));
    if (typeof nextCleanup === "function") {
      cleanup = () => {
        try {
          nextCleanup();
        } finally {
          cleanup = undefined;
        }
      };
    }
  }).value; // Access .value to trigger initial computation (derived is lazy)

  return () => {
    // Guard against multiple dispose calls
    if (disposed) return;

    // Mark as disposed - the derived atom continues to recompute on source
    // changes, but the effect callback will be skipped (early return above)
    disposed = true;

    // Run final cleanup
    cleanup?.();
  };
}
