/**
 * InputField composed component.
 *
 * @description
 * A complete input field with label, input, and error message.
 * Composes primitives: Input.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/shared/utils";
import { Input } from "../primitives/Input";

/**
 * InputField component props.
 */
export interface InputFieldProps
  extends ComponentPropsWithoutRef<typeof Input> {
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
 * InputField composed component.
 *
 * @example
 * ```tsx
 * <InputField
 *   label="Email"
 *   placeholder="Enter your email"
 *   type="email"
 * />
 *
 * <InputField
 *   label="Search"
 *   leftIcon={<Search className="h-4 w-4" />}
 * />
 *
 * <InputField
 *   label="Password"
 *   error="Password is required"
 * />
 * ```
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(
    { className, label, error, helperText, leftIcon, rightIcon, id, ...props },
    ref
  ) {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
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
            className={cn(
              leftIcon && "pl-10",
              rightIcon && "pr-10"
            )}
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
