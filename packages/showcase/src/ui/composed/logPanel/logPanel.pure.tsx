import { forwardRef } from "react";

/**
 * Log entry type representing a single log message.
 */
export interface LogEntry {
  id: number;
  message: string;
  timestamp: Date;
  type?: "info" | "success" | "error" | "warning";
}

/**
 * Props for the LogPanelPure component.
 */
export interface LogPanelPureProps {
  /** Array of log entries to display */
  logs: LogEntry[];
  /** Maximum height of the log panel (CSS value) */
  maxHeight?: string;
}

const typeColors: Record<NonNullable<LogEntry["type"]>, string> = {
  info: "text-surface-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

/**
 * Pure presentational component for displaying log entries.
 * Uses forwardRef to allow parent to control scroll behavior.
 *
 * @example
 * ```tsx
 * <LogPanelPure
 *   ref={containerRef}
 *   logs={logs}
 *   maxHeight="300px"
 * />
 * ```
 */
export const LogPanelPure = forwardRef<HTMLDivElement, LogPanelPureProps>(
  function LogPanelPure({ logs, maxHeight = "200px" }, ref) {
    return (
      <div
        ref={ref}
        className="bg-surface-900 rounded-lg border border-surface-800 overflow-y-auto font-mono text-xs"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="p-4 text-surface-500 text-center">
            No logs yet. Interact with the demo to see events.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 animate-fade-in">
                <span className="text-surface-600 shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={typeColors[log.type || "info"]}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
