/**
 * TodoItem presentation component.
 *
 * @description
 * Pure presentation component for TodoItem.
 * Use this in Storybook to test all visual states.
 *
 * @businessRules
 * - Completed todos show strikethrough text style
 * - Double-click on content enables inline editing
 * - Sync status badge displays for non-synced items (pending/conflict)
 * - Actions (edit/delete) visible on hover only
 * - Loading state disables all interactions
 */

import { Check, Circle, Trash2, Edit2, X, Loader2 } from "lucide-react";
import type { Todo } from "../../types/storage.types";
import { StatusBadge } from "../statusBadge";
import { cn } from "@/shared/utils";

/**
 * TodoItem pure component props.
 */
export interface TodoItemPureProps {
  /** Todo data */
  todo: Todo;
  /** Whether item is in edit mode */
  isEditing: boolean;
  /** Current edit content */
  editContent: string;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Ref for edit input element */
  inputRef: React.RefObject<HTMLInputElement>;
  /** Set edit content */
  setEditContent: (content: string) => void;
  /** Handle toggle click */
  handleToggle: () => Promise<void>;
  /** Handle delete click */
  handleDelete: () => Promise<void>;
  /** Start editing */
  startEditing: () => void;
  /** Cancel editing */
  cancelEditing: () => void;
  /** Save edited content */
  saveEdit: () => Promise<void>;
  /** Handle key down in edit mode */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * TodoItem pure presentation component.
 *
 * @example
 * ```tsx
 * <TodoItemPure
 *   todo={todo}
 *   isEditing={false}
 *   editContent=""
 *   isLoading={false}
 *   inputRef={ref}
 *   setEditContent={() => {}}
 *   handleToggle={async () => {}}
 *   handleDelete={async () => {}}
 *   startEditing={() => {}}
 *   cancelEditing={() => {}}
 *   saveEdit={async () => {}}
 *   handleKeyDown={() => {}}
 * />
 * ```
 */
export function TodoItemPure({
  todo,
  isEditing,
  editContent,
  isLoading,
  inputRef,
  setEditContent,
  handleToggle,
  handleDelete,
  startEditing,
  cancelEditing,
  saveEdit,
  handleKeyDown,
}: TodoItemPureProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg transition-colors",
        "hover:bg-gray-50",
        todo.completed && "bg-gray-50/50",
        isLoading && "opacity-50 pointer-events-none"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={isLoading || isEditing}
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          todo.completed
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-gray-400"
        )}
        aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : todo.completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4 text-transparent" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className={cn(
              "w-full px-2 py-1 -ml-2 rounded border border-blue-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500"
            )}
            disabled={isLoading}
          />
        ) : (
          <span
            className={cn(
              "block text-gray-900",
              todo.completed && "text-gray-400 line-through"
            )}
            onDoubleClick={startEditing}
          >
            {todo.content}
          </span>
        )}
      </div>

      {/* Sync status badge */}
      {todo.syncStatus !== "synced" && (
        <StatusBadge
          status={todo.syncStatus === "pending" ? "pending" : "error"}
          className="shrink-0"
        />
      )}

      {/* Actions */}
      <div
        className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isEditing && "opacity-100"
        )}
      >
        {isEditing ? (
          <>
            <button
              onClick={saveEdit}
              disabled={isLoading}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
              aria-label="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={cancelEditing}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startEditing}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              aria-label="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
