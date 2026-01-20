/**
 * Shared UI components.
 *
 * @description
 * Re-exports all UI components from a single entry point.
 * These components are generic and contain no business logic.
 *
 * @example
 * ```tsx
 * import { Button, Input, Checkbox, Dialog, Toast, Badge, Skeleton } from '@/features/ui';
 * ```
 */

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { Dialog, ConfirmDialog, DialogTrigger, DialogClose } from "./Dialog";
export type { DialogProps, ConfirmDialogProps } from "./Dialog";

export {
  ToastProvider,
  ToastContainer,
  useToast,
} from "./Toast";
export type { Toast, ToastType } from "./Toast";

export { Badge, StatusBadge } from "./Badge";
export type {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  StatusBadgeProps,
} from "./Badge";

export {
  Skeleton,
  SkeletonText,
  SkeletonTodoItem,
  SkeletonTodoList,
} from "./Skeleton";
export type { SkeletonProps, SkeletonTextProps } from "./Skeleton";
