import {
  Atom,
  Zap,
  GitBranch,
  Layers,
  Database,
  Play,
  MousePointer,
  Workflow,
} from "lucide-react";
import {
  ShowcaseNavPure,
  type DemoId,
  type NavItem,
  type ShowcaseNavPureProps,
} from "./showcaseNav.pure";

/**
 * Default navigation items for the showcase demos.
 * Each item maps to a demo component.
 */
export const navItems: NavItem[] = [
  {
    id: "basic-atom",
    label: "Basic Atom",
    icon: <Atom className="w-4 h-4" />,
  },
  {
    id: "todo-list",
    label: "Todo List",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "derived",
    label: "Derived",
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    id: "batch",
    label: "Batch",
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: "pool",
    label: "Pool",
    icon: <Database className="w-4 h-4" />,
  },
  {
    id: "use-action",
    label: "useAction",
    icon: <Play className="w-4 h-4" />,
  },
  {
    id: "use-selector",
    label: "useSelector",
    icon: <MousePointer className="w-4 h-4" />,
  },
  {
    id: "async-utils",
    label: "Async Utils",
    icon: <Workflow className="w-4 h-4" />,
  },
];

/**
 * Props for the ShowcaseNav connected component.
 * Omits navItems as they are provided by default.
 */
export type ShowcaseNavProps = Omit<ShowcaseNavPureProps, "navItems">;

/**
 * Connected navigation component for the showcase.
 * Provides default navItems and passes through other props.
 *
 * @description
 * This component wraps ShowcaseNavPure with the default navigation items.
 * Use this in the showcase page to render the demo navigation.
 *
 * @example
 * ```tsx
 * <ShowcaseNav
 *   activeDemo={activeDemo}
 *   onSelectDemo={setActiveDemo}
 *   mobileMenuOpen={mobileMenuOpen}
 *   onCloseMobileMenu={() => setMobileMenuOpen(false)}
 * />
 * ```
 */
export function ShowcaseNav(props: ShowcaseNavProps) {
  return <ShowcaseNavPure navItems={navItems} {...props} />;
}

// Re-export types for consumers
export type { DemoId, NavItem, ShowcaseNavPureProps };
