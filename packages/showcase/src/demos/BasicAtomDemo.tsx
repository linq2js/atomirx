import { useState, useEffect, useRef } from "react";
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { LogPanel, useLogger } from "../components/LogPanel";
import { Plus, Minus, RotateCcw, Edit3 } from "lucide-react";

// Create atoms outside component to persist across renders
const countAtom = atom(0, { key: "count" });
const nameAtom = atom("atomirx", { key: "name" });

export function BasicAtomDemo() {
  const count = useSelector(countAtom);
  const name = useSelector(nameAtom);
  const [logs, setLogs] = useState<
    { id: number; message: string; timestamp: Date; type?: "info" | "success" | "error" | "warning" }[]
  >([]);
  const { log, clear, setSetLogs } = useLogger();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSetLogs(setLogs);
  }, [setSetLogs]);

  // Subscribe to changes for logging
  useEffect(() => {
    const unsubCount = countAtom.on(() => {
      log(`Count changed to: ${countAtom.value}`, "success");
    });
    const unsubName = nameAtom.on(() => {
      log(`Name changed to: "${nameAtom.value}"`, "success");
    });
    return () => {
      unsubCount();
      unsubName();
    };
  }, [log]);

  const increment = () => {
    log("Calling countAtom.set(prev => prev + 1)");
    countAtom.set((prev) => prev + 1);
  };

  const decrement = () => {
    log("Calling countAtom.set(prev => prev - 1)");
    countAtom.set((prev) => prev - 1);
  };

  const reset = () => {
    log("Calling countAtom.reset()");
    countAtom.reset();
  };

  const updateName = () => {
    const newName = inputRef.current?.value || "";
    log(`Calling nameAtom.set("${newName}")`);
    nameAtom.set(newName);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">Basic Atom</h2>
        <p className="text-surface-400">
          Atoms are the fundamental building blocks of atomirx. They hold
          reactive state that automatically notifies subscribers when changed.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";

// Create an atom with initial value
const countAtom = atom(0);

// In your component
const count = useSelector(countAtom);

// Update the atom
countAtom.set(5);           // Direct value
countAtom.set(prev => prev + 1); // Reducer function
countAtom.reset();          // Reset to initial value
        `}
      />

      {/* Counter Demo */}
      <DemoSection
        title="Counter Example"
        description="A simple counter demonstrating atom get/set operations"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={decrement}
              className="btn-secondary p-3 rounded-full"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/30 flex items-center justify-center">
              <span className="text-5xl font-bold text-gradient">{count}</span>
            </div>

            <button
              onClick={increment}
              className="btn-primary p-3 rounded-full"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center gap-3">
            <button onClick={reset} className="btn-secondary flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <div className="flex items-center gap-2 text-sm text-surface-400">
              <span>Dirty:</span>
              <span
                className={
                  countAtom.dirty() ? "text-amber-400" : "text-surface-500"
                }
              >
                {countAtom.dirty() ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </DemoSection>

      {/* String Atom Demo */}
      <DemoSection
        title="String Atom"
        description="Atoms can hold any type of value"
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              defaultValue={name}
              placeholder="Enter a name"
              className="input flex-1"
            />
            <button onClick={updateName} className="btn-primary flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update
            </button>
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            <p className="text-sm text-surface-400 mb-1">Current value:</p>
            <p className="text-xl font-semibold text-surface-100">"{name}"</p>
          </div>
        </div>
      </DemoSection>

      {/* Event Log */}
      <DemoSection
        title="Event Log"
        description="Real-time log of atom operations and subscriptions"
      >
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
          <h4 className="font-semibold text-surface-100 mb-2">Lazy Init</h4>
          <p className="text-sm text-surface-400">
            State is created on first access, not at definition time.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Equality Check</h4>
          <p className="text-sm text-surface-400">
            Configurable equality for smart re-render prevention.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Dirty Tracking</h4>
          <p className="text-sm text-surface-400">
            Know if atom has been modified since creation.
          </p>
        </div>
      </div>
    </div>
  );
}
