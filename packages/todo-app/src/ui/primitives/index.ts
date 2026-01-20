/**
 * UI Primitives - smallest UI building blocks.
 *
 * @description
 * Primitives are the smallest UI components that cannot be broken down further.
 * They do NOT use other ui/ components and have no business logic.
 *
 * Rules:
 * - Max 20 JSX lines
 * - Max 5 props (with exceptions for native HTML props)
 * - Max 1 useState
 * - NO imports from ui/composed or ui/primitives
 */

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./Badge";

export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
