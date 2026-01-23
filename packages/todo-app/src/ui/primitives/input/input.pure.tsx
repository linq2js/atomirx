/**
 * Input presentation component.
 *
 * @description
 * Pure presentation component for Input.
 * Use this in Storybook to test all visual states.
 */

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Input as BaseInput } from "@base-ui-components/react/input";
import { cn } from "@/shared/utils";

/**
 * Input pure component props.
 */
export interface InputPureProps extends ComponentPropsWithoutRef<typeof BaseInput> {
  /** Whether the input is in an error state */
  isInvalid?: boolean;
}

/**
 * Input pure presentation component.
 *
 * @example
 * ```tsx
 * <InputPure placeholder="Enter text" />
 *
 * <InputPure type="email" isInvalid />
 * ```
 */
export const InputPure = forwardRef<HTMLInputElement, InputPureProps>(
  function InputPure({ className, isInvalid, ...props }, ref) {
    return (
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
          isInvalid
            ? "border-red-500 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300",
          // Disabled styles
          "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
