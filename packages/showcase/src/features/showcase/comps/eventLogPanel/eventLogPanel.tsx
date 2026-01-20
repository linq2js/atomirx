/**
 * @fileoverview EventLogPanel connected component
 *
 * Connects to the eventLogStore and passes data to the pure component.
 * This is the main export for the eventLogPanel component.
 */

import { useSelector } from "atomirx/react";
import { eventLogStore } from "../../stores/eventLogStore";
import { EventLogPanelPure } from "./eventLogPanel.pure";

/**
 * Props for the EventLogPanel component.
 */
export interface EventLogPanelProps {
  // Currently no additional props needed
  // Store instance could be injected here for testing if needed
}

/**
 * Event log panel connected to the eventLogStore.
 *
 * Displays event logs from the store and provides clear functionality.
 * This component handles all store connections internally.
 *
 * @returns Connected event log panel
 *
 * @example
 * ```tsx
 * // In a page component
 * <EventLogPanel />
 *
 * // Logs can be added from anywhere using the store
 * const eventLog = eventLogStore();
 * eventLog.log("User clicked button", "info");
 * ```
 */
export function EventLogPanel(_props: EventLogPanelProps) {
  const store = eventLogStore();

  // Subscribe to store state (grouped selector to avoid multiple subscriptions)
  const { logs, logCount } = useSelector(({ read }) => ({
    logs: read(store.logs$),
    logCount: read(store.logCount$),
  }));

  return (
    <EventLogPanelPure
      logs={logs}
      logCount={logCount}
      onClear={store.clear}
    />
  );
}
