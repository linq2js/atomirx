/**
 * Dialog component.
 *
 * @description
 * A modal dialog component using Base UI with Tailwind CSS.
 * Supports title, description, and action buttons.
 */

import { type ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/utils";
import { Button } from "./Button";

/**
 * Dialog component props.
 */
export interface DialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Dialog content */
  children: ReactNode;
  /** Whether to show the close button */
  showCloseButton?: boolean;
}

/**
 * Dialog component.
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
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  showCloseButton = true,
}: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <BaseDialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md rounded-xl bg-white p-6 shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          {showCloseButton && (
            <BaseDialog.Close
              className={cn(
                "absolute right-4 top-4 rounded-full p-1",
                "text-gray-400 hover:text-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
            >
              <X className="h-5 w-5" />
            </BaseDialog.Close>
          )}

          {title && (
            <BaseDialog.Title className="text-lg font-semibold text-gray-900">
              {title}
            </BaseDialog.Title>
          )}

          {description && (
            <BaseDialog.Description className="mt-2 text-sm text-gray-600">
              {description}
            </BaseDialog.Description>
          )}

          <div className="mt-4">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/**
 * Dialog trigger component.
 * Wrap around a button to make it open the dialog.
 */
export const DialogTrigger = BaseDialog.Trigger;

/**
 * Dialog close component.
 * Wrap around a button to make it close the dialog.
 */
export const DialogClose = BaseDialog.Close;

/**
 * Confirm dialog props.
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?: "primary" | "danger";
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
}

/**
 * Pre-built confirm dialog.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Todo?"
 *   description="This action cannot be undone."
 *   confirmVariant="danger"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="mt-4 flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
