/**
 * UI Components - shared generic components.
 *
 * @description
 * Re-exports all UI components from a single entry point.
 * These components are generic and contain no business logic.
 *
 * Structure:
 * - primitives/ - smallest UI building blocks (Button, Input, Checkbox, etc.)
 * - composed/ - components built from primitives (Dialog, Toast, InputField, etc.)
 *
 * @example
 * ```tsx
 * import { Button, Input, Dialog, Badge } from "@/ui";
 * ```
 */

// Primitives
export { Button } from "./primitives/button";
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
} from "./primitives/button";

export { Input } from "./primitives/input";
export type { InputProps } from "./primitives/input";

export { Checkbox } from "./primitives/checkbox";
export type { CheckboxProps } from "./primitives/checkbox";

export { Badge } from "./primitives/badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./primitives/badge";

export { Skeleton } from "./primitives/skeleton";
export type { SkeletonProps } from "./primitives/skeleton";

// Composed
export { InputField } from "./composed/inputField";
export type { InputFieldProps } from "./composed/inputField";

export { CheckboxField } from "./composed/checkboxField";
export type { CheckboxFieldProps } from "./composed/checkboxField";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  ConfirmDialog,
} from "./composed/dialog";
export type { DialogProps, ConfirmDialogProps } from "./composed/dialog";

export { ToastProvider, ToastContainer, useToast } from "./composed/toast";
export type { Toast, ToastType } from "./composed/toast";

export { SkeletonText } from "./composed/skeletonText";
export type { SkeletonTextProps } from "./composed/skeletonText";

export { ErrorBoundary } from "./composed/errorBoundary";
