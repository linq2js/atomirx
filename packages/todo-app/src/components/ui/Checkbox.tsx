/**
 * Checkbox component.
 *
 * @description
 * A styled checkbox component using Base UI with Tailwind CSS.
 * Supports checked, indeterminate, and disabled states.
 */

import { forwardRef } from "react";
import { Checkbox as BaseCheckbox } from "@base-ui-components/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox component props.
 */
export interface CheckboxProps {
  /** Label text for the checkbox */
  label?: string;
  /** Description text below the label */
  description?: string;
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
  /** Whether the checkbox is checked */
  checked?: boolean;
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Additional class names */
  className?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Accessible name */
  "aria-label"?: string;
}

/**
 * Checkbox component.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 *   label="Remember me"
 * />
 *
 * <Checkbox
 *   checked={todo.completed}
 *   onCheckedChange={() => toggleTodo(todo.id)}
 * />
 * ```
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(
    { className, label, description, indeterminate, checked, onCheckedChange, disabled, ...props },
    ref
  ) {
    // Determine checked state for styling
    const isChecked = indeterminate || checked;

    return (
      <div className="flex items-start gap-3">
        <BaseCheckbox.Root
          ref={ref}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={props["aria-label"]}
          className={cn(
            // Base styles
            "flex h-5 w-5 shrink-0 items-center justify-center rounded",
            "border-2 transition-colors duration-150",
            // Focus styles
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            // Checked/unchecked styles
            isChecked
              ? "border-blue-600 bg-blue-600"
              : "border-gray-300 bg-white",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          <BaseCheckbox.Indicator
            className={cn(
              "flex items-center justify-center text-white",
              "data-[state=unchecked]:hidden"
            )}
          >
            {indeterminate ? (
              <Minus className="h-3.5 w-3.5" strokeWidth={3} />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            )}
          </BaseCheckbox.Indicator>
        </BaseCheckbox.Root>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-gray-900">{label}</span>
            )}
            {description && (
              <span className="text-sm text-gray-500">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
