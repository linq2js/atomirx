/**
 * @fileoverview ShowcaseHeader connected component
 *
 * This is the main export for the showcaseHeader component.
 * Currently a simple re-export of the pure component since no store connections are needed.
 *
 * If store connections are needed in the future (e.g., for theme toggle state),
 * this file would handle the connection and pass props to the pure component.
 */

export { ShowcaseHeaderPure as ShowcaseHeader } from "./showcaseHeader.pure";
export type { ShowcaseHeaderPureProps as ShowcaseHeaderProps } from "./showcaseHeader.pure";
