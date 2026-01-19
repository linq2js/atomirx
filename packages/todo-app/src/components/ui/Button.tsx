/**
 * Button component with variants.
 *
 * @description
 * A styled button component using Base UI with Tailwind CSS.
 * Supports multiple variants, sizes, and loading state.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button as BaseButton } from "@base-ui-components/react/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button variant types.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/**
 * Button size types.
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Button component props.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Loading text to show */
  loadingText?: string;
  /** Icon to show before the text */
  leftIcon?: ReactNode;
  /** Icon to show after the text */
  rightIcon?: ReactNode;
}

/**
 * Variant styles.
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-blue-600 text-white",
    "hover:bg-blue-700",
    "active:bg-blue-800",
    "disabled:bg-blue-300"
  ),
  secondary: cn(
    "bg-gray-200 text-gray-900",
    "hover:bg-gray-300",
    "active:bg-gray-400",
    "disabled:bg-gray-100 disabled:text-gray-400"
  ),
  ghost: cn(
    "bg-transparent text-gray-700",
    "hover:bg-gray-100",
    "active:bg-gray-200",
    "disabled:text-gray-400"
  ),
  danger: cn(
    "bg-red-600 text-white",
    "hover:bg-red-700",
    "active:bg-red-800",
    "disabled:bg-red-300"
  ),
};

/**
 * Size styles.
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

/**
 * Button component.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * <Button variant="secondary" size="sm" isLoading>
 *   Saving...
 * </Button>
 *
 * <Button leftIcon={<Plus />} variant="ghost">
 *   Add Item
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    return (
      <BaseButton
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2",
          "rounded-lg font-medium",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed",
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </BaseButton>
    );
  }
);
