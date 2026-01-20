/**
 * Todo item logic hook.
 *
 * @description
 * Manages state and handlers for a single todo item.
 * Handles editing, toggling completion, and deletion.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { Todo } from "../types";

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

  return {
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
  };
}
