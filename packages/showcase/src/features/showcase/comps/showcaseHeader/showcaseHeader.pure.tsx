/**
 * @fileoverview ShowcaseHeader presentational component
 *
 * Displays the application header with logo, navigation links, and mobile menu toggle.
 * This is a pure presentational component - receives all data via props.
 */

import { Atom, Github, ExternalLink, Menu, X } from "lucide-react";

/**
 * Props for the ShowcaseHeader component.
 */
export interface ShowcaseHeaderPureProps {
  /**
   * Whether the mobile menu is currently open.
   * Controls which icon is shown (Menu vs X).
   */
  mobileMenuOpen: boolean;

  /**
   * Callback fired when the mobile menu toggle button is clicked.
   */
  onMobileMenuToggle: () => void;

  /**
   * Optional children to render below the header row (e.g., navigation tabs).
   */
  children?: React.ReactNode;
}

/**
 * Renders the showcase application header.
 *
 * Contains:
 * - Logo with gradient background and title
 * - GitHub and Docs links (desktop only)
 * - Mobile menu toggle button
 *
 * @param props - Component props
 * @returns Header element with logo, links, and mobile toggle
 *
 * @example
 * ```tsx
 * <ShowcaseHeaderPure
 *   mobileMenuOpen={false}
 *   onMobileMenuToggle={() => setMobileMenuOpen(v => !v)}
 * >
 *   <NavigationTabs />
 * </ShowcaseHeaderPure>
 * ```
 */
export function ShowcaseHeaderPure({
  mobileMenuOpen,
  onMobileMenuToggle,
  children,
}: ShowcaseHeaderPureProps) {
  return (
    <header className="glass sticky top-0 z-50 border-b border-surface-800/50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
        {/* Top row: Logo + Links */}
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
              <Atom className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient">atomirx</h1>
              <p className="text-[10px] text-surface-400 -mt-0.5">
                Reactive State Management
              </p>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-4">
            <a
              href="https://github.com/user/atomirx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
            >
              <Github className="w-5 h-5" />
              <span className="text-sm">GitHub</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Docs</span>
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 text-surface-400 hover:text-surface-100 transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Children slot for navigation tabs */}
        {children}
      </div>
    </header>
  );
}
