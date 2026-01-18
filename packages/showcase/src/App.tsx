import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import {
  Atom,
  Zap,
  GitBranch,
  Layers,
  Play,
  MousePointer,
  Workflow,
  Menu,
  X,
  Github,
  ExternalLink,
  ScrollText,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { BasicAtomDemo } from "./demos/BasicAtomDemo";
import { TodoListDemo } from "./demos/TodoListDemo";
import { DerivedAtomDemo } from "./demos/DerivedAtomDemo";
import { BatchDemo } from "./demos/BatchDemo";
import { UseActionDemo } from "./demos/UseActionDemo";
import { useValueDemo } from "./demos/useValueDemo";
import { AsyncUtilitiesDemo } from "./demos/AsyncUtilitiesDemo";

type DemoId =
  | "basic-atom"
  | "todo-list"
  | "derived"
  | "batch"
  | "use-action"
  | "use-selector"
  | "async-utils";

interface NavItem {
  id: DemoId;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: "basic-atom",
    label: "Basic Atom",
    icon: <Atom className="w-4 h-4" />,
  },
  {
    id: "todo-list",
    label: "Todo List",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "derived",
    label: "Derived",
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    id: "batch",
    label: "Batch",
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: "use-action",
    label: "useAction",
    icon: <Play className="w-4 h-4" />,
  },
  {
    id: "use-selector",
    label: "useValue",
    icon: <MousePointer className="w-4 h-4" />,
  },
  {
    id: "async-utils",
    label: "Async Utils",
    icon: <Workflow className="w-4 h-4" />,
  },
];

const demoComponents: Record<DemoId, React.ComponentType> = {
  "basic-atom": BasicAtomDemo,
  "todo-list": TodoListDemo,
  derived: DerivedAtomDemo,
  batch: BatchDemo,
  "use-action": UseActionDemo,
  "use-selector": useValueDemo,
  "async-utils": AsyncUtilitiesDemo,
};

const VALID_DEMO_IDS = new Set<string>(Object.keys(demoComponents));

// ============================================================================
// Global Event Log Context
// ============================================================================

interface LogEntry {
  id: number;
  message: string;
  timestamp: Date;
  type?: "info" | "success" | "error" | "warning";
}

interface EventLogContextValue {
  logs: LogEntry[];
  log: (message: string, type?: LogEntry["type"]) => void;
  clear: () => void;
}

const EventLogContext = createContext<EventLogContextValue | null>(null);

export function useEventLog() {
  const context = useContext(EventLogContext);
  if (!context) {
    throw new Error("useEventLog must be used within EventLogProvider");
  }
  return context;
}

function EventLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const log = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      const entry: LogEntry = {
        id: ++idRef.current,
        message,
        timestamp: new Date(),
        type,
      };
      setLogs((prev) => [...prev, entry].slice(-100)); // Keep last 100
    },
    []
  );

  const clear = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <EventLogContext.Provider value={{ logs, log, clear }}>
      {children}
    </EventLogContext.Provider>
  );
}

// ============================================================================
// Event Log Panel Component
// ============================================================================

const typeColors = {
  info: "text-surface-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

function EventLogPanel() {
  const { logs, clear } = useEventLog();
  const containerRef = useRef<HTMLDivElement>(null);

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
            {logs.length}
          </span>
        </div>
        <button
          onClick={clear}
          className="p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-800 rounded transition-colors"
          title="Clear logs"
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
                <span className={typeColors[log.type || "info"]}>
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the initial demo from URL hash or localStorage
 */
function getInitialDemo(): DemoId {
  // First, check URL hash (e.g., #async-atom)
  const hash = window.location.hash.slice(1);
  if (hash && VALID_DEMO_IDS.has(hash)) {
    return hash as DemoId;
  }

  // Fallback to localStorage
  const stored = localStorage.getItem("atomirx-showcase-demo");
  if (stored && VALID_DEMO_IDS.has(stored)) {
    return stored as DemoId;
  }

  return "basic-atom";
}

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [activeDemo, setActiveDemo] = useState<DemoId>(getInitialDemo);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logPanelOpen, setLogPanelOpen] = useState(true);

  // Sync activeDemo to URL hash and localStorage
  useEffect(() => {
    window.location.hash = activeDemo;
    localStorage.setItem("atomirx-showcase-demo", activeDemo);
  }, [activeDemo]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && VALID_DEMO_IDS.has(hash)) {
        setActiveDemo(hash as DemoId);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const ActiveDemoComponent = demoComponents[activeDemo];

  return (
    <EventLogProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header with Logo + Feature Tabs */}
        <header className="glass sticky top-0 z-50 border-b border-surface-800/50">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
            {/* Top row: Logo + Links */}
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                  <Atom className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gradient">atomirx</h1>
                  <p className="text-[10px] text-surface-400 -mt-0.5">
                    Reactive State Management
                  </p>
                </div>
              </div>

              {/* Desktop Links */}
              <nav className="hidden md:flex items-center gap-4">
                <a
                  href="https://github.com/user/atomirx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
                >
                  <Github className="w-5 h-5" />
                  <span className="text-sm">GitHub</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">Docs</span>
                </a>
              </nav>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Feature Tabs - Desktop */}
            <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveDemo(item.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 cursor-pointer whitespace-nowrap
                    ${
                      activeDemo === item.id
                        ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                        : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
                    }
                  `}
                >
                  <span
                    className={
                      activeDemo === item.id
                        ? "text-primary-400"
                        : "text-surface-500"
                    }
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-surface-800/50 bg-surface-900/95 backdrop-blur-sm">
              <nav className="p-2 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveDemo(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-all duration-200 cursor-pointer
                      ${
                        activeDemo === item.id
                          ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                          : "text-surface-300 hover:bg-surface-800/50 hover:text-surface-100"
                      }
                    `}
                  >
                    <span
                      className={
                        activeDemo === item.id
                          ? "text-primary-400"
                          : "text-surface-500"
                      }
                    >
                      {item.icon}
                    </span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Demo Content */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:pr-80 xl:pr-96">
            <div className="max-w-4xl mx-auto animate-fade-in">
              <ActiveDemoComponent />
            </div>
          </main>

          {/* Event Log Panel - Desktop (Right Side) - Fixed Position */}
          <aside
            className={`
              hidden lg:flex flex-col fixed right-0 top-[104px] bottom-0
              w-80 xl:w-96 border-l border-surface-800/50 bg-surface-900/95 backdrop-blur-sm
              transition-all duration-300 z-40
            `}
          >
            <EventLogPanel />
          </aside>
        </div>

        {/* Mobile Event Log Toggle */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setLogPanelOpen(!logPanelOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg transition-colors"
          >
            <ScrollText className="w-4 h-4" />
            <span className="text-sm font-medium">Logs</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${logPanelOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Mobile Event Log Panel */}
        {logPanelOpen && (
          <div className="lg:hidden fixed bottom-16 right-4 left-4 z-30 h-64 bg-surface-900 border border-surface-800 rounded-lg shadow-xl overflow-hidden">
            <EventLogPanel />
          </div>
        )}
      </div>
    </EventLogProvider>
  );
}

export default App;
