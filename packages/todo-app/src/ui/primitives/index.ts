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

export { Button, useButtonLogic, ButtonPure } from "./button";
export type {
  ButtonProps,
  ButtonPureProps,
  ButtonVariant,
  ButtonSize,
} from "./button";

export { Input, useInputLogic, InputPure } from "./input";
export type { InputProps, InputPureProps } from "./input";

export { Checkbox, useCheckboxLogic, CheckboxPure } from "./checkbox";
export type { CheckboxProps, CheckboxPureProps } from "./checkbox";

export { Badge, useBadgeLogic, BadgePure } from "./badge";
export type {
  BadgeProps,
  BadgePureProps,
  BadgeVariant,
  BadgeSize,
} from "./badge";

export { Skeleton, useSkeletonLogic, SkeletonPure } from "./skeleton";
export type { SkeletonProps, SkeletonPureProps } from "./skeleton";
