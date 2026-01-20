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
export { Button } from "./primitives/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./primitives/Button";

export { Input } from "./primitives/Input";
export type { InputProps } from "./primitives/Input";

export { Checkbox } from "./primitives/Checkbox";
export type { CheckboxProps } from "./primitives/Checkbox";

export { Badge } from "./primitives/Badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./primitives/Badge";

export { Skeleton } from "./primitives/Skeleton";
export type { SkeletonProps } from "./primitives/Skeleton";

// Composed
export { InputField } from "./composed/InputField";
export type { InputFieldProps } from "./composed/InputField";

export { CheckboxField } from "./composed/CheckboxField";
export type { CheckboxFieldProps } from "./composed/CheckboxField";

export { Dialog, DialogTrigger, DialogClose, ConfirmDialog } from "./composed/Dialog";
export type { DialogProps, ConfirmDialogProps } from "./composed/Dialog";

export { ToastProvider, ToastContainer, useToast } from "./composed/Toast";
export type { Toast, ToastType } from "./composed/Toast";

export { SkeletonText } from "./composed/SkeletonText";
export type { SkeletonTextProps } from "./composed/SkeletonText";

export { ErrorBoundary } from "./composed/ErrorBoundary";
