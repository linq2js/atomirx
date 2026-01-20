/**
 * Badge presentation component.
 *
 * @description
 * Pure presentation component for Badge.
 * Use this in Storybook to test all visual states.
 */

import { type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/shared/utils";

/**
 * Badge variant types.
 */
export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "secondary";

/**
 * Badge size types.
 */
export type BadgeSize = "sm" | "md";

/**
 * Badge pure component props.
 */
export interface BadgePureProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge style variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Icon to show before the text */
  icon?: ReactNode;
  /** Whether to show as a dot only */
  dot?: boolean;
  children?: ReactNode;
}

/**
 * Variant styles.
 */
const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  secondary: "bg-gray-200 text-gray-600",
};

/**
 * Dot styles (for status indicators).
 */
const dotStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  secondary: "bg-gray-400",
};

/**
 * Size styles.
 */
const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

/**
 * Badge pure presentation component.
 *
 * @example
 * ```tsx
 * <BadgePure variant="success">Synced</BadgePure>
 *
 * <BadgePure variant="warning" icon={<Clock className="h-3 w-3" />}>
 *   Pending
 * </BadgePure>
 *
 * <BadgePure variant="error" dot>
 *   Offline
 * </BadgePure>
 * ```
 */
export function BadgePure({
  className,
  variant = "default",
  size = "sm",
  icon,
  dot,
  children,
  ...props
}: BadgePureProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])}
          aria-hidden="true"
        />
      )}
      {icon}
      {children}
    </span>
  );
}
