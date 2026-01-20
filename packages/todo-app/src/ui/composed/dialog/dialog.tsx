/**
 * Dialog composed component.
 *
 * @description
 * A modal dialog component using Base UI with Tailwind CSS.
 * Supports title, description, and action buttons.
 * Composes primitives: Button.
 */

import {
  DialogPure,
  DialogTrigger,
  DialogClose,
  type DialogPureProps,
} from "./dialog.pure";

/**
 * Dialog component props.
 */
export type DialogProps = DialogPureProps;

/**
 * Dialog logic hook.
 *
 * @description
 * Logic hook for Dialog. Since Dialog is stateless,
 * this hook simply passes through props.
 *
 * @param props - Dialog props
 * @returns Props for DialogPure
 */
export function useDialogLogic(props: DialogProps): DialogPureProps {
  return props;
}

/**
 * Dialog composed component.
 *
 * @example
 * ```tsx
 * <Dialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Confirm Delete"
 *   description="Are you sure you want to delete this item?"
 * >
 *   <div className="flex gap-2 justify-end">
 *     <Button variant="secondary" onClick={() => setIsOpen(false)}>
 *       Cancel
 *     </Button>
 *     <Button variant="danger" onClick={handleDelete}>
 *       Delete
 *     </Button>
 *   </div>
 * </Dialog>
 * ```
 */
export function Dialog(props: DialogProps) {
  const pureProps = useDialogLogic(props);
  return <DialogPure {...pureProps} />;
}

// Re-export sub-components
export { DialogTrigger, DialogClose };
