/**
 * UI Composed - components built from primitives.
 *
 * @description
 * Composed components are built by combining primitives.
 * They may have state/context but still no business logic.
 *
 * Rules:
 * - Max 50 JSX lines total
 * - Max 10 props
 * - Max 2 useState
 * - ONLY imports from ui/primitives
 */

export { InputField } from "./InputField";
export type { InputFieldProps } from "./InputField";

export { CheckboxField } from "./CheckboxField";
export type { CheckboxFieldProps } from "./CheckboxField";

export { Dialog, DialogTrigger, DialogClose, ConfirmDialog } from "./Dialog";
export type { DialogProps, ConfirmDialogProps } from "./Dialog";

export { ToastProvider, ToastContainer, useToast } from "./Toast";
export type { Toast, ToastType } from "./Toast";

export { SkeletonText } from "./SkeletonText";
export type { SkeletonTextProps } from "./SkeletonText";

export { ErrorBoundary } from "./ErrorBoundary";
