/**
 * ShowcaseNav component exports.
 *
 * @module features/showcase/comps/showcaseNav
 *
 * @description
 * Navigation component for the showcase demo selector.
 * Provides both desktop horizontal tabs and mobile dropdown menu.
 *
 * @example
 * ```tsx
 * import { ShowcaseNav, type DemoId } from '@/features/showcase/comps/showcaseNav';
 *
 * const [activeDemo, setActiveDemo] = useState<DemoId>('basic-atom');
 *
 * <ShowcaseNav
 *   activeDemo={activeDemo}
 *   onSelectDemo={setActiveDemo}
 *   mobileMenuOpen={false}
 *   onCloseMobileMenu={() => {}}
 * />
 * ```
 */

// Default export - connected component with default navItems
export { ShowcaseNav } from "./showcaseNav";

// Named exports - for custom usage
export { ShowcaseNavPure } from "./showcaseNav.pure";
export { navItems } from "./showcaseNav";

// Type exports
export type {
  DemoId,
  NavItem,
  ShowcaseNavProps,
  ShowcaseNavPureProps,
} from "./showcaseNav";
