import type { ReactNode } from "react";

/**
 * Unique identifier for each demo in the showcase.
 */
export type DemoId =
  | "basic-atom"
  | "todo-list"
  | "derived"
  | "batch"
  | "pool"
  | "use-action"
  | "use-selector"
  | "async-utils";

/**
 * Navigation item configuration for each demo tab.
 */
export interface NavItem {
  /** Unique identifier matching DemoId */
  id: DemoId;
  /** Display label for the tab */
  label: string;
  /** Icon component to display */
  icon: ReactNode;
}

/**
 * Props for the ShowcaseNavPure component.
 */
export interface ShowcaseNavPureProps {
  /** List of navigation items to render */
  navItems: NavItem[];
  /** Currently active demo ID */
  activeDemo: DemoId;
  /** Callback when a demo is selected */
  onSelectDemo: (demoId: DemoId) => void;
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
  /** Callback when mobile menu should close */
  onCloseMobileMenu: () => void;
}

/**
 * Presentational component for the showcase navigation tabs.
 * Renders both desktop and mobile navigation variants.
 *
 * @description
 * - Desktop: Horizontal tab bar with icons and labels
 * - Mobile: Vertical dropdown menu
 *
 * @example
 * ```tsx
 * <ShowcaseNavPure
 *   navItems={navItems}
 *   activeDemo="basic-atom"
 *   onSelectDemo={setActiveDemo}
 *   mobileMenuOpen={false}
 *   onCloseMobileMenu={() => setMobileMenuOpen(false)}
 * />
 * ```
 */
export function ShowcaseNavPure({
  navItems,
  activeDemo,
  onSelectDemo,
  mobileMenuOpen,
  onCloseMobileMenu,
}: ShowcaseNavPureProps) {
  return (
    <>
      {/* Feature Tabs - Desktop */}
      <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectDemo(item.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer whitespace-nowrap
              ${
                activeDemo === item.id
                  ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                  : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
              }
            `}
          >
            <span
              className={
                activeDemo === item.id ? "text-primary-400" : "text-surface-500"
              }
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-800/50 bg-surface-900/95 backdrop-blur-sm">
          <nav className="p-2 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectDemo(item.id);
                  onCloseMobileMenu();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-200 cursor-pointer
                  ${
                    activeDemo === item.id
                      ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                      : "text-surface-300 hover:bg-surface-800/50 hover:text-surface-100"
                  }
                `}
              >
                <span
                  className={
                    activeDemo === item.id
                      ? "text-primary-400"
                      : "text-surface-500"
                  }
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
