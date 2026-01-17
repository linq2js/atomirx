import { useState, useEffect, useRef, memo } from "react";
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { LogPanel, useLogger } from "../components/LogPanel";
import { Eye, RefreshCw, Layers } from "lucide-react";

// Create atoms for demo
const userAtom = atom(
  { name: "John Doe", email: "john@example.com", age: 30 },
  { key: "user" }
);

const settingsAtom = atom(
  { theme: "dark", notifications: true, language: "en" },
  { key: "settings" }
);

const counterAtom = atom(0, { key: "counter" });

// Render counter component - uses ref to avoid causing re-renders
function RenderCounter({ name }: { name: string }) {
  const renderCountRef = useRef(0);
  // Increment on every render (not in effect to avoid loop)
  renderCountRef.current += 1;

  return (
    <div className="text-xs text-surface-500 text-right">
      <div>{name}</div>
      <div>
        renders:{" "}
        <span className="text-primary-400">{renderCountRef.current}</span>
      </div>
    </div>
  );
}

// Component that selects only name - memoized to prevent parent re-renders
const UserNameDisplay = memo(function UserNameDisplay() {
  const name = useSelector(userAtom, (get) => get().name);

  return (
    <div className="p-3 bg-surface-800/50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-surface-500">Name only</p>
          <p className="font-semibold text-surface-100">{name}</p>
        </div>
        <RenderCounter name="Name" />
      </div>
    </div>
  );
});

// Component that selects only email - memoized to prevent parent re-renders
const UserEmailDisplay = memo(function UserEmailDisplay() {
  const email = useSelector(userAtom, (get) => get().email);

  return (
    <div className="p-3 bg-surface-800/50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-surface-500">Email only</p>
          <p className="font-semibold text-surface-100">{email}</p>
        </div>
        <RenderCounter name="Email" />
      </div>
    </div>
  );
});

// Component that selects entire user - memoized to prevent parent re-renders
const FullUserDisplay = memo(function FullUserDisplay() {
  const user = useSelector(userAtom);

  return (
    <div className="p-3 bg-surface-800/50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-surface-500">Full user object</p>
          <p className="font-semibold text-surface-100">{user.name}</p>
          <p className="text-sm text-surface-400">{user.email}</p>
        </div>
        <RenderCounter name="Full" />
      </div>
    </div>
  );
});

// Multi-source selector component - memoized to prevent parent re-renders
const CombinedDisplay = memo(function CombinedDisplay() {
  const combined = useSelector(
    [userAtom, settingsAtom],
    (getUser, getSettings) => ({
      userName: getUser().name,
      theme: getSettings().theme,
    })
  );

  return (
    <div className="p-3 bg-surface-800/50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-surface-500">Combined (user + settings)</p>
          <p className="font-semibold text-surface-100">
            {combined.userName} - {combined.theme}
          </p>
        </div>
        <RenderCounter name="Combined" />
      </div>
    </div>
  );
});

export function UseSelectorDemo() {
  const counter = useSelector(counterAtom);
  const [logs, setLogs] = useState<
    {
      id: number;
      message: string;
      timestamp: Date;
      type?: "info" | "success" | "error" | "warning";
    }[]
  >([]);
  const { log, clear, setSetLogs } = useLogger();

  useEffect(() => {
    setSetLogs(setLogs);
  }, [setSetLogs]);

  const updateName = () => {
    const names = ["John Doe", "Jane Smith", "Bob Wilson", "Alice Brown"];
    const newName = names[Math.floor(Math.random() * names.length)];
    log(`Updating name to: ${newName}`);
    userAtom.set((prev) => ({ ...prev, name: newName }));
  };

  const updateEmail = () => {
    const emails = ["john@example.com", "jane@test.com", "bob@demo.com"];
    const newEmail = emails[Math.floor(Math.random() * emails.length)];
    log(`Updating email to: ${newEmail}`);
    userAtom.set((prev) => ({ ...prev, email: newEmail }));
  };

  const updateAge = () => {
    const newAge = Math.floor(Math.random() * 50) + 20;
    log(`Updating age to: ${newAge} (not displayed, no re-render)`);
    userAtom.set((prev) => ({ ...prev, age: newAge }));
  };

  const updateTheme = () => {
    const themes = ["dark", "light", "system"];
    const newTheme = themes[Math.floor(Math.random() * themes.length)];
    log(`Updating theme to: ${newTheme}`);
    settingsAtom.set((prev) => ({ ...prev, theme: newTheme }));
  };

  const incrementCounter = () => {
    log("Incrementing counter");
    counterAtom.set((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">useSelector</h2>
        <p className="text-surface-400">
          Subscribe to atoms in React components with fine-grained control over
          which changes trigger re-renders.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { useSelector } from "atomirx/react";

// Select entire atom value
const user = useSelector(userAtom);

// Select with transformation (only re-render when name changes)
const name = useSelector(userAtom, (get) => get().name);

// Multiple atoms
const combined = useSelector(
  [userAtom, settingsAtom],
  (getUser, getSettings) => ({
    userName: getUser().name,
    theme: getSettings().theme,
  })
);

// With equals option
const data = useSelector(atom, (get) => get().data, "shallow");
        `}
      />

      {/* Fine-grained Updates Demo */}
      <DemoSection
        title="Fine-grained Updates"
        description="Components only re-render when their selected data changes"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UserNameDisplay />
            <UserEmailDisplay />
            <FullUserDisplay />
            <CombinedDisplay />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={updateName}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Update Name
            </button>
            <button
              onClick={updateEmail}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Update Email
            </button>
            <button
              onClick={updateAge}
              className="btn-secondary flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Update Age (hidden)
            </button>
            <button
              onClick={updateTheme}
              className="btn-accent flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Update Theme
            </button>
          </div>

          <p className="text-sm text-surface-400">
            Notice how updating "age" doesn't cause any re-renders since no
            component selects it. Each component only re-renders when its
            specific selection changes.
          </p>
        </div>
      </DemoSection>

      {/* Simple Usage Demo */}
      <DemoSection
        title="Simple Usage (No Selector)"
        description="Without a selector function, returns the entire atom value"
      >
        <div className="space-y-4">
          <div className="p-4 bg-surface-800/50 rounded-lg">
            <p className="text-sm text-surface-400 mb-1">Counter value:</p>
            <p className="text-4xl font-bold text-gradient">{counter}</p>
          </div>

          <button onClick={incrementCounter} className="btn-primary">
            Increment
          </button>

          <CodeBlock
            code={`
// Equivalent to: useSelector(counterAtom, (get) => get())
const counter = useSelector(counterAtom);
            `}
          />
        </div>
      </DemoSection>

      {/* Event Log */}
      <DemoSection title="Event Log">
        <div className="space-y-3">
          <LogPanel logs={logs} />
          <button onClick={clear} className="btn-secondary text-sm">
            Clear Logs
          </button>
        </div>
      </DemoSection>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2 truncate">
            Concurrent Mode
          </h4>
          <p className="text-sm text-surface-400 line-clamp-2">
            Uses <code className="text-primary-400">useSyncExternalStore</code>{" "}
            for React 18+ support.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2 truncate">
            Equality Options
          </h4>
          <p className="text-sm text-surface-400 line-clamp-2">
            "strict", "shallow", or "deep" comparison to prevent unnecessary
            renders.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2 truncate">
            Conditional Deps
          </h4>
          <p className="text-sm text-surface-400 line-clamp-2">
            Only subscribes to atoms actually accessed during selection.
          </p>
        </div>
      </div>
    </div>
  );
}
