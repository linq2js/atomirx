/**
 * InputField presentation component.
 *
 * @description
 * Pure presentation component for InputField.
 * Use this in Storybook to test all visual states.
 */

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/shared/utils";
import { Input, type InputProps } from "../../primitives/input";

/**
 * InputField pure component props.
 */
export interface InputFieldPureProps extends InputProps {
  /** Label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text below input */
  helperText?: string;
  /** Icon to show on the left */
  leftIcon?: ReactNode;
  /** Icon to show on the right */
  rightIcon?: ReactNode;
}

/**
 * InputField pure presentation component.
 *
 * @example
 * ```tsx
 * <InputFieldPure
 *   label="Email"
 *   placeholder="Enter your email"
 *   type="email"
 * />
 *
 * <InputFieldPure
 *   label="Search"
 *   leftIcon={<Search className="h-4 w-4" />}
 * />
 *
 * <InputFieldPure
 *   label="Password"
 *   error="Password is required"
 * />
 * ```
 */
export const InputFieldPure = forwardRef<HTMLInputElement, InputFieldPureProps>(
  function InputFieldPure(
    { className, label, error, helperText, leftIcon, rightIcon, id, ...props },
    ref
  ) {
    const inputId =
      id ||
      (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const hasError = !!error;

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <Input
            ref={ref}
            id={inputId}
            isInvalid={hasError}
            className={cn(leftIcon && "pl-10", rightIcon && "pr-10")}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);
