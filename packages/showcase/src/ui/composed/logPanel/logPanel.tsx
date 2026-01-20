import { useRef, useEffect } from "react";

/**
 * Log panel component for displaying event logs.
 *
 * @description Renders a scrollable panel of log entries with
 * auto-scroll to bottom on new entries and color-coded types.
 */

export interface LogEntry {
  /** Unique identifier for the log entry */
  id: number;
  /** The log message content */
  message: string;
  /** When the log was created */
  timestamp: Date;
  /** Optional log type for color coding */
  type?: "info" | "success" | "error" | "warning";
}

export interface LogPanelProps {
  /** Array of log entries to display */
  logs: LogEntry[];
  /** Maximum height of the panel (CSS value) */
  maxHeight?: string;
}

const typeColors = {
  info: "text-surface-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

/**
 * Displays a scrollable panel of log entries with auto-scroll.
 *
 * @param props - Component props
 * @param props.logs - Array of log entries to display
 * @param props.maxHeight - Maximum height of the panel (default: "200px")
 * @returns A styled scrollable log panel
 *
 * @example
 * const logs = [
 *   { id: 1, message: "Action triggered", timestamp: new Date(), type: "info" }
 * ];
 * <LogPanel logs={logs} maxHeight="300px" />
 */
export function LogPanel({ logs, maxHeight = "200px" }: LogPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
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
