import { useState, useEffect, useRef } from "react";
import {
  atom,
  derived,
  MutableAtom,
  DerivedAtom,
  AllAtomsRejectedError,
} from "atomirx";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { useEventLog } from "../App";
import { StatusBadge } from "../components/StatusBadge";
import { Workflow, Loader2, CheckCircle, Trophy, Play } from "lucide-react";

// Helper to create delayed promise
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AsyncAtomResult = { name: string; resolvedAt: string };

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
): MutableAtom<Promise<AsyncAtomResult>> => {
  return atom(
    (async () => {
      await delay(delayMs);
      if (shouldFail) throw new Error(`${name} failed`);
      return { name, resolvedAt: new Date().toLocaleTimeString() };
    })(),
    { meta: { key: `async-${name}-${Date.now()}` } }
  );
};

type Atoms = {
  apiA$: MutableAtom<Promise<AsyncAtomResult>>;
  apiB$: MutableAtom<Promise<AsyncAtomResult>>;
  apiC$: MutableAtom<Promise<AsyncAtomResult>>;
  failing$: MutableAtom<Promise<AsyncAtomResult>>;
};

const createFreshAtoms = (): Atoms => ({
  apiA$: createAsyncAtom("API A", 1000, false),
  apiB$: createAsyncAtom("API B", 2000, false),
  apiC$: createAsyncAtom("API C", 3000, false),
  failing$: createAsyncAtom("Failing", 1500, true),
});

export function AsyncUtilitiesDemo() {
  const { log, clear } = useEventLog();

  // Current atoms being observed (kept for potential future use)
  const [, setAtoms] = useState<Atoms | null>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // Derived atoms for tracking state
  const [derivedAtoms, setDerivedAtoms] = useState<{
    apiA$: DerivedAtom<AsyncAtomResult>;
    apiB$: DerivedAtom<AsyncAtomResult>;
    apiC$: DerivedAtom<AsyncAtomResult>;
    failing$: DerivedAtom<AsyncAtomResult>;
  } | null>(null);

  // Force re-render when atoms change
  const [, forceUpdate] = useState({});

  // Subscribe to derived atom changes for UI updates
  useEffect(() => {
    if (!derivedAtoms) return;
    const unsubs = [
      derivedAtoms.apiA$.on(() => forceUpdate({})),
      derivedAtoms.apiB$.on(() => forceUpdate({})),
      derivedAtoms.apiC$.on(() => forceUpdate({})),
      derivedAtoms.failing$.on(() => forceUpdate({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [derivedAtoms]);

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
    d: DerivedAtom<AsyncAtomResult> | undefined
  ): "idle" | "loading" | "success" | "error" => {
    if (!d) return "idle";
    const state = d.state();
    if (state.status === "loading") return "loading";
    if (state.status === "error") return "error";
    return "success";
  };

  // Create fresh atoms and derived wrappers
  const initializeAtoms = () => {
    const fresh = createFreshAtoms();
    setAtoms(fresh);
    setDerivedAtoms({
      apiA$: derived(({ get }) => get(fresh.apiA$)),
      apiB$: derived(({ get }) => get(fresh.apiB$)),
      apiC$: derived(({ get }) => get(fresh.apiC$)),
      failing$: derived(({ get }) => get(fresh.failing$)),
    });
    return fresh;
  };

  // Demo: all() - waits for all to resolve
  const runAllDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = initializeAtoms();
    setActiveDemo("all");

    log("Starting all() demo with API A (1s), API B (2s), API C (3s)", "info");
    log("all() waits for ALL atoms to resolve...", "info");

    // Create a derived atom that uses all()
    const allDerived$ = derived(({ all }) => {
      return all(freshAtoms.apiA$, freshAtoms.apiB$, freshAtoms.apiC$);
    });

    pollIntervalRef.current = setInterval(() => {
      const state = allDerived$.state();
      if (state.status === "ready") {
        stopPolling();
        const results = state.value;
        log(
          `✓ all() resolved after ~3s: [${results.map((r) => r.name).join(", ")}]`,
          "success"
        );
        setActiveDemo(null);
      } else if (state.status === "error") {
        stopPolling();
        log(`✗ all() error: ${(state.error as Error).message}`, "error");
        setActiveDemo(null);
      }
    }, 100);
  };

  // Demo: race() - first settled wins
  const runRaceDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = initializeAtoms();
    setActiveDemo("race");

    log("Starting race() demo with API A (1s), API B (2s), API C (3s)", "info");
    log(
      "race() returns the FIRST atom to settle (resolve or reject)...",
      "info"
    );

    // Create a derived atom that uses race()
    const raceDerived$ = derived(({ race }) => {
      return race(freshAtoms.apiA$, freshAtoms.apiB$, freshAtoms.apiC$);
    });

    pollIntervalRef.current = setInterval(() => {
      const state = raceDerived$.state();
      if (state.status === "ready") {
        stopPolling();
        const value = state.value;
        log(`✓ race() winner after ~1s: ${value.name}`, "success");
        setActiveDemo(null);
      } else if (state.status === "error") {
        stopPolling();
        log(`✗ race() error: ${(state.error as Error).message}`, "error");
        setActiveDemo(null);
      }
    }, 100);
  };

  // Demo: any() - first resolved wins, ignores errors
  const runAnyDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = initializeAtoms();
    setActiveDemo("any");

    log(
      "Starting any() demo with Failing (1.5s, will fail), API A (1s), API C (3s)",
      "info"
    );
    log(
      "any() returns the FIRST atom to RESOLVE (ignores rejections)...",
      "info"
    );

    // Create a derived atom that uses any()
    const anyDerived$ = derived(({ any }) => {
      return any(freshAtoms.failing$, freshAtoms.apiA$, freshAtoms.apiC$);
    });

    pollIntervalRef.current = setInterval(() => {
      const state = anyDerived$.state();
      if (state.status === "ready") {
        stopPolling();
        const value = state.value;
        log(
          `✓ any() winner after ~1s: ${value.name} (Failing was ignored)`,
          "success"
        );
        setActiveDemo(null);
      } else if (state.status === "error") {
        stopPolling();
        if (state.error instanceof AllAtomsRejectedError) {
          log(
            `✗ any() all rejected: ${JSON.stringify(state.error.errors)}`,
            "error"
          );
        } else {
          log(`✗ any() error: ${(state.error as Error).message}`, "error");
        }
        setActiveDemo(null);
      }
    }, 100);
  };

  // Demo: settled() - all statuses
  const runSettledDemo = () => {
    clear();
    stopPolling();
    const freshAtoms = initializeAtoms();
    setActiveDemo("settled");

    log(
      "Starting settled() demo with API A (1s), Failing (1.5s), API C (3s)",
      "info"
    );
    log(
      "settled() waits for ALL atoms to settle, then returns their statuses...",
      "info"
    );

    // Create a derived atom that uses settled()
    const settledDerived$ = derived(({ settled }) => {
      return settled(freshAtoms.apiA$, freshAtoms.failing$, freshAtoms.apiC$);
    });

    pollIntervalRef.current = setInterval(() => {
      const state = settledDerived$.state();
      if (state.status === "ready") {
        stopPolling();
        const results = state.value;
        const summary = results
          .map((r, i) => {
            const name = ["apiA$", "failing$", "apiC$"][i];
            return `${name}: ${r.status}`;
          })
          .join(", ");
        log(`✓ settled() after ~3s: { ${summary} }`, "success");
        setActiveDemo(null);
      } else if (state.status === "error") {
        stopPolling();
        log(`✗ settled() error: ${(state.error as Error).message}`, "error");
        setActiveDemo(null);
      }
    }, 100);
  };

  const atomsList = derivedAtoms
    ? [
        {
          name: "API A",
          atom: derivedAtoms.apiA$,
          delay: "1s",
          willFail: false,
        },
        {
          name: "API B",
          atom: derivedAtoms.apiB$,
          delay: "2s",
          willFail: false,
        },
        {
          name: "API C",
          atom: derivedAtoms.apiC$,
          delay: "3s",
          willFail: false,
        },
        {
          name: "Failing",
          atom: derivedAtoms.failing$,
          delay: "1.5s",
          willFail: true,
        },
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
// Using SelectContext utilities in derived/useValue/effect/rx

// all() - Wait for all to resolve (like Promise.all)
const dashboard$ = derived(({ all }) => {
  const [user, posts] = all(user$, posts$);
  return { user, posts };
});

// race() - First settled wins (like Promise.race)
const fastest$ = derived(({ race }) => {
  const value = race(cache$, api$);
  return value;
});

// any() - First resolved wins, ignores rejections (like Promise.any)
const data$ = derived(({ any }) => {
  const value = any(primary$, fallback$);
  return value;
});

// settled() - Get all statuses (like Promise.allSettled)
const results$ = derived(({ settled }) => {
  const [userResult, postsResult] = settled(user$, posts$);
  return {
    user: userResult.status === "ready" ? userResult.value : null,
    posts: postsResult.status === "ready" ? postsResult.value : [],
  };
});
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
            {atomsList.map(({ name, atom: a, delay: d, willFail }) => {
              const status = getAtomStatus(a);
              return (
                <div
                  key={name}
                  className={`p-3 rounded-lg transition-all ${
                    status === "loading"
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : status === "error"
                        ? "bg-red-500/10 border border-red-500/30"
                        : "bg-emerald-500/10 border border-emerald-500/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-surface-200">
                      {name}
                    </p>
                    <span className="text-xs text-surface-500">{d}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    {status === "loading" && (
                      <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                    )}
                  </div>
                  {willFail && status === "error" && (
                    <p className="text-xs text-red-400 mt-1">Rejected!</p>
                  )}
                </div>
              );
            })}
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
              <span className="font-semibold text-emerald-300">Run all()</span>
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
                <td className="py-2 px-3">Array of values</td>
                <td className="py-2 px-3">Throws first error</td>
                <td className="py-2 px-3">Need all data</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 px-3 font-mono text-primary-400">race()</td>
                <td className="py-2 px-3">First value</td>
                <td className="py-2 px-3">
                  Throws if first settles with error
                </td>
                <td className="py-2 px-3">Timeout patterns</td>
              </tr>
              <tr className="border-b border-surface-800">
                <td className="py-2 px-3 font-mono text-primary-400">any()</td>
                <td className="py-2 px-3">First resolved value</td>
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
