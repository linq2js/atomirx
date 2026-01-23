/**
 * @module TodoListDemo
 * @description Demonstrates local/remote state reconciliation with atomirx.
 * Shows define() for module scope, derived() for transforms, and useSelector with Suspense.
 */

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { atom, derived, define, DerivedAtom, onCreateHook } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection, CodeBlock, StatusBadge } from "../../../../ui";
import { eventLogStore } from "../../stores/eventLogStore";
import { ErrorBoundary } from "../../../../shared/utils";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Circle,
  ListFilter,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

declare module "atomirx" {
  interface MutableAtomMeta {
    /** Whether the atom is persisted to local storage */
    persisted?: boolean;
  }
}

onCreateHook.override((prev) => (info) => {
  prev?.(info);
  if (info.type === "mutable" && info.meta?.persisted && info.meta?.key) {
    const key = `todo-app-demo-${info.meta.key}`;
    if (!info.instance.dirty()) {
      const value = localStorage.getItem(key);
      if (value) {
        info.instance.set(JSON.parse(value));
      }
    }
    info.instance.on(() => {
      localStorage.setItem(key, JSON.stringify(info.instance.get()));
    });
  }
});

type FilterType = "all" | "active" | "completed";

// =============================================================================
// API
// =============================================================================

const fetchTodos = (): Promise<Todo[]> =>
  fetch(
    "https://jsonplaceholder.typicode.com/todos?_limit=10&_delay=2000"
  ).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch todos");
    return res.json();
  });

// =============================================================================
// Module Definition (atoms in stable scope)
// =============================================================================

const TodoListModule = define(
  () => {
  // atom() - stores the Promise of todos from server (lazy init)
  const remoteTodoList$ = atom(() => fetchTodos(), {
    meta: { key: "remoteTodos" },
  });

  // atom() - stores local changes (optimistic updates, edits, etc.)
  const localTodoList$ = atom<Record<string, Partial<Todo>>>(
    {},
    { meta: { key: "localTodos", persisted: true } }
  );

  // atom() - stores the current filter
  const filter$ = atom<FilterType>("all", { meta: { key: "filter" } });

  // derived() - reconciles remote and local changes
  // Local changes override remote data
  const todoList$ = derived(({ read }) => {
    const remoteTodos = read(remoteTodoList$); // Promise auto-unwrapped
    const localChanges = read(localTodoList$);

    return remoteTodos.map((todo) => {
      const localChange = localChanges[todo.id];
      if (localChange) {
        return { ...todo, ...localChange };
      }
      return todo;
    });
  });

  // derived() - filters reconciled todos based on filter$
  const filteredTodos$ = derived(({ read }) => {
    const filter = read(filter$);
    const todos = read(todoList$);

    switch (filter) {
      case "active":
        return todos.filter((t) => !t.completed);
      case "completed":
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  });

  return {
    remoteTodoList$,
    localTodoList$,
    todoList$,
    filter$,
    filteredTodos$,
    setFilter: (filter: FilterType) => filter$.set(filter),
    // Update local state (optimistic update)
    updateTodo: (id: number, changes: Partial<Todo>) =>
      localTodoList$.set((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...changes },
      })),
    // Clear local changes for a todo
    clearLocalChange: (id: number) =>
      localTodoList$.set((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      }),
    // Clear all local changes
    clearAllLocalChanges: () => localTodoList$.set({}),
    refetch: () => remoteTodoList$.set(fetchTodos()),
    reset: () => {
      remoteTodoList$.reset();
      localTodoList$.set({});
    },
  };
  },
  { key: "TodoListModule" }
);

// =============================================================================
// Components
// =============================================================================

function TodoItem({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(todo.id, !todo.completed)}
      className="w-full flex items-center gap-3 p-3 bg-surface-800/30 rounded-lg hover:bg-surface-800/50 transition-colors text-left"
    >
      {todo.completed ? (
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-surface-500 shrink-0" />
      )}
      <span
        className={`text-sm ${todo.completed ? "text-surface-500 line-through" : "text-surface-200"}`}
      >
        {todo.title}
      </span>
    </button>
  );
}

/**
 * Todo list component - uses useSelector with derived atom.
 *
 * @description
 * Subscribes to filteredTodos$ derived atom via useSelector.
 * Suspends while loading, throws on error. MUST be wrapped with
 * Suspense and ErrorBoundary.
 *
 * @param filteredTodos$ - Derived atom providing filtered todos
 * @param onSuccess - Callback when data loads successfully
 * @param onToggle - Callback when a todo is toggled
 */
function TodoList({
  filteredTodos$,
  onSuccess,
  onToggle,
}: {
  filteredTodos$: DerivedAtom<Todo[], boolean>;
  onSuccess: () => void;
  onToggle: (id: number, completed: boolean) => void;
}) {
  // useSelector with derived atom - suspends until Promise resolves
  const todos = useSelector(filteredTodos$);

  // Report success only once when component first mounts (data loaded)
  const hasReportedSuccess = useRef(false);
  useEffect(() => {
    if (!hasReportedSuccess.current) {
      hasReportedSuccess.current = true;
      onSuccess();
    }
  }, [onSuccess]);

  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-surface-500">
        <ListFilter className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No todos match this filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} />
      ))}
    </div>
  );
}

function LoadingFallback({ onLoading }: { onLoading: () => void }) {
  useEffect(() => {
    onLoading();
  }, [onLoading]);

  return (
    <div className="flex items-center justify-center gap-3 py-8 text-surface-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Loading todos...</span>
    </div>
  );
}

function ErrorFallback({
  error,
  resetError,
  onError,
}: {
  error: Error;
  resetError: () => void;
  onError: () => void;
}) {
  useEffect(() => {
    onError();
  }, [onError]);

  return (
    <div className="space-y-3 py-8 text-center">
      <div className="flex items-center justify-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5" />
        <span>{error.message}</span>
      </div>
      <button onClick={resetError} className="btn-secondary text-sm">
        Try Again
      </button>
    </div>
  );
}

function FilterButton({
  filter,
  activeFilter,
  onClick,
}: {
  filter: FilterType;
  activeFilter: FilterType;
  onClick: () => void;
}) {
  const isActive = filter === activeFilter;
  const labels: Record<FilterType, string> = {
    all: "All",
    active: "Active",
    completed: "Completed",
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
        ${
          isActive
            ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
            : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
        }
      `}
    >
      {labels[filter]}
    </button>
  );
}

// =============================================================================
// Demo Module with render()
// =============================================================================

export const TodoListDemoModule = define(
  () => {
    const render = () => <TodoListDemoContent />;

    return { render };
  },
  { key: "TodoListDemoModule" }
);

function TodoListDemoContent() {
  const { log } = eventLogStore();

  // Get module instance (lazy singleton)
  const {
    filteredTodos$,
    filter$,
    setFilter,
    updateTodo,
    clearAllLocalChanges,
    refetch,
    reset,
  } = TodoListModule();

  // Local UI state
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Sync local filter state with atom
  useEffect(() => {
    const unsub = filter$.on(() => {
      setActiveFilter(filter$.get());
    });
    return unsub;
  }, [filter$]);

  // Callbacks for status tracking
  const handleLoading = useCallback(() => {
    setStatus("loading");
    log("Loading todos...", "warning");
  }, [log]);

  const handleSuccess = useCallback(() => {
    setStatus("success");
    log("Todos loaded successfully", "success");
  }, [log]);

  const handleError = useCallback(() => {
    setStatus("error");
    log("Failed to load todos", "error");
  }, [log]);

  const handleToggle = useCallback(
    (id: number, completed: boolean) => {
      updateTodo(id, { completed });
      log(
        `Todo ${id} toggled to ${completed ? "completed" : "active"}`,
        "info"
      );
    },
    [updateTodo, log]
  );

  // Actions (not callbacks - direct functions)
  const changeFilter = (filter: FilterType) => {
    setActiveFilter(filter);
    setFilter(filter);
    log(`Filter changed to: ${filter}`, "info");
  };

  const handleRefetch = () => {
    log("Refetching todos...");
    refetch();
    setErrorBoundaryKey((k) => k + 1);
  };

  const handleReset = () => {
    log("Resetting todos (clears local changes, re-fetches)...");
    reset();
    setErrorBoundaryKey((k) => k + 1);
  };

  const handleClearLocal = () => {
    log("Clearing local changes...");
    clearAllLocalChanges();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">
          Todo List Demo
        </h2>
        <p className="text-surface-400">
          Demonstrates local/remote state reconciliation. Click todos to toggle
          them locally (optimistic updates). Use{" "}
          <code className="text-primary-400">define()</code> to organize atoms
          in stable scope.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`import { atom, derived, define } from "atomirx";
import { useSelector } from "atomirx/react";

const TodoModule = define(() => {
  // Remote data from server
  const remoteTodoList$ = atom(() => fetchTodos());
  
  // Local changes (optimistic updates)
  const localTodoList$ = atom<Record<string, Partial<Todo>>>({});
  
  // Reconcile: local changes override remote
  const todoList$ = derived(({ read }) => {
    const remote = read(remoteTodoList$); // Promise auto-unwrapped
    const local = read(localTodoList$);
    
    return remote.map(todo => ({
      ...todo,
      ...local[todo.id], // Local overrides remote
    }));
  });

  const filter$ = atom<"all" | "active" | "completed">("all");
  
  const filteredTodos$ = derived(({ read }) => {
    const todos = read(todoList$);
    const filter = read(filter$);
    return filter === "all" ? todos : todos.filter(/* ... */);
  });

  return {
    filteredTodos$,
    updateTodo: (id, changes) => localTodoList$.set(prev => ({
      ...prev, [id]: { ...prev[id], ...changes }
    })),
    clearLocal: () => localTodoList$.set({}),
    refetch: () => remoteTodoList$.set(fetchTodos()),
  };
});`}
      />

      {/* Interactive Demo */}
      <DemoSection
        title="Interactive Todo List"
        description="Data from JSONPlaceholder. Filter, refetch, or reset to see atom reactivity in action."
      >
        <div className="space-y-4">
          {/* Status and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              {status === "loading" && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClearLocal}
                className="btn-secondary flex items-center gap-2 text-sm"
                disabled={status === "loading"}
              >
                Clear Local
              </button>
              <button
                onClick={handleRefetch}
                className="btn-secondary flex items-center gap-2 text-sm"
                disabled={status === "loading"}
              >
                <RefreshCw
                  className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`}
                />
                Refetch
              </button>
              <button
                onClick={handleReset}
                className="btn-primary flex items-center gap-2 text-sm"
                disabled={status === "loading"}
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 p-1 bg-surface-800/30 rounded-lg w-fit">
            <FilterButton
              filter="all"
              activeFilter={activeFilter}
              onClick={() => changeFilter("all")}
            />
            <FilterButton
              filter="active"
              activeFilter={activeFilter}
              onClick={() => changeFilter("active")}
            />
            <FilterButton
              filter="completed"
              activeFilter={activeFilter}
              onClick={() => changeFilter("completed")}
            />
          </div>

          {/* Todo List with Suspense/ErrorBoundary */}
          <div className="border border-surface-800/50 rounded-lg p-4 min-h-[200px]">
            <ErrorBoundary
              key={errorBoundaryKey}
              fallback={(error, resetFn) => (
                <ErrorFallback
                  error={error}
                  onError={handleError}
                  resetError={() => {
                    resetFn();
                    handleRefetch();
                  }}
                />
              )}
            >
              <Suspense
                fallback={<LoadingFallback onLoading={handleLoading} />}
              >
                <TodoList
                  filteredTodos$={filteredTodos$}
                  onSuccess={handleSuccess}
                  onToggle={handleToggle}
                />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Pattern explanation */}
          <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <p className="text-sm text-primary-300">
              <strong>Pattern:</strong> Use <code>define()</code> to organize
              atoms in stable scope. <code>atom()</code> stores the Promise.{" "}
              <code>derived()</code> unwraps it via <code>read()</code>.{" "}
              <code>useSelector()</code> suspends until ready.
            </p>
          </div>
        </div>
      </DemoSection>

      {/* Key Concepts */}
      <DemoSection title="Key Concepts" description="">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h4 className="font-semibold text-surface-100 mb-2">
              define() - Stable Scope
            </h4>
            <p className="text-sm text-surface-400 mb-2">
              Organizes atoms in module scope. Lazy singleton with override and
              invalidate support.
            </p>
            <CodeBlock
              code={`const Module = define(() => {
  const count$ = atom(0);
  return { count$, inc: () => count$.set(c => c + 1) };
});

// In tests
Module.override(() => ({ count$: mockAtom }));
Module.invalidate(); // Reset for next test`}
            />
          </div>

          <div className="card">
            <h4 className="font-semibold text-surface-100 mb-2">
              derived() - Transform Reactively
            </h4>
            <p className="text-sm text-surface-400 mb-2">
              Computes values from other atoms. Automatically unwraps Promises.
            </p>
            <CodeBlock
              code={`const filtered$ = derived(({ read }) => {
  const filter = read(filter$);
  const todos = read(todos$); // Unwrapped!
  return todos.filter(/* ... */);
});`}
            />
          </div>

          <div className="card">
            <h4 className="font-semibold text-surface-100 mb-2">
              useSelector() - Subscribe in React
            </h4>
            <p className="text-sm text-surface-400 mb-2">
              Subscribes to atom changes. With derived atoms, suspends until
              Promise resolves.
            </p>
            <CodeBlock
              code={`function TodoList() {
  const { filteredTodos$ } = TodoModule();
  const todos = useSelector(filteredTodos$);
  // Component suspends while loading
  return <ul>{todos.map(...)}</ul>;
}`}
            />
          </div>

          <div className="card">
            <h4 className="font-semibold text-surface-100 mb-2">
              Suspense + ErrorBoundary
            </h4>
            <p className="text-sm text-surface-400 mb-2">
              Declarative loading and error states. No manual status tracking
              needed.
            </p>
            <CodeBlock
              code={`<ErrorBoundary fallback={<Error />}>
  <Suspense fallback={<Loading />}>
    <TodoList />
  </Suspense>
</ErrorBoundary>`}
            />
          </div>
        </div>
      </DemoSection>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Stable Scope</h4>
          <p className="text-sm text-surface-400">
            <code>define()</code> keeps atoms in module scope. No memory leaks,
            no forgotten disposal.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">
            Reactive Filtering
          </h4>
          <p className="text-sm text-surface-400">
            Changing <code>filter$</code> instantly recomputes{" "}
            <code>filteredTodos$</code>. No manual cache invalidation.
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-surface-100 mb-2">Testable</h4>
          <p className="text-sm text-surface-400">
            Use <code>Module.override()</code> to inject mocks.{" "}
            <code>Module.invalidate()</code> resets between tests.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Legacy export for backward compatibility.
 *
 * @deprecated Use TodoListDemoModule().render() instead
 *
 * @example
 * ```tsx
 * // Preferred
 * const { render } = TodoListDemoModule();
 * return render();
 *
 * // Legacy (deprecated)
 * return <TodoListDemo />;
 * ```
 */
export const TodoListDemo = () => TodoListDemoModule().render();
