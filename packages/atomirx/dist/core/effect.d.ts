import { Atom, Getter } from './types';
/**
 * Callback function for effects.
 * Can optionally return a cleanup function that runs before the next execution
 * or when the effect is disposed.
 *
 * @template TArgs - Tuple of getter function types
 */
export type EffectFn<TArgs extends any[]> = (...args: TArgs) => void | VoidFunction;
/**
 * Creates a side-effect that runs when source atom(s) change.
 *
 * Effects are similar to derived atoms but for side-effects rather than computed values.
 * They inherit derived's behavior:
 * - **Suspense-like async**: Waits for async atoms to resolve before running
 * - **Conditional dependencies**: Only tracks atoms actually accessed via getters
 * - **Automatic cleanup**: Previous cleanup runs before next execution
 * - **Batched updates**: Atom updates within the effect are batched (single notification)
 *
 * ## Single Source
 *
 * ```ts
 * const dispose = effect(countAtom, (getCount) => {
 *   localStorage.setItem('count', String(getCount()));
 * });
 * ```
 *
 * ## Multiple Sources
 *
 * ```ts
 * const dispose = effect([userAtom, settingsAtom], (getUser, getSettings) => {
 *   analytics.identify(getUser().id, getSettings());
 * });
 * ```
 *
 * ## With Cleanup
 *
 * Return a function to clean up before the next run or on dispose:
 *
 * ```ts
 * const dispose = effect(intervalAtom, (getInterval) => {
 *   const id = setInterval(() => console.log('tick'), getInterval());
 *   return () => clearInterval(id); // Cleanup
 * });
 * ```
 *
 * ## With Async Atoms
 *
 * Effects wait for async atoms to resolve (Suspense-like behavior):
 *
 * ```ts
 * const dispose = effect([asyncUserAtom, asyncConfigAtom], (getUser, getConfig) => {
 *   // Only runs when BOTH atoms are resolved
 *   initializeApp(getUser(), getConfig());
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
 * @param source - Single atom or array of atoms to observe
 * @param fn - Effect callback receiving getter(s). May return a cleanup function.
 * @returns Dispose function to stop the effect and run final cleanup
 *
 * @example Persisting state
 * ```ts
 * const dispose = effect(stateAtom, (getState) => {
 *   localStorage.setItem('app-state', JSON.stringify(getState()));
 * });
 * ```
 *
 * @example Syncing to external system
 * ```ts
 * const dispose = effect([authAtom, dataAtom], (getAuth, getData) => {
 *   const ws = new WebSocket(getAuth().endpoint);
 *   ws.send(JSON.stringify(getData()));
 *   return () => ws.close();
 * });
 * ```
 */
export declare function effect<D>(source: Atom<D, any>, fn: EffectFn<[Getter<D>]>): VoidFunction;
export declare function effect<const D extends readonly Atom<any, any>[]>(source: D, fn: EffectFn<[
    ...{
        [K in keyof D]: D[K] extends Atom<infer U, any> ? Getter<U> : never;
    }
]>): VoidFunction;
