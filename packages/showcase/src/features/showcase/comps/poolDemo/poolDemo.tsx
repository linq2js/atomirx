/**
 * @module PoolDemo
 * @description Demonstrates pool usage - parameterized atom collections with automatic GC.
 */

import { useEffect, useState, useRef } from "react";
import { pool } from "atomirx";
import { DemoSection, CodeBlock } from "../../../../ui";
import { eventLogStore } from "../../stores/eventLogStore";
import { Plus, Trash2, Timer, Database, RefreshCw } from "lucide-react";

// ============================================================================
// Pool Definitions
// ============================================================================

/**
 * Basic user pool - demonstrates parameterized atoms.
 * Each user ID gets its own atom with user data.
 */
const userPool = pool(
  (params: { id: string }) => ({
    name: `User ${params.id}`,
    score: 0,
  }),
  {
    gcTime: 10_000, // 10 seconds for demo
    meta: { key: "userPool" },
  }
);

/**
 * Short-lived pool for GC demo - entries removed after 3 seconds.
 */
const gcDemoPool = pool(
  (params: { id: string }) => ({
    createdAt: Date.now(),
    value: `Entry ${params.id}`,
  }),
  {
    gcTime: 3_000, // 3 seconds - short for demo
    meta: { key: "gcDemoPool" },
  }
);

// ============================================================================
// Components
// ============================================================================

/**
 * Demo component showing pool operations.
 */
export function PoolDemo() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">Pool</h2>
        <p className="text-surface-400">
          Pools are parameterized atom collections with automatic garbage
          collection. Perfect for entity caches, user data, and dynamic state.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { pool } from "atomirx";

// Create a pool with params and gcTime
const userPool = pool(
  (params: { id: string }) => ({ name: "", score: 0 }),
  { gcTime: 60_000 } // Auto-remove after 60s of inactivity
);

// Get/set values
userPool.set({ id: "1" }, { name: "John", score: 100 });
const user = userPool.get({ id: "1" });

// In reactive context (derived, effect, useSelector)
derived(({ read, from }) => {
  const user$ = from(userPool, { id: "1" });
  return read(user$); // Automatically tracks dependency
});

// Subscribe to ALL changes in the pool
userPool.onChange((params, value) => {
  console.log(\`User \${params.id} changed:\`, value);
});

// Subscribe to ALL removals (GC or manual)
userPool.onRemove((params, value) => {
  console.log(\`User \${params.id} was removed\`);
});
        `}
      />

      {/* Basic Pool Demo */}
      <BasicPoolDemo />

      {/* GC Time Demo */}
      <GCTimeDemo />

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Auto GC</h4>
          <p className="text-sm text-surface-400">
            Entries are automatically removed after gcTime of inactivity.
            Prevents memory leaks.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Promise-Aware</h4>
          <p className="text-sm text-surface-400">
            GC is paused while entry value is a pending Promise. No premature
            cleanup.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">VirtualAtom</h4>
          <p className="text-sm text-surface-400">
            Use from() in reactive contexts. Auto-disposes to prevent stale
            refs.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Basic pool operations demo.
 */
function BasicPoolDemo() {
  const { log } = eventLogStore();
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; score: number }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refresh user list from pool
  const refreshUsers = () => {
    const list: Array<{ id: string; name: string; score: number }> = [];
    userPool.forEach((value, params) => {
      list.push({ id: params.id, ...value });
    });
    setUsers(list);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const addUser = () => {
    const id = inputRef.current?.value || `user-${Date.now()}`;
    log(`Creating user with ID: ${id}`);

    // Access the pool entry (creates if not exists)
    userPool.get({ id });

    refreshUsers();
    if (inputRef.current) inputRef.current.value = "";
  };

  // Subscribe to pool-wide changes and removals
  useEffect(() => {
    const unsubChange = userPool.onChange((params, value) => {
      log(`User ${params.id} updated: score=${value.score}`, "success");
      refreshUsers();
    });
    const unsubRemove = userPool.onRemove((params) => {
      log(`User ${params.id} removed from pool`, "warning");
      refreshUsers();
    });
    return () => {
      unsubChange();
      unsubRemove();
    };
  }, [log]);

  const incrementScore = (id: string) => {
    const current = userPool.get({ id });
    log(`Incrementing score for ${id}`);
    userPool.set({ id }, { ...current, score: current.score + 10 });
  };

  const removeUser = (id: string) => {
    log(`Removing user ${id}`);
    userPool.remove({ id });
    refreshUsers();
  };

  return (
    <DemoSection
      title="Basic Pool Operations"
      description="Create, read, update, and delete parameterized entries. gcTime: 10s (entries auto-removed after 10s of inactivity)"
    >
      <div className="space-y-4">
        {/* Add User */}
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter user ID"
            className="input flex-1"
          />
          <button
            onClick={addUser}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* User List */}
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="p-4 bg-surface-800/50 rounded-lg text-center text-surface-400">
              No users in pool. Add one above!
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-surface-100">{user.name}</p>
                  <p className="text-sm text-surface-400">ID: {user.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gradient">
                      {user.score}
                    </p>
                    <p className="text-xs text-surface-400">Score</p>
                  </div>
                  <button
                    onClick={() => incrementScore(user.id)}
                    className="btn-secondary p-2"
                    title="Add 10 points"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="btn-secondary p-2 text-red-400 hover:text-red-300"
                    title="Remove user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={refreshUsers}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh List
        </button>
      </div>
    </DemoSection>
  );
}

/**
 * GC Time demo - shows entries being automatically removed.
 */
function GCTimeDemo() {
  const { log } = eventLogStore();
  const [entries, setEntries] = useState<
    Array<{ id: string; createdAt: number; timeLeft: number }>
  >([]);
  const [counter, setCounter] = useState(1);

  // Refresh entries and calculate time left
  const refreshEntries = () => {
    const now = Date.now();
    const list: Array<{ id: string; createdAt: number; timeLeft: number }> = [];
    gcDemoPool.forEach((value, params) => {
      const age = now - value.createdAt;
      const timeLeft = Math.max(0, 3000 - age);
      list.push({ id: params.id, createdAt: value.createdAt, timeLeft });
    });
    setEntries(list);
  };

  // Update countdown every 100ms
  useEffect(() => {
    const interval = setInterval(refreshEntries, 100);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to pool-wide removals
  useEffect(() => {
    const unsub = gcDemoPool.onRemove((params) => {
      log(`Entry ${params.id} was garbage collected after 3s`, "warning");
    });
    return unsub;
  }, [log]);

  const addEntry = () => {
    const id = `entry-${counter}`;
    setCounter((c) => c + 1);
    log(`Creating GC demo entry: ${id} (will be removed in 3s)`);

    // Access to create entry
    gcDemoPool.get({ id });

    refreshEntries();
  };

  const accessEntry = (id: string) => {
    log(`Accessing entry ${id} - GC timer resets!`);
    // Re-set the value to reset GC timer and update createdAt
    gcDemoPool.set(
      { id },
      {
        createdAt: Date.now(),
        value: `Entry ${id} (accessed)`,
      }
    );
  };

  return (
    <DemoSection
      title="Automatic Garbage Collection"
      description="gcTime: 3s - Entries auto-removed 3 seconds after last access. Accessing an entry resets its GC timer."
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Timer className="w-5 h-5" />
            <span className="font-semibold">GC Time: 3 seconds</span>
          </div>
          <p className="text-sm text-surface-400">
            Each entry will be automatically removed 3 seconds after creation or
            last access. Watch the countdown!
          </p>
        </div>

        <button
          onClick={addEntry}
          className="btn-primary flex items-center gap-2"
        >
          <Database className="w-4 h-4" />
          Create Entry (auto-GC in 3s)
        </button>

        {/* Entry List with Countdown */}
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="p-4 bg-surface-800/50 rounded-lg text-center text-surface-400">
              No entries. Create one to see GC in action!
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      entry.timeLeft > 1500
                        ? "bg-green-500"
                        : entry.timeLeft > 500
                          ? "bg-yellow-500"
                          : "bg-red-500 animate-pulse"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-surface-100">{entry.id}</p>
                    <p className="text-xs text-surface-400">
                      Created {new Date(entry.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`text-lg font-mono font-bold ${
                        entry.timeLeft > 1500
                          ? "text-green-400"
                          : entry.timeLeft > 500
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {(entry.timeLeft / 1000).toFixed(1)}s
                    </p>
                    <p className="text-xs text-surface-400">until GC</p>
                  </div>
                  <button
                    onClick={() => accessEntry(entry.id)}
                    className="btn-secondary p-2"
                    title="Access entry (resets GC timer)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DemoSection>
  );
}
