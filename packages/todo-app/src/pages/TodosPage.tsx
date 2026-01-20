/**
 * Todos page.
 *
 * @description
 * Main page for managing todos.
 * Displays todo list, input, filters, and sync status.
 */

import { useEffect, useCallback, Suspense, useState } from "react";
import { useSelector } from "atomirx/react";
import {
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  Filter,
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { authModule, todosModule, syncModule, networkModule } from "@/state";
import type { TodoFilterType } from "@/state";
import { TodoItem, TodoInput } from "@/components/todos";
import { Button, StatusBadge, SkeletonTodoList } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Todos page component.
 *
 * @example
 * ```tsx
 * function App() {
 *   const isAuthenticated = useSelector(auth.isAuthenticated$);
 *   return isAuthenticated ? <TodosPage /> : <AuthPage />;
 * }
 * ```
 */
export function TodosPage() {
  const auth = authModule();
  const todos = todosModule();
  const sync = syncModule();
  const network = networkModule();

  // Group multiple atom reads into single useSelector (reduces subscriptions)
  const { user, isOnline, todosError } = useSelector(({ read }) => ({
    user: read(auth.user$),
    isOnline: read(network.isOnline$),
    todosError: read(todos.error$),
  }));

  // Load todos and sync meta on mount
  useEffect(() => {
    console.log("[TodosPage] Loading todos...");
    todos
      .loadTodos()
      .then(() => {
        console.log("[TodosPage] Todos loaded");
      })
      .catch((err) => {
        console.error("[TodosPage] Failed to load todos:", err);
      });
    void sync.loadSyncMeta();
  }, [todos, sync]);

  // Handle decryption errors by prompting re-authentication
  const isDecryptionError =
    todosError?.message?.includes("Decryption failed") ||
    todosError?.message?.includes("invalid key");

  // Log any errors from todos module
  useEffect(() => {
    if (todosError) {
      console.error("[TodosPage] Todos error:", todosError);
    }
  }, [todosError]);

  /**
   * Handle logout.
   */
  const handleLogout = useCallback(() => {
    auth.logout();
    todos.reset();
    sync.reset();
  }, [auth, todos, sync]);

  /**
   * Handle manual sync.
   */
  const handleSync = useCallback(async () => {
    await sync.sync();
    // Reload todos after sync to get updated data
    await todos.loadTodos();
  }, [sync, todos]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Top row: Logo, title, and logout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-gray-900 text-sm sm:text-base">
                  Secure Todo
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {user?.username}
                </p>
              </div>
            </div>

            {/* Logout button - always visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>

          {/* Bottom row: Network status and sync */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {/* Network status */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium",
                isOnline
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {isOnline ? "Online" : "Offline"}
            </div>

            {/* Sync button */}
            <SyncButton onSync={handleSync} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Decryption error - prompt re-authentication */}
        {isDecryptionError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-amber-900">
                  Session key mismatch
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your saved session doesn&apos;t match your stored data. Please
                  sign out and sign in again with your passkey to restore access
                  to your todos.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLogout}
                  className="mt-3"
                >
                  Sign out and re-authenticate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Todo input */}
        <div className="mb-6">
          <AddTodoInput />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <FilterBar />
        </div>

        {/* Todo list */}
        <Suspense fallback={<SkeletonTodoList count={5} />}>
          <TodoList />
        </Suspense>

        {/* Footer stats */}
        <TodoStats />
      </main>
    </div>
  );
}

/**
 * Sync button component.
 */
function SyncButton({ onSync }: { onSync: () => Promise<void> }) {
  const sync = syncModule();
  // Group multiple atom reads into single useSelector
  const { syncStatus, isSyncing } = useSelector(({ read }) => ({
    syncStatus: read(sync.syncStatus$),
    isSyncing: read(sync.isSyncing$),
  }));

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSync}
      disabled={isSyncing || syncStatus === "offline"}
      leftIcon={
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
      }
    >
      {isSyncing ? "Syncing..." : "Sync"}
    </Button>
  );
}

/**
 * Add todo input wrapper.
 */
function AddTodoInput() {
  const todos = todosModule();

  const handleAddTodo = useCallback(
    async (content: string) => {
      await todos.addTodo(content);
    },
    [todos]
  );

  return (
    <TodoInput
      onSubmit={handleAddTodo}
      placeholder="What needs to be done?"
      autoFocus
    />
  );
}

/**
 * Filter bar component.
 */
function FilterBar() {
  const todos = todosModule();
  const filter = useSelector(todos.filter$);

  const filters: {
    value: TodoFilterType;
    label: string;
    icon: typeof Filter;
  }[] = [
    { value: "all", label: "All", icon: Filter },
    { value: "active", label: "Active", icon: Circle },
    { value: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {filters.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => todos.setFilter(value)}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
            filter === value
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Todo list component.
 */
function TodoList() {
  const todos = todosModule();
  // Group multiple atom reads into single useSelector
  const { filteredTodos, isLoading, filter } = useSelector(({ read }) => ({
    filteredTodos: read(todos.filteredTodos$),
    isLoading: read(todos.isLoading$),
    filter: read(todos.filter$),
  }));

  const handleToggle = useCallback(
    async (id: string) => {
      await todos.toggleTodo(id);
    },
    [todos]
  );

  const handleUpdate = useCallback(
    async (id: string, content: string) => {
      await todos.updateTodoContent(id, content);
    },
    [todos]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await todos.deleteTodo(id);
    },
    [todos]
  );

  if (isLoading) {
    return <SkeletonTodoList count={5} />;
  }

  if (filteredTodos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {filter === "completed" ? (
            <CheckCircle2 className="h-8 w-8 text-gray-400" />
          ) : filter === "active" ? (
            <Circle className="h-8 w-8 text-gray-400" />
          ) : (
            <ListTodo className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {filter === "completed"
            ? "No completed todos"
            : filter === "active"
              ? "No active todos"
              : "No todos yet"}
        </h3>
        <p className="text-gray-500">
          {filter === "all"
            ? "Add your first todo above"
            : `No ${filter} todos to show`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {filteredTodos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

/**
 * Todo stats footer.
 */
function TodoStats() {
  const todos = todosModule();
  const sync = syncModule();

  // Group multiple atom reads into single useSelector
  const { activeCount, completedCount, pendingCount, hasTodos } = useSelector(
    ({ read }) => ({
      activeCount: read(todos.activeTodoCount$),
      completedCount: read(todos.completedTodoCount$),
      pendingCount: read(sync.pendingCount$),
      hasTodos: read(todos.hasTodos$),
    })
  );

  if (!hasTodos) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-4">
        <span>
          {activeCount} {activeCount === 1 ? "item" : "items"} left
        </span>
        {completedCount > 0 && (
          <ClearCompletedButton completedCount={completedCount} />
        )}
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <StatusBadge status="pending" />
          <span>{pendingCount} pending</span>
        </div>
      )}
    </div>
  );
}

/**
 * Clear completed button.
 */
function ClearCompletedButton({ completedCount }: { completedCount: number }) {
  const todos = todosModule();
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = useCallback(async () => {
    setIsClearing(true);
    try {
      await todos.clearCompleted();
    } finally {
      setIsClearing(false);
    }
  }, [todos]);

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className="text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline disabled:opacity-50"
    >
      {isClearing ? (
        <span className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Clearing...
        </span>
      ) : (
        `Clear completed (${completedCount})`
      )}
    </button>
  );
}
