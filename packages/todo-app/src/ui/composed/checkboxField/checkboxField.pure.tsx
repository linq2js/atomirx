/**
 * CheckboxField presentation component.
 *
 * @description
 * Pure presentation component for CheckboxField.
 * Use this in Storybook to test all visual states.
 */

import { forwardRef } from "react";
import { cn } from "@/shared/utils";
import { Checkbox, type CheckboxProps } from "../../primitives/checkbox";

/**
 * CheckboxField pure component props.
 */
export interface CheckboxFieldPureProps extends CheckboxProps {
  /** Label text for the checkbox */
  label?: string;
  /** Description text below the label */
  description?: string;
}

/**
 * CheckboxField pure presentation component.
 *
 * @example
 * ```tsx
 * <CheckboxFieldPure
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 *   label="Remember me"
 * />
 *
 * <CheckboxFieldPure
 *   checked={agreeToTerms}
 *   onCheckedChange={setAgreeToTerms}
 *   label="I agree to the terms"
 *   description="By checking this, you agree to our terms of service."
 * />
 * ```
 */
export const CheckboxFieldPure = forwardRef<HTMLButtonElement, CheckboxFieldPureProps>(
  function CheckboxFieldPure({ className, label, description, ...props }, ref) {
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
