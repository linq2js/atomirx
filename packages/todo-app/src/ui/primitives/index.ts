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

export { Button } from "./button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./button";

export { Input } from "./input";
export type { InputProps } from "./input";

export { Checkbox } from "./checkbox";
export type { CheckboxProps } from "./checkbox";

export { Badge } from "./badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./badge";

export { Skeleton } from "./skeleton";
export type { SkeletonProps } from "./skeleton";
