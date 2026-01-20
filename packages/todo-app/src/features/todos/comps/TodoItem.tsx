/**
 * Todo item component.
 *
 * @description
 * Displays a single todo item with checkbox, content, and actions.
 * Supports inline editing and sync status display.
 *
 * @businessRules
 * - Completed todos show strikethrough text style
 * - Double-click on content enables inline editing
 * - Sync status badge displays for non-synced items (pending/conflict)
 * - Actions (edit/delete) visible on hover only
 * - Loading state disables all interactions
 * - Empty content after trim is not allowed during edit
 * - Enter saves edit, Escape cancels edit
 *
 * @edgeCases
 * - Content changes during edit: local state updates to match new content
 * - Blur during edit: auto-saves if content changed
 * - Empty input on save: cancels edit, keeps original content
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Circle, Trash2, Edit2, X, Loader2 } from "lucide-react";
import type { Todo } from "../types";
import { StatusBadge } from "@/features/ui";
import { cn } from "@/shared/utils";

/**
 * Todo item props.
 */
export interface TodoItemProps {
  /** Todo data */
  todo: Todo;
  /** Toggle completion callback */
  onToggle: (id: string) => Promise<void>;
  /** Update content callback */
  onUpdate: (id: string, content: string) => Promise<void>;
  /** Delete callback */
  onDelete: (id: string) => Promise<void>;
}

/**
 * Todo item component.
 *
 * @example
 * ```tsx
 * <TodoItem
 *   todo={todo}
 *   onToggle={handleToggle}
 *   onUpdate={handleUpdate}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function TodoItem({
  todo,
  onToggle,
  onUpdate,
  onDelete,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(todo.content);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update local state when todo changes
  useEffect(() => {
    setEditContent(todo.content);
  }, [todo.content]);

  /**
   * Handle toggle click.
   */
  const handleToggle = useCallback(async () => {
    setIsLoading(true);
    try {
      await onToggle(todo.id);
    } finally {
      setIsLoading(false);
    }
  }, [onToggle, todo.id]);

  /**
   * Handle delete click.
   */
  const handleDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      await onDelete(todo.id);
    } finally {
      setIsLoading(false);
    }
  }, [onDelete, todo.id]);

  /**
   * Start editing.
   */
  const startEditing = useCallback(() => {
    setIsEditing(true);
    setEditContent(todo.content);
  }, [todo.content]);

  /**
   * Cancel editing.
   */
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditContent(todo.content);
  }, [todo.content]);

  /**
   * Save edited content.
   */
  const saveEdit = useCallback(async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === todo.content) {
      cancelEditing();
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(todo.id, trimmed);
      setIsEditing(false);
    } catch {
      // Keep editing on error
    } finally {
      setIsLoading(false);
    }
  }, [editContent, todo.content, todo.id, onUpdate, cancelEditing]);

  /**
   * Handle key press in edit mode.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      } else if (e.key === "Escape") {
        cancelEditing();
      }
    },
    [saveEdit, cancelEditing]
  );

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
