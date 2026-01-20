/**
 * CheckboxField composed component.
 *
 * @description
 * A complete checkbox field with label and description.
 * Composes primitives: Checkbox.
 */

import { forwardRef } from "react";
import { CheckboxFieldPure, type CheckboxFieldPureProps } from "./checkboxField.pure";

/**
 * CheckboxField component props.
 */
export type CheckboxFieldProps = CheckboxFieldPureProps;

/**
 * CheckboxField logic hook.
 *
 * @description
 * Logic hook for CheckboxField. Since CheckboxField is stateless,
 * this hook simply passes through props.
 *
 * @param props - CheckboxField props
 * @returns Props for CheckboxFieldPure
 */
export function useCheckboxFieldLogic(props: CheckboxFieldProps): CheckboxFieldPureProps {
  return props;
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
  function CheckboxField(props, ref) {
    const pureProps = useCheckboxFieldLogic(props);
    return <CheckboxFieldPure ref={ref} {...pureProps} />;
  }
);
