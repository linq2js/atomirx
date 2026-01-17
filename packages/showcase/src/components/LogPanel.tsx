import { useRef, useEffect } from "react";

interface LogEntry {
  id: number;
  message: string;
  timestamp: Date;
  type?: "info" | "success" | "error" | "warning";
}

interface LogPanelProps {
  logs: LogEntry[];
  maxHeight?: string;
}

const typeColors = {
  info: "text-surface-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

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

export function useLogger() {
  const idRef = useRef(0);
  const logsRef = useRef<LogEntry[]>([]);
  const setLogsRef = useRef<React.Dispatch<
    React.SetStateAction<LogEntry[]>
  > | null>(null);

  const log = (
    message: string,
    type: LogEntry["type"] = "info"
  ): LogEntry[] => {
    const entry: LogEntry = {
      id: ++idRef.current,
      message,
      timestamp: new Date(),
      type,
    };
    const newLogs = [...logsRef.current, entry].slice(-50); // Keep last 50
    logsRef.current = newLogs;
    setLogsRef.current?.(newLogs);
    return newLogs;
  };

  const clear = () => {
    logsRef.current = [];
    setLogsRef.current?.([]);
  };

  const setSetLogs = (
    setter: React.Dispatch<React.SetStateAction<LogEntry[]>>
  ) => {
    setLogsRef.current = setter;
  };

  return { log, clear, setSetLogs, logsRef };
}
