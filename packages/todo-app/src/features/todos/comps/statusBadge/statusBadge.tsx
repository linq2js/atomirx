/**
 * StatusBadge domain component.
 *
 * @description
 * Pre-configured badges for sync statuses.
 * This is a domain component because it knows about sync status business logic.
 */

import { StatusBadgePure, type StatusBadgePureProps } from "./statusBadge.pure";

/**
 * StatusBadge component props.
 */
export type StatusBadgeProps = StatusBadgePureProps;

/**
 * StatusBadge logic hook.
 *
 * @param props - StatusBadge props
 * @returns Props for StatusBadgePure
 */
export function useStatusBadgeLogic(props: StatusBadgeProps): StatusBadgePureProps {
  return props;
}

/**
 * StatusBadge domain component.
 *
 * @example
 * ```tsx
 * <StatusBadge status="synced" />
 * <StatusBadge status="pending" />
 * ```
 */
export function StatusBadge(props: StatusBadgeProps) {
  const pureProps = useStatusBadgeLogic(props);
  return <StatusBadgePure {...pureProps} />;
}
