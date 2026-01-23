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

export {
  InputField,
  useInputFieldLogic,
  InputFieldPure,
} from "./inputField";
export type { InputFieldProps, InputFieldPureProps } from "./inputField";

export {
  CheckboxField,
  useCheckboxFieldLogic,
  CheckboxFieldPure,
} from "./checkboxField";
export type { CheckboxFieldProps, CheckboxFieldPureProps } from "./checkboxField";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  ConfirmDialog,
  useDialogLogic,
  DialogPure,
} from "./dialog";
export type { DialogProps, DialogPureProps, ConfirmDialogProps } from "./dialog";

export {
  ToastProvider,
  ToastContainer,
  useToast,
  ToastItemPure,
  ToastContainerPure,
} from "./toast";
export type {
  Toast,
  ToastType,
  ToastItemPureProps,
  ToastContainerPureProps,
} from "./toast";

export { SkeletonText, useSkeletonTextLogic, SkeletonTextPure } from "./skeletonText";
export type { SkeletonTextProps, SkeletonTextPureProps } from "./skeletonText";

export { ErrorBoundary, ErrorFallbackPure } from "./errorBoundary";
export type { ErrorBoundaryProps, ErrorFallbackPureProps } from "./errorBoundary";
