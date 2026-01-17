import { useState, useEffect, useRef } from "react";
import {
  atom,
  all,
  any,
  race,
  settled,
  AllGettersRejectedError,
  MutableAtom,
} from "atomirx";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { LogPanel, useLogger } from "../components/LogPanel";
import { StatusBadge } from "../components/StatusBadge";
import { Workflow, Loader2, CheckCircle, Trophy, Play } from "lucide-react";

// Helper to create delayed promise
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Check if value is a promise-like object
const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  value != null &&
  typeof value === "object" &&
  "then" in value &&
  typeof (value as any).then === "function";

type AsyncAtomResult = { name: string; resolvedAt: string };

// Create a suspense-style getter from an atom
// This follows the same pattern as select.ts:createSuspenseGetter
// - If stale(): returns value (fallback/previous) - HIGHEST PRIORITY
// - If loading: throws the atom (which is PromiseLike)
// - If error: throws the error
// - Otherwise: returns the value
const createGetter = <T,>(a: MutableAtom<T>) => {
  return () => {
    // stale() check is HIGHEST priority
    // If fallback mode enabled and loading/error → return value (never throw)
    if (a.stale()) {
      return a.value as T;
    }

    if (a.loading) {
      // Atom is PromiseLike (has .then method), throw it directly
      throw a;
    }
    if (a.error !== undefined) {
      throw a.error;
    }
    return a.value as T;
  };
};

// Atom definitions with their timing
const ATOM_CONFIGS = [
  { name: "API A", delayMs: 1000, shouldFail: false, color: "emerald" },
  { name: "API B", delayMs: 2000, shouldFail: false, color: "blue" },
  { name: "API C", delayMs: 3000, shouldFail: false, color: "purple" },
  { name: "Failing", delayMs: 1500, shouldFail: true, color: "red" },
] as const;

// Create async atom with given config
const createAsyncAtom = (
  name: string,
  delayMs: number,
  shouldFail: boolean
): MutableAtom<AsyncAtomResult> => {
  return atom(
    (async () => {
      await delay(delayMs);
      if (shouldFail) throw new Error(`${name} failed`);
      return { name, resolvedAt: new Date().toLocaleTimeString() };
    })(),
    { key: `async-${name}-${Date.now()}` }
  );
};

type Atoms = {
  apiA: MutableAtom<AsyncAtomResult>;
  apiB: MutableAtom<AsyncAtomResult>;
  apiC: MutableAtom<AsyncAtomResult>;
  failing: MutableAtom<AsyncAtomResult>;
};

const createFreshAtoms = (): Atoms => ({
  apiA: createAsyncAtom("API A", 1000, false),
  apiB: createAsyncAtom("API B", 2000, false),
  apiC: createAsyncAtom("API C", 3000, false),
  failing: createAsyncAtom("Failing", 1500, true),
});

export function AsyncUtilitiesDemo() {
  const [logs, setLogs] = useState<
    {
      id: number;
      message: string;
      timestamp: Date;
      type?: "info" | "success" | "error" | "warning";
    }[]
  >([]);
  const { log, clear, setSetLogs } = useLogger();

  // Current atoms being observed
  const [atoms, setAtoms] = useState<Atoms | null>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // Force re-render when atoms change
  const [, forceUpdate] = useState({});

  // Subscribe to atom changes for UI updates
  useEffect(() => {
    if (!atoms) return;
    const unsubs = [
      atoms.apiA.on(() => forceUpdate({})),
      atoms.apiB.on(() => forceUpdate({})),
      atoms.apiC.on(() => forceUpdate({})),
      atoms.failing.on(() => forceUpdate({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [atoms]);

  useEffect(() => {
    setSetLogs(setLogs);
  }, [setSetLogs]);

  // Polling for demo results
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const getAtomStatus = (
    a: MutableAtom<AsyncAtomResult> | undefined
  ): "idle" | "loading" | "success" | "error" => {
    if (!a) return "idle";
    if (a.loading) return "loading";
    if (a.error) return "error";
    return "success";
  };

  // Demo: all() - waits for all to resolve
  const runAllDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = createFreshAtoms();
    setAtoms(freshAtoms);
    setActiveDemo("all");

    log("Starting all() demo with API A (1s), API B (2s), API C (3s)", "info");
    log("all() waits for ALL atoms to resolve...", "info");

    pollIntervalRef.current = setInterval(() => {
      try {
        const results = all([
          createGetter(freshAtoms.apiA),
          createGetter(freshAtoms.apiB),
          createGetter(freshAtoms.apiC),
        ]);
        stopPolling();
        log(
          `✓ all() resolved after ~3s: [${results.map((r) => r.name).join(", ")}]`,
          "success"
        );
        setActiveDemo(null);
      } catch (thrown) {
        if (!isPromiseLike(thrown)) {
          stopPolling();
          log(`✗ all() error: ${(thrown as Error).message}`, "error");
          setActiveDemo(null);
        }
        // Still loading - continue polling
      }
    }, 100);
  };

  // Demo: race() - first settled wins
  const runRaceDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = createFreshAtoms();
    setAtoms(freshAtoms);
    setActiveDemo("race");

    log("Starting race() demo with API A (1s), API B (2s), API C (3s)", "info");
    log("race() returns the FIRST atom to settle (resolve or reject)...", "info");

    pollIntervalRef.current = setInterval(() => {
      try {
        const [winner, value] = race({
          apiA: createGetter(freshAtoms.apiA),
          apiB: createGetter(freshAtoms.apiB),
          apiC: createGetter(freshAtoms.apiC),
        });
        stopPolling();
        log(`✓ race() winner after ~1s: "${winner}" = ${value.name}`, "success");
        setActiveDemo(null);
      } catch (thrown) {
        if (!isPromiseLike(thrown)) {
          stopPolling();
          log(`✗ race() error: ${(thrown as Error).message}`, "error");
          setActiveDemo(null);
        }
      }
    }, 100);
  };

  // Demo: any() - first resolved wins, ignores errors
  const runAnyDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = createFreshAtoms();
    setAtoms(freshAtoms);
    setActiveDemo("any");

    log(
      "Starting any() demo with Failing (1.5s, will fail), API A (1s), API C (3s)",
      "info"
    );
    log("any() returns the FIRST atom to RESOLVE (ignores rejections)...", "info");

    pollIntervalRef.current = setInterval(() => {
      try {
        const [winner, value] = any({
          failing: createGetter(freshAtoms.failing),
          apiA: createGetter(freshAtoms.apiA),
          apiC: createGetter(freshAtoms.apiC),
        });
        stopPolling();
        log(
          `✓ any() winner after ~1s: "${winner}" = ${value.name} (Failing was ignored)`,
          "success"
        );
        setActiveDemo(null);
      } catch (thrown) {
        if (isPromiseLike(thrown)) {
          // Still loading
        } else if (thrown instanceof AllGettersRejectedError) {
          stopPolling();
          log(`✗ any() all rejected: ${JSON.stringify(thrown.errors)}`, "error");
          setActiveDemo(null);
        } else {
          stopPolling();
          log(`✗ any() error: ${(thrown as Error).message}`, "error");
          setActiveDemo(null);
        }
      }
    }, 100);
  };

  // Demo: settled() - all statuses
  const runSettledDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = createFreshAtoms();
    setAtoms(freshAtoms);
    setActiveDemo("settled");

    log(
      "Starting settled() demo with API A (1s), Failing (1.5s), API C (3s)",
      "info"
    );
    log("settled() waits for ALL atoms to settle, then returns their statuses...", "info");

    pollIntervalRef.current = setInterval(() => {
      try {
        const results = settled({
          apiA: createGetter(freshAtoms.apiA),
          failing: createGetter(freshAtoms.failing),
          apiC: createGetter(freshAtoms.apiC),
        });
        stopPolling();
        const summary = Object.entries(results)
          .map(([k, v]) => `${k}: ${v.status}`)
          .join(", ");
        log(`✓ settled() after ~3s: { ${summary} }`, "success");
        setActiveDemo(null);
      } catch (thrown) {
        if (!isPromiseLike(thrown)) {
          stopPolling();
          log(`✗ settled() error: ${(thrown as Error).message}`, "error");
          setActiveDemo(null);
        }
      }
    }, 100);
  };

  const atomsList = atoms
    ? [
        { name: "API A", atom: atoms.apiA, delay: "1s", willFail: false },
        { name: "API B", atom: atoms.apiB, delay: "2s", willFail: false },
        { name: "API C", atom: atoms.apiC, delay: "3s", willFail: false },
        { name: "Failing", atom: atoms.failing, delay: "1.5s", willFail: true },
      ]
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">
          Async Utilities
        </h2>
        <p className="text-surface-400">
          Suspense-style utilities for coordinating multiple async atoms:
          <code className="text-primary-400 mx-1">all</code>,
          <code className="text-primary-400 mx-1">any</code>,
          <code className="text-primary-400 mx-1">race</code>, and
          <code className="text-primary-400 mx-1">settled</code>.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { all, any, race, settled } from "atomirx";

// all() - Wait for all to resolve (like Promise.all)
const [user, settings] = all([getUser, getSettings]);

// race() - First settled wins (like Promise.race)
const [winner, value] = race({ cache: getCache, api: getApi });

// any() - First resolved wins, ignores rejections (like Promise.any)
const [winner, value] = any({ primary: getPrimary, fallback: getFallback });

// settled() - Get all statuses (like Promise.allSettled)
const results = settled({ user: getUser, settings: getSettings });
// results.user.status === "resolved" | "rejected"
        `}
      />

      {/* Available Atoms Info */}
      <DemoSection
        title="Test Atoms"
        description="These atoms simulate async API calls with different timings"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ATOM_CONFIGS.map((config) => (
            <div
              key={config.name}
              className={`p-3 bg-surface-800/50 rounded-lg border-l-4 border-${config.color}-500`}
            >
              <p className="font-semibold text-surface-100">{config.name}</p>
              <p className="text-sm text-surface-400">
                {config.delayMs / 1000}s delay
              </p>
              {config.shouldFail && (
                <p className="text-xs text-red-400 mt-1">Will reject</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-surface-500 mt-4">
          Click a demo button below to create fresh atoms and observe the async
          utility behavior in real-time.
        </p>
      </DemoSection>

      {/* Live Atom Status */}
      {atomsList && (
        <DemoSection
          title="Live Atom Status"
          description={`Running: ${activeDemo}() - watch atoms resolve/reject`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {atomsList.map(({ name, atom: a, delay: d, willFail }) => (
              <div
                key={name}
                className={`p-3 rounded-lg transition-all ${
                  a.loading
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : a.error
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-surface-200">{name}</p>
                  <span className="text-xs text-surface-500">{d}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={getAtomStatus(a)} />
                  {a.loading && (
                    <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  )}
                </div>
                {willFail && !a.loading && a.error !== undefined && (
                  <p className="text-xs text-red-400 mt-1">Rejected!</p>
                )}
              </div>
            ))}
          </div>
        </DemoSection>
      )}

      {/* Demo Buttons */}
      <DemoSection
        title="Run Demos"
        description="Each button creates fresh atoms and runs the async utility"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* all() */}
          <button
            onClick={runAllDemo}
            disabled={activeDemo !== null}
            className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-emerald-300">
                Run all()
              </span>
              {activeDemo === "all" && (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin ml-auto" />
              )}
            </div>
            <p className="text-sm text-surface-400">
              Waits for API A, B, C to all resolve (~3s)
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Like Promise.all - all must succeed
            </p>
          </button>

          {/* race() */}
          <button
            onClick={runRaceDemo}
            disabled={activeDemo !== null}
            className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-amber-300">Run race()</span>
              {activeDemo === "race" && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin ml-auto" />
              )}
            </div>
            <p className="text-sm text-surface-400">
              Returns first to settle: API A wins (~1s)
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Like Promise.race - fastest wins
            </p>
          </button>

          {/* any() */}
          <button
            onClick={runAnyDemo}
            disabled={activeDemo !== null}
            className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-blue-300">Run any()</span>
              {activeDemo === "any" && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin ml-auto" />
              )}
            </div>
            <p className="text-sm text-surface-400">
              First to resolve wins, ignores Failing (~1s)
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Like Promise.any - errors ignored
            </p>
          </button>

          {/* settled() */}
          <button
            onClick={runSettledDemo}
            disabled={activeDemo !== null}
            className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg hover:bg-surface-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-2">
              <Workflow className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-purple-300">
                Run settled()
              </span>
              {activeDemo === "settled" && (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin ml-auto" />
              )}
            </div>
            <p className="text-sm text-surface-400">
              Returns all statuses after all settle (~3s)
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Like Promise.allSettled - includes failures
            </p>
          </button>
        </div>
      </DemoSection>

      {/* Event Log */}
      <DemoSection title="Event Log">
        <div className="space-y-3">
          <LogPanel logs={logs} maxHeight="300px" />
          <button onClick={clear} className="btn-secondary text-sm">
            Clear Logs
          </button>
        </div>
      </DemoSection>

      {/* Comparison Table */}
      <DemoSection title="Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-2 px-3 text-surface-400">
                  Utility
                </th>
                <th className="text-left py-2 px-3 text-surface-400">
                  Returns
                </th>
                <th className="text-left py-2 px-3 text-surface-400">
                  On Error
                </th>
                <th className="text-left py-2 px-3 text-surface-400">
                  Use Case
                </th>
              </tr>
            </thead>
            <tbody className="text-surface-300">
              <tr className="border-b border-surface-800">
                <td className="py-2 px-3 font-mono text-primary-400">all()</td>
                <td className="py-2 px-3">All values</td>
                <td className="py-2 px-3">Throws first error</td>
                <td className="py-2 px-3">Need all data</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 px-3 font-mono text-primary-400">race()</td>
                <td className="py-2 px-3">[key, value]</td>
                <td className="py-2 px-3">
                  Throws if first settles with error
                </td>
                <td className="py-2 px-3">Timeout patterns</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 px-3 font-mono text-primary-400">any()</td>
                <td className="py-2 px-3">[key, value]</td>
                <td className="py-2 px-3">Ignores until all fail</td>
                <td className="py-2 px-3">Fallback patterns</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-primary-400">
                  settled()
                </td>
                <td className="py-2 px-3">Status objects</td>
                <td className="py-2 px-3">Includes in results</td>
                <td className="py-2 px-3">Partial success OK</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DemoSection>
    </div>
  );
}
