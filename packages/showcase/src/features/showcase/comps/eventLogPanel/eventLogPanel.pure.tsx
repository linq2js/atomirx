/**
 * @fileoverview EventLogPanel presentational component
 *
 * Displays a panel of event log entries with auto-scroll, color-coded types,
 * and clear functionality. This is a pure presentational component - receives
 * all data via props.
 */

import { useRef, useEffect } from "react";
import { ScrollText, Trash2 } from "lucide-react";
import type { LogEntry, LogEntryType } from "../../stores/eventLogStore";

/**
 * Color classes for different log entry types.
 */
const typeColors: Record<LogEntryType, string> = {
  info: "text-surface-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

/**
 * Props for the EventLogPanel pure component.
 */
export interface EventLogPanelPureProps {
  /**
   * Array of log entries to display.
   */
  logs: LogEntry[];

  /**
   * Total count of log entries (for badge display).
   */
  logCount: number;

  /**
   * Callback fired when the clear button is clicked.
   */
  onClear: () => void;
}

/**
 * Renders the event log panel with header, log entries, and empty state.
 *
 * Features:
 * - Header with icon, title, count badge, and clear button
 * - Auto-scrolls to bottom when new logs are added
 * - Color-coded log entries by type
 * - Empty state with helpful message
 *
 * @param props - Component props
 * @returns Event log panel element
 *
 * @example
 * ```tsx
 * <EventLogPanelPure
 *   logs={[{ id: 1, message: "Clicked", timestamp: new Date(), type: "info" }]}
 *   logCount={1}
 *   onClear={() => console.log("Clear clicked")}
 * />
 * ```
 */
export function EventLogPanelPure({
  logs,
  logCount,
  onClear,
}: EventLogPanelPureProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary-400" />
          <h3 className="font-semibold text-surface-200 text-sm">Event Log</h3>
          <span className="text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
            {logCount}
          </span>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-800 rounded transition-colors"
          title="Clear logs"
          aria-label="Clear all logs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="p-4 text-surface-500 text-center">
            <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logs yet</p>
            <p className="text-xs mt-1">Interact with the demo to see events</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex gap-2 animate-fade-in px-2 py-1 hover:bg-surface-800/30 rounded"
              >
                <span className="text-surface-600 shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={typeColors[log.type]}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
