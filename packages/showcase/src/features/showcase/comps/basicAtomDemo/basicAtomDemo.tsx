/**
 * @module BasicAtomDemo
 * @description Demonstrates basic atom usage - get/set operations, lazy initialization, and reset.
 */

import { useEffect, useRef } from "react";
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection, CodeBlock } from "../../../../ui";
import { eventLogStore } from "../../stores/eventLogStore";
import { Plus, Minus, RotateCcw, Edit3 } from "lucide-react";

// Create atoms outside component to persist across renders
// Convention: use $ suffix for all atoms
const count$ = atom(0, { meta: { key: "count" } });
const name$ = atom("atomirx", { meta: { key: "name" } });

// Example of lazy initialization - value computed once at creation
const timestamp$ = atom(() => Date.now(), { meta: { key: "timestamp" } });

/**
 * Demo component showing basic atom operations.
 *
 * @description
 * Demonstrates fundamental atom operations: get/set, lazy initialization,
 * reset, and the $ suffix naming convention for reactive state.
 *
 * @example
 * ```tsx
 * <BasicAtomDemo />
 * ```
 */
export function BasicAtomDemo() {
  // Shorthand: pass atom directly to get its value
  const count = useSelector(count$);
  const name = useSelector(name$);
  const timestamp = useSelector(timestamp$);
  const { log } = eventLogStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to changes for logging
  useEffect(() => {
    const unsubCount = count$.on(() => {
      log(`Count changed to: ${count$.get()}`, "success");
    });
    const unsubName = name$.on(() => {
      log(`Name changed to: "${name$.get()}"`, "success");
    });
    return () => {
      unsubCount();
      unsubName();
    };
  }, [log]);

  const increment = () => {
    log("Calling count$.set(prev => prev + 1)");
    count$.set((prev) => prev + 1);
  };

  const decrement = () => {
    log("Calling count$.set(prev => prev - 1)");
    count$.set((prev) => prev - 1);
  };

  const reset = () => {
    log("Calling count$.reset()");
    count$.reset();
  };

  const updateName = () => {
    const newName = inputRef.current?.value || "";
    log(`Calling name$.set("${newName}")`);
    name$.set(newName);
  };

  const refreshTimestamp = () => {
    log("Calling timestamp$.reset() - re-runs lazy initializer");
    timestamp$.reset();
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

// Create an atom with initial value (use $ suffix convention)
const count$ = atom(0);

// Lazy initialization - computed once at creation
const timestamp$ = atom(() => Date.now());

// In your component (shorthand: pass atom directly)
const count = useSelector(count$);

// Update the atom
count$.set(5);              // Direct value
count$.set(prev => prev + 1); // Reducer function
count$.reset();             // Reset to initial value

// Lazy init: reset() re-runs the initializer
timestamp$.reset();         // Gets new timestamp
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
            <button
              onClick={reset}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
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
            <button
              onClick={updateName}
              className="btn-primary flex items-center gap-2"
            >
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

      {/* Lazy Init Demo */}
      <DemoSection
        title="Lazy Initialization"
        description="Pass a function to defer computation. reset() re-runs the initializer."
      >
        <div className="space-y-4">
          <div className="p-4 bg-surface-800/50 rounded-lg">
            <p className="text-sm text-surface-400 mb-1">
              Timestamp (lazy init):
            </p>
            <p className="text-xl font-semibold text-surface-100">
              {timestamp}
            </p>
          </div>

          <button
            onClick={refreshTimestamp}
            className="btn-primary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset (gets new timestamp)
          </button>
        </div>
      </DemoSection>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Lazy Init</h4>
          <p className="text-sm text-surface-400">
            Pass a function to defer computation. reset() re-runs the
            initializer.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Equality Check
          </h4>
          <p className="text-sm text-surface-400">
            Configurable equality for smart re-render prevention.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            $ Suffix Convention
          </h4>
          <p className="text-sm text-surface-400">
            Use $ suffix for all atoms to distinguish reactive state.
          </p>
        </div>
      </div>
    </div>
  );
}
