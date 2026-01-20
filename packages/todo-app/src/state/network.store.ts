/**
 * @module networkStore
 *
 * @description Manages network connectivity state (online/offline).
 * Listens to browser online/offline events and provides reactive state.
 *
 * @atoms
 * - isOnline$ - Whether the device is currently online
 *
 * @effects
 * - Subscribes to window online/offline events
 *
 * @actions
 * - setOnline(value) - Manually set online state (for testing)
 *
 * @reactive-flow
 * window.online/offline → effect → isOnline$ → UI
 */

import { atom, define, effect, readonly } from "atomirx";

/**
 * Network state module.
 *
 * @example
 * ```ts
 * const { isOnline$ } = networkStore();
 *
 * // In React component
 * const isOnline = useSelector(isOnline$);
 * ```
 */
export const networkStore = define(() => {
  // ┌─────────────────────────────────────────────────────────────┐
  // │ Dependency Graph:                                          │
  // │                                                            │
  // │  window events (online/offline)                            │
  // │         │                                                  │
  // │         ▼                                                  │
  // │  [setupEffect] ───────► isOnline$                          │
  // │                              │                             │
  // │                              ▼                             │
  // │                        (subscribers)                       │
  // └─────────────────────────────────────────────────────────────┘

  /**
   * Whether the device is currently online.
   * Initialized from navigator.onLine if available.
   */
  const isOnline$ = atom<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
    { meta: { key: "network.isOnline" } }
  );

  /**
   * Effect to listen for online/offline events.
   * Sets up event listeners on mount and cleans up on unmount.
   */
  effect(
    () => {
      if (typeof window === "undefined") return;

      const handleOnline = () => isOnline$.set(true);
      const handleOffline = () => isOnline$.set(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Cleanup on effect disposal
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    },
    { meta: { key: "network.setupListeners" } }
  );

  return {
    // Read-only state (prevents external mutations)
    ...readonly({ isOnline$ }),

    // Actions
    // setOnline(value) - Manually set online state (for testing or manual override)
    setOnline: (value: boolean) => isOnline$.set(value),
  };
});
