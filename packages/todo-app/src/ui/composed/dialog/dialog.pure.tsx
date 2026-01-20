/**
 * Dialog presentation component.
 *
 * @description
 * Pure presentation component for Dialog.
 * Use this in Storybook to test all visual states.
 */

import { type ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/utils";

/**
 * Dialog pure component props.
 */
export interface DialogPureProps {
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
 * Dialog pure presentation component.
 *
 * @example
 * ```tsx
 * <DialogPure
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
 * </DialogPure>
 * ```
 */
export function DialogPure({
  open,
  onOpenChange,
  title,
  description,
  children,
  showCloseButton = true,
}: DialogPureProps) {
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
