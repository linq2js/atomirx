/**
 * Hook that controls how atom change notifications are scheduled.
 *
 * ## Default Behavior
 *
 * By default, notifications are **synchronous** - listeners are called immediately
 * when an atom's value changes:
 *
 * ```ts
 * // Default: (fn) => fn() - immediate execution
 * atom.set(newValue);  // Listeners called immediately here
 * ```
 *
 * ## Used by `batch()`
 *
 * The `batch()` function temporarily overrides this hook to defer notifications
 * until all updates complete:
 *
 * ```ts
 * batch(() => {
 *   a.set(1);  // Notification deferred
 *   b.set(2);  // Notification deferred
 * });
 * // All listeners called here (deduped)
 * ```
 *
 * ## Custom Scheduling
 *
 * Can be overridden for custom scheduling strategies (e.g., microtask, RAF):
 *
 * ```ts
 * // Schedule notifications as microtasks
 * scheduleNotifyHook.override((fn) => queueMicrotask(fn));
 *
 * // Schedule notifications on next animation frame
 * scheduleNotifyHook.override((fn) => requestAnimationFrame(fn));
 *
 * // Reset to default synchronous behavior
 * scheduleNotifyHook.reset();
 * ```
 *
 * ## API
 *
 * - `scheduleNotifyHook.current` - Get/set the current scheduler function
 * - `scheduleNotifyHook.override(fn)` - Override with custom scheduler
 * - `scheduleNotifyHook.reset()` - Reset to default synchronous behavior
 * - `scheduleNotifyHook(fn)` - Create a HookSetup for use with `hook.use()`
 *
 * @internal Used internally by atomState and batch. Not typically needed by users.
 */
export declare const scheduleNotifyHook: import('./hook').Hook<(fn: VoidFunction) => void>;
