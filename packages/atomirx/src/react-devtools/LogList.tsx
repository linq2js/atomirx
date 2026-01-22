import { memo, useMemo } from "react";
import type { LogEntry, LogEntryType } from "../devtools/types";
import {
  entityListStyle,
  emptyStateStyle,
  entityKeyStyle,
  entityValueStyle,
} from "./styles";
import { formatTimestamp } from "./hooks";

interface LogListProps {
  logs: readonly LogEntry[];
  searchText: string;
  onClearLogs?: () => void;
  showValues?: boolean;
}

/**
 * Badge configuration for each log type.
 * Icon represents source type (action, mutable, derived, pool)
 */
const LOG_BADGE_CONFIG: Record<LogEntryType, { color: string; label: string }> =
  {
    "action.dispatch": { color: "#3b82f6", label: "A" }, // blue - Action
    error: { color: "#ef4444", label: "E" }, // red - Error
    "mutable.change": { color: "#10b981", label: "M" }, // green - Mutable
    "mutable.reset": { color: "#10b981", label: "M" }, // green - Mutable
    "derived.change": { color: "#8b5cf6", label: "D" }, // purple - Derived
    "derived.refresh": { color: "#8b5cf6", label: "D" }, // purple - Derived
    "pool.create": { color: "#f97316", label: "P" }, // orange - Pool
    "pool.set": { color: "#f97316", label: "P" }, // orange - Pool
    "pool.remove": { color: "#f97316", label: "P" }, // orange - Pool
  };

/**
 * Get badge style for log type.
 */
function getLogBadgeStyle(type: LogEntryType): React.CSSProperties {
  const config = LOG_BADGE_CONFIG[type] ?? { color: "#6b7280", label: "?" };

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: "var(--atomirx-radius)",
    backgroundColor: config.color,
    color: "white",
    fontSize: "var(--atomirx-font-size-sm)",
    fontWeight: 600,
    flexShrink: 0,
  };
}

/**
 * Get badge label for log type.
 */
function getLogBadgeLabel(type: LogEntryType): string {
  return LOG_BADGE_CONFIG[type]?.label ?? "?";
}

/**
 * Get the key/name to display for a log entry.
 */
function getLogKey(log: LogEntry): string {
  switch (log.type) {
    case "action.dispatch":
      return log.actionKey;
    case "error":
      return log.sourceKey || log.sourceType;
    case "mutable.change":
    case "mutable.reset":
    case "derived.change":
    case "derived.refresh":
      return log.atomKey;
    case "pool.create":
    case "pool.set":
    case "pool.remove":
      return log.poolKey;
    default:
      return "unknown";
  }
}

/**
 * Get the event type label for a log entry (shown on line 1).
 */
function getLogEventType(log: LogEntry): string {
  switch (log.type) {
    case "action.dispatch":
      return "dispatch";
    case "error":
      return "error";
    case "mutable.change":
      return "change";
    case "mutable.reset":
      return "reset";
    case "derived.change":
      return "change";
    case "derived.refresh":
      return "refresh";
    case "pool.create":
      return "create";
    case "pool.set":
      return "set";
    case "pool.remove":
      return "remove";
    default:
      return "";
  }
}

/**
 * Get the serialized data for a log entry (shown on line 2).
 * Returns null if no data to show.
 */
function getLogSerializedData(log: LogEntry): string | null {
  switch (log.type) {
    case "action.dispatch":
      return log.deps;
    case "error":
      return log.error;
    case "pool.create":
    case "pool.set":
    case "pool.remove":
      return log.params;
    case "mutable.change":
    case "mutable.reset":
    case "derived.change":
    case "derived.refresh":
      // These don't have serialized data in the log entry
      return null;
    default:
      return null;
  }
}

/**
 * Single log entry item.
 * Two-line layout:
 * - Line 1: Badge | Key | Event type | Timestamp
 * - Line 2 (when showValues=true): Serialized data (indented)
 */
const LogItem = memo(function LogItem({
  log,
  showValues,
}: {
  log: LogEntry;
  showValues: boolean;
}) {
  const isError = log.type === "error";
  const serializedData = getLogSerializedData(log);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid var(--atomirx-border)",
        cursor: "default",
      }}
    >
      {/* Line 1: Badge | Key | Event type | Timestamp */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={getLogBadgeStyle(log.type)}>
          {getLogBadgeLabel(log.type)}
        </span>
        <span
          style={{
            ...entityKeyStyle,
            color: isError
              ? "var(--atomirx-error)"
              : "var(--atomirx-text-primary)",
          }}
        >
          {getLogKey(log)}
        </span>
        <span
          style={{
            color: "var(--atomirx-text-secondary)",
            fontSize: "var(--atomirx-font-size-sm)",
          }}
        >
          {getLogEventType(log)}
        </span>
        <span
          style={{
            color: "var(--atomirx-text-muted)",
            fontSize: "var(--atomirx-font-size-sm)",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {formatTimestamp(log.timestamp)}
        </span>
      </div>

      {/* Line 2: Serialized data (only when showValues=true and data exists) */}
      {showValues && serializedData && (
        <div
          style={{
            ...entityValueStyle,
            marginLeft: 30, // Align with text after badge
            maxWidth: "none",
          }}
          title={serializedData}
        >
          {serializedData}
        </div>
      )}
    </div>
  );
});

/**
 * Clear button style.
 */
const clearButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: "var(--atomirx-font-size-sm)",
  backgroundColor: "var(--atomirx-bg-tertiary)",
  border: "1px solid var(--atomirx-border)",
  borderRadius: "var(--atomirx-radius)",
  color: "var(--atomirx-text-secondary)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};

/**
 * Log list component with search.
 */
export const LogList = memo(function LogList({
  logs,
  searchText,
  onClearLogs,
  showValues = true,
}: LogListProps) {
  const filteredLogs = useMemo(() => {
    if (!searchText) return logs;

    const search = searchText.toLowerCase();
    return logs.filter((log) => {
      const key = getLogKey(log).toLowerCase();
      const eventType = getLogEventType(log).toLowerCase();
      const serializedData = getLogSerializedData(log)?.toLowerCase() ?? "";
      return (
        key.includes(search) ||
        eventType.includes(search) ||
        serializedData.includes(search)
      );
    });
  }, [logs, searchText]);

  if (filteredLogs.length === 0) {
    return (
      <div style={{ ...emptyStateStyle, width: "100%" }}>
        {searchText
          ? `No logs matching "${searchText}"`
          : "No logs yet. Dispatch actions or trigger errors to see logs."}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Toolbar with clear button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "6px 12px",
          borderBottom: "1px solid var(--atomirx-border)",
          backgroundColor: "var(--atomirx-bg-secondary)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "var(--atomirx-font-size-sm)",
            color: "var(--atomirx-text-muted)",
            marginRight: "auto",
          }}
        >
          {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
        </span>
        {onClearLogs && (
          <button
            style={clearButtonStyle}
            onClick={onClearLogs}
            title="Clear all logs"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Log entries */}
      <div style={{ ...entityListStyle, flex: 1 }}>
        {filteredLogs.map((log) => (
          <LogItem key={log.id} log={log} showValues={showValues} />
        ))}
      </div>
    </div>
  );
});
