/**
 * @module eventLogStore
 *
 * @description Manages event log state for the showcase application.
 * Provides a centralized logging facility to track and display events
 * from demo interactions.
 *
 * @atoms
 * - logs$ - Array of log entries (capped at 100 entries)
 *
 * @derived
 * - logCount$ - Number of log entries
 *
 * @actions
 * - log(message, type?) - Add a new log entry
 * - clear() - Clear all log entries
 *
 * @reactive-flow
 * log(message) → logs$ updated → logCount$ → UI (EventLogPanel)
 * clear() → logs$ = [] → logCount$ = 0 → UI
 */

import { atom, derived, define, readonly } from "atomirx";

// ============================================================================
// Types
// ============================================================================

/**
 * Type of log entry for styling purposes.
 */
export type LogEntryType = "info" | "success" | "error" | "warning";

/**
 * A single log entry in the event log.
 */
export interface LogEntry {
  /** Unique identifier for the log entry */
  id: number;
  /** Log message content */
  message: string;
  /** Timestamp when the log was created */
  timestamp: Date;
  /** Type of log entry (affects styling) */
  type: LogEntryType;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of log entries to keep.
 * Older entries are removed when this limit is exceeded.
 */
const MAX_LOG_ENTRIES = 100;

// ============================================================================
// Store Definition
// ============================================================================

/**
 * Event log store for tracking demo interactions.
 *
 * @example
 * ```ts
 * const eventLog = eventLogStore();
 *
 * // Log an info message
 * eventLog.log("Button clicked");
 *
 * // Log with type
 * eventLog.log("Operation successful", "success");
 * eventLog.log("Something went wrong", "error");
 *
 * // In React component
 * const logs = useSelector(eventLog.logs$);
 * const count = useSelector(eventLog.logCount$);
 *
 * // Clear all logs
 * eventLog.clear();
 * ```
 */
export const eventLogStore = define(
  () => {
    // ─────────────────────────────────────────────────────────────
    // Internal State
    // ─────────────────────────────────────────────────────────────

    /** Counter for generating unique log IDs */
    let nextId = 0;

    // ─────────────────────────────────────────────────────────────
    // Atoms
    // ─────────────────────────────────────────────────────────────

    /**
     * All log entries.
     * Capped at MAX_LOG_ENTRIES to prevent memory issues.
     */
    const logs$ = atom<LogEntry[]>([], {
      meta: { key: "eventLog.logs" },
    });

    // ─────────────────────────────────────────────────────────────
    // Derived
    // ─────────────────────────────────────────────────────────────

    /**
     * Number of log entries.
     */
    const logCount$ = derived(({ read }) => read(logs$).length, {
      meta: { key: "eventLog.logCount" },
    });

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    /**
     * Add a new log entry.
     *
     * @param message - The message to log
     * @param type - The type of log entry (default: "info")
     * @returns The created log entry
     *
     * @example
     * ```ts
     * eventLog.log("User clicked button");
     * eventLog.log("Saved successfully", "success");
     * eventLog.log("Failed to save", "error");
     * ```
     */
    function log(message: string, type: LogEntryType = "info"): LogEntry {
      const entry: LogEntry = {
        id: ++nextId,
        message,
        timestamp: new Date(),
        type,
      };

      logs$.set((prev) => [...prev, entry].slice(-MAX_LOG_ENTRIES));

      return entry;
    }

    /**
     * Clear all log entries.
     *
     * @description
     * Removes all entries from the log. Resets to empty array.
     * Does not reset the ID counter.
     *
     * @example
     * ```ts
     * eventLog.clear();
     * // logs$ is now []
     * ```
     */
    function clear(): void {
      logs$.set([]);
    }

    // ─────────────────────────────────────────────────────────────
    // Return Public API
    // ─────────────────────────────────────────────────────────────

    return {
      // Read-only state (prevents external mutations)
      ...readonly({ logs$ }),

      // Derived state (already read-only by nature)
      logCount$,

      // Actions
      log,
      clear,
    };
  },
  { key: "eventLogStore" }
);
