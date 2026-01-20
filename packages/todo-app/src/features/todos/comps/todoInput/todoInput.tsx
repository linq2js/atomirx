/**
 * Todo input component.
 *
 * @description
 * Input field for adding new todos.
 * Supports keyboard submission and loading state.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { TodoInputPure, type TodoInputPureProps } from "./todoInput.pure";

/**
 * Todo input props.
 */
export interface TodoInputProps {
  /** Callback when a new todo is submitted */
  onSubmit: (content: string) => Promise<void>;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

/**
 * TodoInput logic hook return type.
 */
export type UseTodoInputLogicReturn = Omit<TodoInputPureProps, "placeholder">;

/**
 * TodoInput logic hook.
 *
 * @description
 * Manages state and handlers for the todo input.
 *
 * @businessRules
 * - Empty or whitespace-only input is not submitted
 * - Input clears after successful submission
 * - Loading state prevents double submission
 */
export function useTodoInputLogic({
  onSubmit,
  disabled = false,
  autoFocus = false,
}: Omit<TodoInputProps, "placeholder">): UseTodoInputLogicReturn {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = value.trim();
      if (!trimmed || isLoading || disabled) return;

      setIsLoading(true);
      try {
        await onSubmit(trimmed);
        setValue("");
        inputRef.current?.focus();
      } catch {
        // Keep value on error
      } finally {
        setIsLoading(false);
      }
    },
    [value, isLoading, disabled, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  const isDisabled = disabled || isLoading;
  const canSubmit = value.trim().length > 0 && !isDisabled;

  return {
    value,
    isLoading,
    disabled: isDisabled,
    canSubmit,
    inputRef,
    onChange: setValue,
    onSubmit: handleSubmit,
    onKeyDown: handleKeyDown,
  };
}

/**
 * Todo input component.
 *
 * @example
 * ```tsx
 * <TodoInput
 *   onSubmit={handleAddTodo}
 *   placeholder="What needs to be done?"
 * />
 * ```
 */
export function TodoInput({
  onSubmit,
  placeholder = "What needs to be done?",
  disabled = false,
  autoFocus = false,
}: TodoInputProps) {
  const pureProps = useTodoInputLogic({ onSubmit, disabled, autoFocus });
  return <TodoInputPure {...pureProps} placeholder={placeholder} />;
}
