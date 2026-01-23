/**
 * TodoInput presentation component.
 *
 * @description
 * Pure presentation component for TodoInput.
 *
 * @businessRules
 * - Empty or whitespace-only input is not submitted
 * - Input clears after successful submission
 * - Loading state prevents double submission
 */

import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils";

/**
 * TodoInput pure component props.
 */
export interface TodoInputPureProps {
  /** Input value */
  value: string;
  /** Whether loading */
  isLoading: boolean;
  /** Whether input is disabled */
  disabled: boolean;
  /** Placeholder text */
  placeholder: string;
  /** Whether submit is allowed */
  canSubmit: boolean;
  /** Ref for input element */
  inputRef: React.RefObject<HTMLInputElement>;
  /** Handle input change */
  onChange: (value: string) => void;
  /** Handle form submit */
  onSubmit: (e: React.FormEvent) => void;
  /** Handle key down */
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * TodoInput pure presentation component.
 */
export function TodoInputPure({
  value,
  isLoading,
  disabled,
  placeholder,
  canSubmit,
  inputRef,
  onChange,
  onSubmit,
  onKeyDown,
}: TodoInputPureProps) {
  const isDisabled = disabled || isLoading;

  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
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
