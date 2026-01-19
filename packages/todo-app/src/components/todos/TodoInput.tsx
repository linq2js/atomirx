/**
 * Todo input component.
 *
 * @description
 * Input field for adding new todos.
 * Supports keyboard submission and loading state.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  /**
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = value.trim();
      if (!trimmed || isLoading || disabled) return;

      setIsLoading(true);
      try {
        await onSubmit(trimmed);
        setValue("");
        // Refocus input after submission
        inputRef.current?.focus();
      } catch {
        // Keep value on error so user can retry
      } finally {
        setIsLoading(false);
      }
    },
    [value, isLoading, disabled, onSubmit]
  );

  /**
   * Handle key press.
   */
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        className={cn(
          "w-full pl-4 pr-12 py-3 rounded-xl",
          "border border-gray-200 bg-white",
          "text-gray-900 placeholder:text-gray-400",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "disabled:bg-gray-100 disabled:cursor-not-allowed"
        )}
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2",
          "flex items-center justify-center w-8 h-8 rounded-lg",
          "transition-all duration-200",
          canSubmit
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
        aria-label="Add todo"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}
