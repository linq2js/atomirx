import { useRef, useEffect } from "react";
import { LogPanelPure, type LogEntry, type LogPanelPureProps } from "./logPanel.pure";

/**
 * Props for the LogPanel component.
 */
export interface LogPanelProps extends LogPanelPureProps {}

/**
 * Log panel component with auto-scroll behavior.
 * Automatically scrolls to the bottom when new logs are added.
 *
 * @example
 * ```tsx
 * const [logs, setLogs] = useState<LogEntry[]>([]);
 *
 * <LogPanel logs={logs} maxHeight="300px" />
 * ```
 */
export function LogPanel({ logs, maxHeight }: LogPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return <LogPanelPure ref={containerRef} logs={logs} maxHeight={maxHeight} />;
}

// Re-export types from pure component
export type { LogEntry, LogPanelPureProps };
