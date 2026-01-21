/**
 * @module UseActionDemo
 * @description Demonstrates useAction hook for handling async actions with automatic state management.
 */

import { atom } from "atomirx";
import { useAction, useSelector } from "atomirx/react";
import { DemoSection, CodeBlock, StatusBadge } from "../../../../ui";
import { eventLogStore } from "../../stores";
import {
  Play,
  Square,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

// Simulated API calls
const fetchData = async (
  signal: AbortSignal,
  delay = 2000,
  shouldFail = false
): Promise<{ id: number; data: string }> => {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delay);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  if (shouldFail) {
    throw new Error("Request failed");
  }

  return {
    id: Math.floor(Math.random() * 1000),
    data: `Data fetched at ${new Date().toLocaleTimeString()}`,
  };
};

// Atom for auto-dispatch demo (use $ suffix convention)
const userId$ = atom(1, { meta: { key: "userId" } });

/**
 * Demo component showing useAction hook capabilities.
 *
 * @description
 * Demonstrates how useAction provides automatic state management for
 * async operations including loading states, error handling, abort
 * support, and auto-dispatch with atom dependencies.
 *
 * @example
 * ```tsx
 * <UseActionDemo />
 * ```
 */
export function UseActionDemo() {
  // Shorthand: pass atom directly to get its value
  const userId = useSelector(userId$);
  const { log } = eventLogStore();

  // Basic manual dispatch (lazy: true by default)
  const basicAction = useAction(async ({ signal }) => {
    return fetchData(signal);
  });

  // With exclusive disabled (allows concurrent requests)
  const noExclusiveAction = useAction(
    async ({ signal }) => {
      return fetchData(signal, 3000);
    },
    { exclusive: false }
  );

  // Auto-dispatch with deps (lazy: false)
  const autoAction = useAction(
    async ({ signal }) => {
      return fetchData(signal, 1500);
    },
    { lazy: false, deps: [userId$] }
  );

  // Sync action
  const syncAction = useAction(() => {
    return { computed: Math.random() * 100 };
  });

  const handleBasicDispatch = async () => {
    log("Dispatching basic action...");
    try {
      const result = await basicAction();
      log(`Success: ${JSON.stringify(result)}`, "success");
    } catch (e) {
      log(`Error: ${(e as Error).message}`, "error");
    }
  };

  const getStatusFromAction = (action: {
    status: string;
  }): "idle" | "loading" | "success" | "error" => {
    return action.status as "idle" | "loading" | "success" | "error";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">useAction</h2>
        <p className="text-surface-400">
          A powerful React hook for handling async actions with automatic state
          management, abort support, and auto-dispatch capabilities.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { useAction } from "atomirx/react";

// Basic usage - action is callable
const fetchPosts = useAction(async ({ signal }) => {
  const response = await fetch('/api/data', { signal });
  return response.json();
});

// Call it like a function
const promise = fetchPosts();
promise.abort(); // or fetchPosts.abort()

// Access state
console.log(fetchPosts.status); // "idle" | "loading" | "success" | "error"
console.log(fetchPosts.result); // The resolved value
console.log(fetchPosts.error);  // Error if failed

// Auto-dispatch on mount and when deps change
const autoFetch = useAction(
  async ({ signal }) => fetchUser(userId, { signal }),
  { lazy: false, deps: [userId$] }
);
        `}
      />

      {/* Basic Action Demo */}
      <DemoSection
        title="Manual Dispatch"
        description="Dispatch actions manually and track their state"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={getStatusFromAction(basicAction)} />
            {basicAction.status === "loading" && (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            )}
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg min-h-[80px]">
            {basicAction.status === "idle" && (
              <div className="flex items-center gap-2 text-surface-400">
                <Clock className="w-5 h-5" />
                <span>Click dispatch to start</span>
              </div>
            )}
            {basicAction.status === "loading" && (
              <div className="flex items-center gap-2 text-amber-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {basicAction.status === "success" && (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <pre className="text-sm">
                  {JSON.stringify(basicAction.result, null, 2)}
                </pre>
              </div>
            )}
            {basicAction.status === "error" && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{(basicAction.error as Error)?.message}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBasicDispatch}
              className="btn-primary flex items-center gap-2"
              disabled={basicAction.status === "loading"}
            >
              <Play className="w-4 h-4" />
              Dispatch
            </button>
            <button
              onClick={() => {
                basicAction.abort();
                log("Aborted action", "warning");
              }}
              className="btn-secondary flex items-center gap-2"
              disabled={basicAction.status !== "loading"}
            >
              <Square className="w-4 h-4" />
              Abort
            </button>
          </div>
        </div>
      </DemoSection>

      {/* Exclusive Mode Demo */}
      <DemoSection
        title="Exclusive Mode"
        description="By default, re-dispatching aborts the previous request (exclusive: true)"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={getStatusFromAction(noExclusiveAction)} />
            <span className="text-xs text-surface-500">
              exclusive: false (allows concurrent requests)
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                noExclusiveAction();
                log("Started long-running action (3s)");
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start (3s)
            </button>
            <button
              onClick={() => {
                noExclusiveAction.abort();
                log("Manually aborted", "warning");
              }}
              className="btn-secondary flex items-center gap-2"
              disabled={noExclusiveAction.status !== "loading"}
            >
              <Square className="w-4 h-4" />
              Manual Abort
            </button>
          </div>

          <p className="text-sm text-surface-400">
            With <code className="text-primary-400">exclusive: false</code>,
            multiple dispatches can run in parallel. Use{" "}
            <code className="text-primary-400">abort()</code> to cancel.
          </p>
        </div>
      </DemoSection>

      {/* Auto-Dispatch Demo */}
      <DemoSection
        title="Auto-Dispatch with Atom Deps"
        description="Automatically re-dispatch when atom dependencies change"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={getStatusFromAction(autoAction)} />
            <span className="text-xs text-surface-500">
              lazy: false, deps: [userIdAtom]
            </span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-surface-400">User ID:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => userId$.set((prev) => Math.max(1, prev - 1))}
                className="btn-secondary px-3 py-1"
              >
                -
              </button>
              <span className="w-12 text-center text-xl font-bold text-primary-400">
                {userId}
              </span>
              <button
                onClick={() => userId$.set((prev) => prev + 1)}
                className="btn-secondary px-3 py-1"
              >
                +
              </button>
            </div>
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            {autoAction.status === "loading" ? (
              <div className="flex items-center gap-2 text-amber-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Fetching user {userId}...</span>
              </div>
            ) : autoAction.status === "success" ? (
              <div className="text-emerald-400">
                <pre className="text-sm">
                  {JSON.stringify(autoAction.result, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>

          <p className="text-sm text-surface-400">
            Change the User ID to trigger an automatic re-fetch. Previous
            requests are automatically aborted.
          </p>
        </div>
      </DemoSection>

      {/* Sync Action Demo */}
      <DemoSection
        title="Sync Actions"
        description="useAction also works with synchronous functions"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={getStatusFromAction(syncAction)} />
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            {syncAction.status === "success" && (
              <p className="text-emerald-400">
                Computed:{" "}
                {(syncAction.result as { computed: number })?.computed.toFixed(
                  2
                )}
              </p>
            )}
          </div>

          <button
            onClick={() => syncAction()}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Compute Random
          </button>
        </div>
      </DemoSection>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">AbortSignal</h4>
          <p className="text-sm text-surface-400">
            Every dispatch gets a fresh AbortSignal for cancellation support.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Stale Prevention
          </h4>
          <p className="text-sm text-surface-400">
            Outdated results are automatically ignored when a new dispatch
            starts.
          </p>
        </div>
      </div>
    </div>
  );
}
