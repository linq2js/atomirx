/**
 * Todo item logic hook.
 *
 * @description
 * Manages state and handlers for a single todo item.
 * Handles editing, toggling completion, and deletion.
 *
 * @businessRules
 * - Double-click or edit button enters edit mode
 * - Enter saves, Escape cancels edit
 * - Empty content after trim cancels edit (reverts to original)
 * - Loading state shown during async operations
 *
 * @stateFlow
 * view → (double-click) → editing → (Enter/blur) → view
 * editing → (Escape/empty) → view (content reverted)
 */

import { useState, useRef, useEffect } from "react";
import { useStable } from "atomirx/react";
import type { Todo } from "../types/storage.types";

/**
 * Todo item logic hook return type.
 */
export interface UseTodoItemLogicReturn {
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
 * Todo item logic hook props.
 */
export interface UseTodoItemLogicProps {
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
 * Todo item logic hook.
 *
 * @param props - Todo item props
 * @returns Todo item state and handlers
 *
 * @example
 * ```tsx
 * const logic = useTodoItemLogic({ todo, onToggle, onUpdate, onDelete });
 * return <TodoItemUI todo={todo} {...logic} />;
 * ```
 */
export function useTodoItemLogic({
  todo,
  onToggle,
  onUpdate,
  onDelete,
}: UseTodoItemLogicProps): UseTodoItemLogicReturn {
  // 1. Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(todo.content);
  const [isLoading, setIsLoading] = useState(false);

  // 2. Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // 3. Callbacks (useStable)
  const callbacks = useStable({
    handleToggle: async () => {
      setIsLoading(true);
      try {
        await onToggle(todo.id);
      } finally {
        setIsLoading(false);
      }
    },

    handleDelete: async () => {
      setIsLoading(true);
      try {
        await onDelete(todo.id);
      } finally {
        setIsLoading(false);
      }
    },

    startEditing: () => {
      setIsEditing(true);
      setEditContent(todo.content);
    },

    cancelEditing: () => {
      setIsEditing(false);
      setEditContent(todo.content);
    },

    saveEdit: async () => {
      const trimmed = editContent.trim();
      if (!trimmed || trimmed === todo.content) {
        // Cancel if empty or unchanged
        setIsEditing(false);
        setEditContent(todo.content);
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
    },

    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        callbacks.saveEdit();
      } else if (e.key === "Escape") {
        callbacks.cancelEditing();
      }
    },
  });

  // 4. Effects (ALWAYS last)
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

  return {
    // State
    isEditing,
    editContent,
    isLoading,
    // Refs
    inputRef,
    // Setters
    setEditContent,
    // Handlers
    ...callbacks,
  };
}
