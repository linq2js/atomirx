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

export { InputField } from "./inputField";
export type { InputFieldProps } from "./inputField";

export { CheckboxField } from "./checkboxField";
export type { CheckboxFieldProps } from "./checkboxField";

export { Dialog, DialogTrigger, DialogClose, ConfirmDialog } from "./dialog";
export type { DialogProps, ConfirmDialogProps } from "./dialog";

export { ToastProvider, ToastContainer, useToast } from "./toast";
export type { Toast, ToastType } from "./toast";

export { SkeletonText } from "./skeletonText";
export type { SkeletonTextProps } from "./skeletonText";

export { ErrorBoundary } from "./errorBoundary";
