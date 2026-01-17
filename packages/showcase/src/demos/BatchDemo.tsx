import { useState, useEffect, useRef } from "react";
import { atom, batch } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { useEventLog } from "../App";
import { Layers, Zap, ArrowRight, Users } from "lucide-react";

// Create atoms for demo
const counterAtom = atom(0, { key: "counter" });
const atomA = atom(0, { key: "atomA" });
const atomB = atom(0, { key: "atomB" });
const atomC = atom(0, { key: "atomC" });

export function BatchDemo() {
  // Shorthand: pass atom directly to get its value
  const counter = useSelector(counterAtom);
  const a = useSelector(atomA);
  const b = useSelector(atomB);
  const c = useSelector(atomC);

  const { log, clear } = useEventLog();
  const [notificationCount, setNotificationCount] = useState(0);
  const [sharedListenerCount, setSharedListenerCount] = useState(0);
  const notificationCountRef = useRef(0);
  const sharedListenerCountRef = useRef(0);

  // Track notifications for the counter atom
  useEffect(() => {
    const unsub = counterAtom.on(() => {
      notificationCountRef.current++;
      setNotificationCount(notificationCountRef.current);
      log(`Counter notified: ${counterAtom.value}`, "success");
    });
    return unsub;
  }, [log]);

  // Shared listener subscribed to multiple atoms (demonstrates deduping)
  useEffect(() => {
    const sharedListener = () => {
      sharedListenerCountRef.current++;
      setSharedListenerCount(sharedListenerCountRef.current);
      log(
        `Shared listener called (A=${atomA.value}, B=${atomB.value}, C=${atomC.value})`,
        "info"
      );
    };

    const unsubs = [
      atomA.on(sharedListener),
      atomB.on(sharedListener),
      atomC.on(sharedListener),
    ];
    return () => unsubs.forEach((u) => u());
  }, [log]);

  const resetCounters = () => {
    notificationCountRef.current = 0;
    sharedListenerCountRef.current = 0;
    setNotificationCount(0);
    setSharedListenerCount(0);
    counterAtom.reset();
    atomA.reset();
    atomB.reset();
    atomC.reset();
    clear();
    log("Reset all atoms and counters");
  };

  const updateWithoutBatch = () => {
    log("Updating counter 3 times WITHOUT batch...", "warning");
    const startCount = notificationCountRef.current;

    counterAtom.set((prev) => prev + 1);
    counterAtom.set((prev) => prev + 1);
    counterAtom.set((prev) => prev + 1);

    const notifications = notificationCountRef.current - startCount;
    log(`Completed: ${notifications} notifications fired`, "warning");
  };

  const updateWithBatch = () => {
    log("Updating counter 3 times WITH batch...", "info");
    const startCount = notificationCountRef.current;

    batch(() => {
      counterAtom.set((prev) => prev + 1);
      counterAtom.set((prev) => prev + 1);
      counterAtom.set((prev) => prev + 1);
    });

    const notifications = notificationCountRef.current - startCount;
    log(`Completed: ${notifications} notification fired (batched!)`, "success");
  };

  // Demo: Multiple atoms WITHOUT batch - shared listener called 3 times
  const updateMultipleAtomsWithoutBatch = () => {
    log("Updating A, B, C WITHOUT batch...", "warning");
    const startCount = sharedListenerCountRef.current;

    atomA.set((prev) => prev + 1);
    atomB.set((prev) => prev + 1);
    atomC.set((prev) => prev + 1);

    const calls = sharedListenerCountRef.current - startCount;
    log(`Shared listener called ${calls} times (once per atom)`, "warning");
  };

  // Demo: Multiple atoms WITH batch - shared listener called only ONCE (deduped!)
  const updateMultipleAtomsWithBatch = () => {
    log("Updating A, B, C WITH batch...", "info");
    const startCount = sharedListenerCountRef.current;

    batch(() => {
      atomA.set((prev) => prev + 1);
      atomB.set((prev) => prev + 1);
      atomC.set((prev) => prev + 1);
    });

    const calls = sharedListenerCountRef.current - startCount;
    log(`Shared listener called ${calls} time (deduped!)`, "success");
  };

  const nestedBatchDemo = () => {
    log("Nested batch demo (5 updates to counter)...", "info");
    const startCount = notificationCountRef.current;

    batch(() => {
      log("  Outer batch: +1");
      counterAtom.set((prev) => prev + 1);

      batch(() => {
        log("  Inner batch: +1, +1");
        counterAtom.set((prev) => prev + 1);
        counterAtom.set((prev) => prev + 1);
      });

      log("  Back to outer: +1, +1");
      counterAtom.set((prev) => prev + 1);
      counterAtom.set((prev) => prev + 1);
    });

    const notifications = notificationCountRef.current - startCount;
    log(`Nested batch completed: ${notifications} notification`, "success");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">Batch</h2>
        <p className="text-surface-400">
          Batch multiple updates into a single notification cycle. Listeners are{" "}
          <strong>deduped</strong> - same listener subscribed to multiple atoms
          is only called once.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { atom, batch } from "atomirx";

const counter = atom(0);

// Without batch: 3 notifications (one per set)
counter.set(1);  // → notify
counter.set(2);  // → notify  
counter.set(3);  // → notify

// With batch: 1 notification (at the end)
batch(() => {
  counter.set(1);  // deferred
  counter.set(2);  // deferred
  counter.set(3);  // deferred
});  // → notify once

// Listener deduping across multiple atoms
const a = atom(0), b = atom(0), c = atom(0);
const sharedListener = () => console.log("updated!");

a.on(sharedListener);
b.on(sharedListener);
c.on(sharedListener);

// Without batch: sharedListener called 3 times
a.set(1); b.set(1); c.set(1);

// With batch: sharedListener called ONCE (deduped!)
batch(() => {
  a.set(1); b.set(1); c.set(1);
});
        `}
      />

      {/* Current State */}
      <DemoSection
        title="Current State"
        description="Watch notification counts change with different batching strategies"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/30 text-center">
              <p className="text-xs text-surface-400 mb-1">Counter</p>
              <p className="text-3xl font-bold text-primary-400">{counter}</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700 text-center">
              <p className="text-xs text-surface-400 mb-1">A / B / C</p>
              <p className="text-3xl font-bold text-surface-300">
                {a} / {b} / {c}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-accent-500/10 border border-accent-500/30 text-center">
              <p className="text-xs text-surface-400 mb-1">Counter Notifs</p>
              <p className="text-3xl font-bold text-accent-400">
                {notificationCount}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-center">
              <p className="text-xs text-surface-400 mb-1">Shared Listener</p>
              <p className="text-3xl font-bold text-cyan-400">
                {sharedListenerCount}
              </p>
            </div>
          </div>
        </div>
      </DemoSection>

      {/* Single Atom Batching */}
      <DemoSection
        title="Single Atom Batching"
        description="Multiple updates to the same atom = 1 notification"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={updateWithoutBatch}
              className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-amber-300">
                  Without Batch (+3)
                </span>
              </div>
              <p className="text-sm text-surface-400">
                3 separate set() calls trigger 3 notifications
              </p>
              <p className="text-xs text-amber-400 mt-2">
                Expected: 3 notifications
              </p>
            </button>

            <button
              onClick={updateWithBatch}
              className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-emerald-300">
                  With Batch (+3)
                </span>
              </div>
              <p className="text-sm text-surface-400">
                3 set() calls batched into 1 notification
              </p>
              <p className="text-xs text-emerald-400 mt-2">
                Expected: 1 notification
              </p>
            </button>
          </div>

          <button
            onClick={nestedBatchDemo}
            className="btn-accent flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            Nested Batch (+5)
          </button>
        </div>
      </DemoSection>

      {/* Listener Deduping - NEW FEATURE */}
      <DemoSection
        title="Listener Deduping (Multi-Atom)"
        description="Same listener subscribed to multiple atoms is only called once per batch"
      >
        <div className="space-y-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-cyan-300">
              <strong>New!</strong> A shared listener is subscribed to atoms A,
              B, and C. Watch how batch dedupes the listener calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={updateMultipleAtomsWithoutBatch}
              className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-amber-300">
                  A, B, C Without Batch
                </span>
              </div>
              <p className="text-sm text-surface-400">
                Update 3 atoms separately - shared listener called 3 times
              </p>
              <p className="text-xs text-amber-400 mt-2">
                Expected: 3 listener calls
              </p>
            </button>

            <button
              onClick={updateMultipleAtomsWithBatch}
              className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-cyan-300">
                  A, B, C With Batch
                </span>
              </div>
              <p className="text-sm text-surface-400">
                Update 3 atoms in batch - shared listener called only ONCE
              </p>
              <p className="text-xs text-cyan-400 mt-2">
                Expected: 1 listener call (deduped!)
              </p>
            </button>
          </div>

          <button onClick={resetCounters} className="btn-secondary">
            Reset All
          </button>
        </div>
      </DemoSection>

      {/* How It Works */}
      <DemoSection
        title="How Batching Works"
        description="Visual representation of the batching mechanism"
      >
        <div className="space-y-4">
          <div className="p-4 bg-surface-800/50 rounded-lg">
            <p className="text-sm text-amber-400 mb-3 font-semibold">
              Without batch (3 notifications):
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1 bg-amber-500/20 rounded text-amber-300 text-sm">
                set(1)
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500" />
              <div className="px-3 py-1 bg-red-500/20 rounded text-red-300 text-sm">
                notify!
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500" />
              <div className="px-3 py-1 bg-amber-500/20 rounded text-amber-300 text-sm">
                set(2)
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500" />
              <div className="px-3 py-1 bg-red-500/20 rounded text-red-300 text-sm">
                notify!
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500" />
              <div className="px-3 py-1 bg-amber-500/20 rounded text-amber-300 text-sm">
                set(3)
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500" />
              <div className="px-3 py-1 bg-red-500/20 rounded text-red-300 text-sm">
                notify!
              </div>
            </div>
          </div>

          <div className="text-center text-surface-500">vs</div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            <p className="text-sm text-emerald-400 mb-3 font-semibold">
              With batch (1 notification, listeners deduped):
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1 bg-emerald-500/20 rounded text-emerald-300 text-sm">
                batch(() =&gt; {"{"}
              </div>
              <div className="px-3 py-1 bg-surface-700 rounded text-surface-300 text-sm">
                set(1)
              </div>
              <div className="px-3 py-1 bg-surface-700 rounded text-surface-300 text-sm">
                set(2)
              </div>
              <div className="px-3 py-1 bg-surface-700 rounded text-surface-300 text-sm">
                set(3)
              </div>
              <div className="px-3 py-1 bg-emerald-500/20 rounded text-emerald-300 text-sm">
                {"}"})
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500" />
              <div className="px-3 py-1 bg-emerald-500/20 rounded text-emerald-300 text-sm">
                notify once!
              </div>
            </div>
          </div>
        </div>
      </DemoSection>

      {/* Key Points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Single Atom Batching
          </h4>
          <p className="text-sm text-surface-400">
            Multiple updates to the same atom = 1 notification at batch end.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Listener Deduping
          </h4>
          <p className="text-sm text-surface-400">
            Same listener on multiple atoms = 1 call per batch (not per atom).
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Nested Support
          </h4>
          <p className="text-sm text-surface-400">
            Nested batch() calls are supported - notifications deferred to
            outermost batch.
          </p>
        </div>
      </div>

    </div>
  );
}
