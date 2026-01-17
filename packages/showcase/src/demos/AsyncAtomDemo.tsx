import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { atom, MutableAtom } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { StatusBadge } from "../components/StatusBadge";
import { LogPanel, useLogger } from "../components/LogPanel";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

type User = { name: string; email: string; fetchedAt?: string };

// Simulated API call
const fetchUser = (shouldFail = false): Promise<User> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error("Failed to fetch user"));
      } else {
        resolve({
          name: "John Doe",
          email: "john@example.com",
          fetchedAt: new Date().toLocaleTimeString(),
        });
      }
    }, 1500);
  });

/**
 * Component that uses useSelector with async atom.
 * This will suspend while loading and throw on error.
 * MUST be wrapped with Suspense and ErrorBoundary.
 */
function UserDisplay({
  userAtom,
}: {
  userAtom: ReturnType<typeof atom<User>>;
}) {
  // useSelector throws Promise while loading (triggers Suspense)
  // useSelector throws Error on rejection (triggers ErrorBoundary)
  const user = useSelector(userAtom);

  return (
    <div className="flex items-center gap-3 text-emerald-400">
      <CheckCircle className="w-5 h-5" />
      <div>
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-surface-400">{user.email}</p>
      </div>
    </div>
  );
}

/**
 * Component that uses useSelector with fallback atom.
 * With fallback, value is always available (fallback during loading/error).
 * stale() indicates if the value is from fallback or previous value.
 */
function UserWithFallbackDisplay({
  userAtom,
  onStaleChange,
}: {
  userAtom: MutableAtom<User, User>;
  onStaleChange: (stale: boolean) => void;
}) {
  const user = useSelector(userAtom);
  const isStale = userAtom.stale();

  // Report stale status to parent
  useEffect(() => {
    onStaleChange(isStale);
  }, [isStale, onStaleChange]);

  return (
    <div className="flex items-center gap-3">
      <div className={isStale ? "text-amber-400" : "text-emerald-400"}>
        <CheckCircle className="w-5 h-5" />
      </div>
      <div>
        <p className="font-semibold">
          {user.name}
          {isStale && (
            <span className="ml-2 text-xs text-amber-400">(stale)</span>
          )}
        </p>
        <p className="text-sm text-surface-400">{user.email}</p>
        {user.fetchedAt && (
          <p className="text-xs text-surface-500 mt-1">
            Fetched at: {user.fetchedAt}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading fallback for Suspense
 */
function LoadingFallback() {
  return (
    <div className="flex items-center gap-3 text-surface-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Loading user data...</span>
    </div>
  );
}

/**
 * Error fallback component
 */
function ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5" />
        <span>{error.message}</span>
      </div>
      <button onClick={resetError} className="btn-secondary text-sm">
        Try Again
      </button>
    </div>
  );
}

export function AsyncAtomDemo() {
  const [logs, setLogs] = useState<
    {
      id: number;
      message: string;
      timestamp: Date;
      type?: "info" | "success" | "error" | "warning";
    }[]
  >([]);
  const { log, clear, setSetLogs } = useLogger();

  // Create atoms once and keep them in refs
  const userAtomRef = useRef<MutableAtom<User>>();
  const userWithFallbackAtomRef = useRef<MutableAtom<User, User>>();

  // Initialize atoms on first render
  if (!userAtomRef.current) {
    userAtomRef.current = atom(fetchUser(), { key: "demo-user" });
  }
  if (!userWithFallbackAtomRef.current) {
    userWithFallbackAtomRef.current = atom(fetchUser(), {
      key: "demo-user-fallback",
      fallback: { name: "Guest", email: "guest@example.com" },
    });
  }

  const userAtom = userAtomRef.current!;
  const userWithFallbackAtom = userWithFallbackAtomRef.current!;

  // Track status for UI display (outside Suspense boundary)
  const [userStatus, setUserStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [fallbackStale, setFallbackStale] = useState(true);

  // Error boundary key to force remount on retry
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  useEffect(() => {
    setSetLogs(setLogs);
  }, [setSetLogs]);

  // Subscribe to atom changes for logging and status tracking
  const logRef = useCallback(log, [log]);
  useEffect(() => {
    // Initial status
    setUserStatus(
      userAtom.loading ? "loading" : userAtom.error ? "error" : "success"
    );
    setFallbackStale(userWithFallbackAtom.stale());

    const unsub1 = userAtom.on(() => {
      const status = userAtom.loading
        ? "loading"
        : userAtom.error
        ? "error"
        : "success";
      setUserStatus(status);
      logRef(
        `userAtom changed - loading: ${
          userAtom.loading
        }, error: ${!!userAtom.error}`,
        userAtom.error ? "error" : userAtom.loading ? "warning" : "success"
      );
    });
    const unsub2 = userWithFallbackAtom.on(() => {
      setFallbackStale(userWithFallbackAtom.stale());
      logRef(
        `userWithFallbackAtom changed - stale: ${userWithFallbackAtom.stale()}`,
        userWithFallbackAtom.stale() ? "warning" : "success"
      );
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [userAtom, userWithFallbackAtom, logRef]);

  const refetchUser = (shouldFail = false) => {
    log(`Refetching user (shouldFail: ${shouldFail})...`);
    // set() now accepts Promise - enters loading state automatically
    userAtom.set(fetchUser(shouldFail));
    // Reset error boundary to allow re-render after error
    setErrorBoundaryKey((k) => k + 1);
  };

  const refetchWithFallback = () => {
    log("Refetching user with fallback...");
    // set() now accepts Promise - enters loading state automatically
    userWithFallbackAtom.set(fetchUser());
  };

  const handleRetryFromError = () => {
    refetchUser(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">Async Atom</h2>
        <p className="text-surface-400">
          Atoms seamlessly handle Promise values with built-in loading and error
          states. Use with <code className="text-primary-400">useSelector</code>
          , <code className="text-primary-400">Suspense</code>, and{" "}
          <code className="text-primary-400">ErrorBoundary</code>.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { atom } from "atomirx";
import { useSelector } from "atomirx/react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

// Async initial value
const userAtom = atom(fetchUser());

// Component using useSelector (MUST be wrapped with Suspense + ErrorBoundary)
function UserDisplay() {
  // Suspends while loading, throws on error
  const user = useSelector(userAtom);
  return <div>{user.name}</div>;
}

// Usage with boundaries
function App() {
  return (
    <ErrorBoundary fallback={<div>Error!</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <UserDisplay />
      </Suspense>
    </ErrorBoundary>
  );
}

// With fallback - value is always available
const userAtom = atom(fetchUser(), {
  fallback: { name: "Guest" }
});
console.log(userAtom.stale()); // true during loading/error
        `}
      />

      {/* Basic Async Demo with Suspense */}
      <DemoSection
        title="Basic Async Atom (with Suspense)"
        description="useSelector suspends while loading and throws on error. Wrap with Suspense and ErrorBoundary."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={userStatus} />
            {userStatus === "loading" && (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            )}
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            {/* 
              ErrorBoundary catches errors thrown by useSelector
              Suspense catches promises thrown by useSelector during loading
            */}
            <ErrorBoundary
              key={errorBoundaryKey}
              fallback={(error, reset) => (
                <ErrorFallback
                  error={error}
                  resetError={() => {
                    reset();
                    handleRetryFromError();
                  }}
                />
              )}
            >
              <Suspense fallback={<LoadingFallback />}>
                <UserDisplay userAtom={userAtom} />
              </Suspense>
            </ErrorBoundary>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => refetchUser(false)}
              className="btn-primary flex items-center gap-2"
              disabled={userStatus === "loading"}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  userStatus === "loading" ? "animate-spin" : ""
                }`}
              />
              Refetch (Success)
            </button>
            <button
              onClick={() => refetchUser(true)}
              className="btn-secondary flex items-center gap-2"
              disabled={userStatus === "loading"}
            >
              <AlertCircle className="w-4 h-4" />
              Refetch (Error)
            </button>
          </div>

          {/* Implementation note */}
          <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <p className="text-sm text-primary-300">
              <strong>Note:</strong> The <code>UserDisplay</code> component uses{" "}
              <code>useSelector(userAtom)</code> which throws a Promise while
              loading (caught by Suspense) and throws an Error on rejection
              (caught by ErrorBoundary).
            </p>
          </div>
        </div>
      </DemoSection>

      {/* Fallback Demo */}
      <DemoSection
        title="With Fallback"
        description="Fallback value ensures value is never undefined. stale() indicates if using fallback/previous value."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={fallbackStale ? "stale" : "success"} />
            {fallbackStale && (
              <span className="text-xs text-amber-400">
                Using fallback/previous value
              </span>
            )}
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            {/* 
              With fallback, useSelector never throws - it returns the fallback value.
              We still wrap with Suspense/ErrorBoundary for safety.
            */}
            <ErrorBoundary
              fallback={(error) => (
                <ErrorFallback error={error} resetError={refetchWithFallback} />
              )}
            >
              <Suspense fallback={<LoadingFallback />}>
                <UserWithFallbackDisplay
                  userAtom={userWithFallbackAtom}
                  onStaleChange={setFallbackStale}
                />
              </Suspense>
            </ErrorBoundary>
          </div>

          <button
            onClick={refetchWithFallback}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refetch
          </button>

          {/* Implementation note */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-300">
              <strong>Note:</strong> With <code>fallback</code> option,{" "}
              <code>useSelector</code> returns the fallback value during
              loading/error instead of suspending. Use <code>atom.stale()</code>{" "}
              to check if the value is stale.
            </p>
          </div>
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
          <h4 className="font-semibold text-surface-100 mb-2">
            Suspense Ready
          </h4>
          <p className="text-sm text-surface-400">
            Works with React Suspense for declarative loading states.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Error Boundaries
          </h4>
          <p className="text-sm text-surface-400">
            Errors propagate to ErrorBoundary for clean error handling.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Race-Safe</h4>
          <p className="text-sm text-surface-400">
            Stale promise results are automatically ignored.
          </p>
        </div>
      </div>
    </div>
  );
}
