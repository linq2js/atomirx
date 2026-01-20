/**
 * CheckboxField composed component.
 *
 * @description
 * A complete checkbox field with label and description.
 * Composes primitives: Checkbox.
 */

import { forwardRef } from "react";
import { cn } from "@/shared/utils";
import { Checkbox, type CheckboxProps } from "../primitives/Checkbox";

/**
 * CheckboxField component props.
 */
export interface CheckboxFieldProps extends CheckboxProps {
  /** Label text for the checkbox */
  label?: string;
  /** Description text below the label */
  description?: string;
}

/**
 * CheckboxField composed component.
 *
 * @example
 * ```tsx
 * <CheckboxField
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 *   label="Remember me"
 * />
 *
 * <CheckboxField
 *   checked={agreeToTerms}
 *   onCheckedChange={setAgreeToTerms}
 *   label="I agree to the terms"
 *   description="By checking this, you agree to our terms of service."
 * />
 * ```
 */
export const CheckboxField = forwardRef<HTMLButtonElement, CheckboxFieldProps>(
  function CheckboxField({ className, label, description, ...props }, ref) {
    return (
      <div className={cn("flex items-start gap-3", className)}>
        <Checkbox ref={ref} {...props} />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-gray-900">{label}</span>
            )}
            {description && (
              <span className="text-sm text-gray-500">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
