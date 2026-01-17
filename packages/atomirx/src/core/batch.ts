import { hook } from "./hook";
import { scheduleNotifyHook } from "./scheduleNotifyHook";

let batchDepth = 0;

/**
 * Batches multiple state updates into a single reactive update cycle.
 *
 * Without batching, each `atom.set()` call triggers immediate notifications to all
 * subscribers. With `batch()`, all updates are collected and subscribers are notified
 * once at the end with the final values.
 *
 * ## Key Behavior
 *
 * 1. **Multiple updates to same atom**: Only 1 notification with final value
 * 2. **Listener deduplication**: Same listener subscribed to multiple atoms = 1 call
 * 3. **Nested batches**: Inner batches are merged into outer batch
 * 4. **Cascading updates**: Updates triggered by listeners are also batched
 *
 * ## When to Use
 *
 * - Updating multiple related atoms together
 * - Preventing intermediate render states
 * - Performance optimization for bulk updates
 * - Ensuring consistent state during complex operations
 *
 * ## How It Works
 *
 * ```
 * batch(() => {
 *   a.set(1);  // Queued, no notification yet
 *   b.set(2);  // Queued, no notification yet
 *   c.set(3);  // Queued, no notification yet
 * });
 * // All listeners notified once here (deduped)
 * ```
 *
 * @template T - Return type of the batched function
 * @param fn - Function containing multiple state updates
 * @returns The return value of fn
 *
 * @example Basic batching - prevent intermediate states
 * ```ts
 * const firstName = atom("John");
 * const lastName = atom("Doe");
 *
 * // Without batch: component renders twice (once per set)
 * firstName.set("Jane");
 * lastName.set("Smith");
 *
 * // With batch: component renders once with final state
 * batch(() => {
 *   firstName.set("Jane");
 *   lastName.set("Smith");
 * });
 * ```
 *
 * @example Multiple updates to same atom
 * ```ts
 * const counter = atom(0);
 *
 * counter.on(() => console.log("Counter:", counter.value));
 *
 * batch(() => {
 *   counter.set(1);
 *   counter.set(2);
 *   counter.set(3);
 * });
 * // Logs once: "Counter: 3"
 * ```
 *
 * @example Listener deduplication
 * ```ts
 * const a = atom(0);
 * const b = atom(0);
 *
 * // Same listener subscribed to both atoms
 * const listener = () => console.log("Changed!", a.value, b.value);
 * a.on(listener);
 * b.on(listener);
 *
 * batch(() => {
 *   a.set(1);
 *   b.set(2);
 * });
 * // Logs once: "Changed! 1 2" (not twice)
 * ```
 *
 * @example Nested batches
 * ```ts
 * batch(() => {
 *   a.set(1);
 *   batch(() => {
 *     b.set(2);
 *     c.set(3);
 *   });
 *   d.set(4);
 * });
 * // All updates batched together, listeners notified once at outer batch end
 * ```
 *
 * @example Return value
 * ```ts
 * const result = batch(() => {
 *   counter.set(10);
 *   return counter.value * 2;
 * });
 * console.log(result); // 20
 * ```
 *
 * @example With async operations (be careful!)
 * ```ts
 * // ❌ Wrong: async operations escape the batch
 * batch(async () => {
 *   a.set(1);
 *   await delay(100);
 *   b.set(2); // This is OUTSIDE the batch!
 * });
 *
 * // ✅ Correct: batch sync operations only
 * batch(() => {
 *   a.set(1);
 *   b.set(2);
 * });
 * await delay(100);
 * batch(() => {
 *   c.set(3);
 * });
 * ```
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;

  // First batch - set up the notification hook with deduping
  if (batchDepth === 1) {
    // Use Set to dedupe listeners - if same listener is scheduled multiple times,
    // it only gets called once (e.g., component subscribed to multiple atoms)
    let pendingListeners = new Set<VoidFunction>();

    // Schedule listener to be called at batch end (deduped by Set)
    const scheduleListener = (listener: VoidFunction) => {
      pendingListeners.add(listener);
    };

    try {
      return hook.use([scheduleNotifyHook(scheduleListener)], fn);
    } finally {
      batchDepth--;

      // Process pending listeners, handling cascading updates
      // Keep the hook active so any updates triggered by listeners are also batched
      hook.use([scheduleNotifyHook(scheduleListener)], () => {
        while (pendingListeners.size > 0) {
          // Snapshot and clear before calling to handle re-entrancy
          const listeners = pendingListeners;
          pendingListeners = new Set();

          for (const listener of listeners) {
            listener();
          }
        }
      });
    }
  }

  // Nested batch - just run the function (outer batch handles notifications)
  try {
    return fn();
  } finally {
    batchDepth--;
  }
}
