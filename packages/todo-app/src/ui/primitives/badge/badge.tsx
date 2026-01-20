/**
 * Badge primitive component.
 *
 * @description
 * A small status indicator badge with multiple variants.
 * This is a primitive component - for domain-specific badges, see features.
 */

import { BadgePure, type BadgePureProps } from "./badge.pure";

/**
 * Badge component props.
 */
export type BadgeProps = BadgePureProps;

/**
 * Badge logic hook.
 *
 * @description
 * Logic hook for Badge. Since Badge is a stateless primitive,
 * this hook simply passes through props.
 *
 * @param props - Badge props
 * @returns Props for BadgePure
 */
export function useBadgeLogic(props: BadgeProps): BadgePureProps {
  return props;
}

/**
 * Badge primitive component.
 *
 * @example
 * ```tsx
 * <Badge variant="success">Synced</Badge>
 *
 * <Badge variant="warning" icon={<Clock className="h-3 w-3" />}>
 *   Pending
 * </Badge>
 *
 * <Badge variant="error" dot>
 *   Offline
 * </Badge>
 * ```
 */
export function Badge(props: BadgeProps) {
  const pureProps = useBadgeLogic(props);
  return <BadgePure {...pureProps} />;
}
