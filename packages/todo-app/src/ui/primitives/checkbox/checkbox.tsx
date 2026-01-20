/**
 * Checkbox primitive component.
 *
 * @description
 * A pure checkbox element using Base UI with Tailwind CSS.
 * This is a primitive component - for checkbox with label, use CheckboxField.
 */

import { forwardRef } from "react";
import { CheckboxPure, type CheckboxPureProps } from "./checkbox.pure";

/**
 * Checkbox component props.
 */
export type CheckboxProps = CheckboxPureProps;

/**
 * Checkbox logic hook.
 *
 * @description
 * Logic hook for Checkbox. Since Checkbox is a stateless primitive,
 * this hook simply passes through props.
 *
 * @param props - Checkbox props
 * @returns Props for CheckboxPure
 */
export function useCheckboxLogic(props: CheckboxProps): CheckboxPureProps {
  return props;
}

/**
 * Checkbox primitive component.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 *   aria-label="Toggle item"
 * />
 * ```
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(props, ref) {
    const pureProps = useCheckboxLogic(props);
    return <CheckboxPure ref={ref} {...pureProps} />;
  }
);
