/**
 * TodosScreen presentation component.
 *
 * @description
 * Pure presentation component for TodosScreen.
 * Use this in Storybook to test all visual states.
 */

import { Suspense } from "react";
import { TodoInput } from "../../comps/todoInput";
import { FilterBar } from "../../comps/filterBar";
import { TodoList } from "../../comps/todoList";
import { TodoStats } from "../../comps/todoStats";
import { TodosHeader } from "../../comps/todosHeader";
import { DecryptionError } from "../../comps/decryptionError";
import { SkeletonTodoList } from "../../comps/skeletonTodoItem";

/**
 * TodosScreen pure component props.
 */
export interface TodosScreenPureProps {
  /** Whether the error is a decryption error */
  isDecryptionError: boolean;
  /** Handle logout */
  onLogout: () => void;
  /** Handle sync */
  onSync: () => Promise<void>;
  /** Handle adding a todo */
  onAddTodo: (content: string) => Promise<void>;
}

/**
 * TodosScreen pure presentation component.
 *
 * @example
 * ```tsx
 * <TodosScreenPure
 *   isDecryptionError={false}
 *   onLogout={() => {}}
 *   onSync={async () => {}}
 *   onAddTodo={async () => {}}
 * />
 * ```
 */
export function TodosScreenPure({
  isDecryptionError,
  onLogout,
  onSync,
  onAddTodo,
}: TodosScreenPureProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TodosHeader onLogout={onLogout} onSync={onSync} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isDecryptionError && <DecryptionError onLogout={onLogout} />}

        <div className="mb-6">
          <TodoInput
            onSubmit={onAddTodo}
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <FilterBar />
        </div>

        <Suspense fallback={<SkeletonTodoList count={5} />}>
          <TodoList />
        </Suspense>

        <TodoStats />
      </main>
    </div>
  );
}
