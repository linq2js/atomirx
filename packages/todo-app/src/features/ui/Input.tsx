/**
 * Input component.
 *
 * @description
 * A styled input component using Base UI with Tailwind CSS.
 * Supports error states, icons, and custom styling.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Input as BaseInput } from "@base-ui-components/react/input";
import { cn } from "@/shared/utils";

/**
 * Input component props.
 */
export interface InputProps extends ComponentPropsWithoutRef<typeof BaseInput> {
  /** Error message to display */
  error?: string;
  /** Icon to show on the left */
  leftIcon?: ReactNode;
  /** Icon to show on the right */
  rightIcon?: ReactNode;
  /** Whether the input is in an error state */
  isInvalid?: boolean;
}

/**
 * Input component.
 *
 * @example
 * ```tsx
 * <Input
 *   placeholder="Enter your email"
 *   type="email"
 * />
 *
 * <Input
 *   placeholder="Search..."
 *   leftIcon={<Search className="h-4 w-4" />}
 * />
 *
 * <Input
 *   isInvalid
 *   error="This field is required"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, error, leftIcon, rightIcon, isInvalid, ...props },
    ref
  ) {
    const hasError = isInvalid || !!error;

    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <BaseInput
            ref={ref}
            className={cn(
              // Base styles
              "w-full rounded-lg border bg-white px-4 py-2",
              "text-gray-900 placeholder:text-gray-400",
              "transition-colors duration-150",
              // Focus styles
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              // Error styles
              hasError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300",
              // Disabled styles
              "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
              // Icon padding
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
