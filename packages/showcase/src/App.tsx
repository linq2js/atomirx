import { useState, useEffect } from "react";
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
} from "lucide-react";
import { BasicAtomDemo } from "./demos/BasicAtomDemo";
import { AsyncAtomDemo } from "./demos/AsyncAtomDemo";
import { DerivedAtomDemo } from "./demos/DerivedAtomDemo";
import { BatchDemo } from "./demos/BatchDemo";
import { UseActionDemo } from "./demos/UseActionDemo";
import { UseSelectorDemo } from "./demos/UseSelectorDemo";
import { AsyncUtilitiesDemo } from "./demos/AsyncUtilitiesDemo";

type DemoId =
  | "basic-atom"
  | "async-atom"
  | "derived"
  | "batch"
  | "use-action"
  | "use-selector"
  | "async-utils";

interface NavItem {
  id: DemoId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: "basic-atom",
    label: "Basic Atom",
    icon: <Atom className="w-4 h-4" />,
    description: "Reactive state container",
  },
  {
    id: "async-atom",
    label: "Async Atom",
    icon: <Zap className="w-4 h-4" />,
    description: "Promise & loading states",
  },
  {
    id: "derived",
    label: "Derived Atoms",
    icon: <GitBranch className="w-4 h-4" />,
    description: "Computed values",
  },
  {
    id: "batch",
    label: "Batch",
    icon: <Layers className="w-4 h-4" />,
    description: "Grouped updates",
  },
  {
    id: "use-action",
    label: "useAction",
    icon: <Play className="w-4 h-4" />,
    description: "Async actions hook",
  },
  {
    id: "use-selector",
    label: "useSelector",
    icon: <MousePointer className="w-4 h-4" />,
    description: "React integration",
  },
  {
    id: "async-utils",
    label: "Async Utilities",
    icon: <Workflow className="w-4 h-4" />,
    description: "all, any, race, settled",
  },
];

const demoComponents: Record<DemoId, React.ComponentType> = {
  "basic-atom": BasicAtomDemo,
  "async-atom": AsyncAtomDemo,
  derived: DerivedAtomDemo,
  batch: BatchDemo,
  "use-action": UseActionDemo,
  "use-selector": UseSelectorDemo,
  "async-utils": AsyncUtilitiesDemo,
};

const VALID_DEMO_IDS = new Set<string>(Object.keys(demoComponents));

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

function App() {
  const [activeDemo, setActiveDemo] = useState<DemoId>(getInitialDemo);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-surface-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                <Atom className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">atomirx</h1>
                <p className="text-xs text-surface-400">
                  Reactive State Management
                </p>
              </div>
            </div>

            {/* Desktop Nav */}
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72
            glass border-r border-surface-800/50 overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full md:translate-x-0"
            }
          `}
        >
          <nav className="p-4 space-y-2">
            <p className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
              Features
            </p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveDemo(item.id);
                  setSidebarOpen(false);
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
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-surface-500">{item.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <ActiveDemoComponent />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
