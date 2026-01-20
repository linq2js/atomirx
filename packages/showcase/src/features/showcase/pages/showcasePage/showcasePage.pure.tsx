/**
 * @module ShowcasePagePure
 * @description Pure presentational component for the showcase page layout.
 * Receives all state and callbacks as props for testability.
 */

import { ReactNode } from "react";
import { ScrollText, ChevronDown } from "lucide-react";
import type { DemoId } from "../../comps";

/**
 * Props for ShowcasePagePure component.
 */
export interface ShowcasePagePureProps {
  /** Currently active demo ID */
  activeDemo: DemoId;
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
  /** Whether log panel is open (mobile) */
  logPanelOpen: boolean;
  /** Header component slot */
  header: ReactNode;
  /** Navigation component slot (desktop) */
  navDesktop: ReactNode;
  /** Navigation component slot (mobile dropdown) */
  navMobile: ReactNode;
  /** Event log panel component slot */
  eventLogPanel: ReactNode;
  /** Active demo content */
  children: ReactNode;
  /** Toggle log panel visibility (mobile) */
  onToggleLogPanel: () => void;
}

/**
 * Pure presentational component for showcase page layout.
 *
 * @description
 * Renders the main showcase page layout with:
 * - Sticky header with navigation
 * - Main content area for demos
 * - Fixed event log panel (desktop) / floating panel (mobile)
 *
 * This component is purely presentational and receives all state through props.
 *
 * @example
 * ```tsx
 * <ShowcasePagePure
 *   activeDemo="basic-atom"
 *   mobileMenuOpen={false}
 *   logPanelOpen={true}
 *   header={<ShowcaseHeader />}
 *   navDesktop={<ShowcaseNav />}
 *   navMobile={<ShowcaseNav />}
 *   eventLogPanel={<EventLogPanel />}
 *   onToggleLogPanel={toggleLogPanel}
 * >
 *   <BasicAtomDemo />
 * </ShowcasePagePure>
 * ```
 */
export function ShowcasePagePure({
  mobileMenuOpen,
  logPanelOpen,
  header,
  navDesktop,
  navMobile,
  eventLogPanel,
  children,
  onToggleLogPanel,
}: ShowcasePagePureProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Logo + Feature Tabs */}
      <header className="glass sticky top-0 z-50 border-b border-surface-800/50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          {/* Top row: Logo + Links */}
          {header}

          {/* Feature Tabs - Desktop */}
          <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto">
            {navDesktop}
          </nav>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-800/50 bg-surface-900/95 backdrop-blur-sm">
            <nav className="p-2 space-y-1">{navMobile}</nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Demo Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:pr-80 xl:pr-96">
          <div className="max-w-4xl mx-auto animate-fade-in">{children}</div>
        </main>

        {/* Event Log Panel - Desktop (Right Side) - Fixed Position */}
        <aside
          className={`
            hidden lg:flex flex-col fixed right-0 top-[104px] bottom-0
            w-80 xl:w-96 border-l border-surface-800/50 bg-surface-900/95 backdrop-blur-sm
            transition-all duration-300 z-40
          `}
        >
          {eventLogPanel}
        </aside>
      </div>

      {/* Mobile Event Log Toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={onToggleLogPanel}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg transition-colors"
        >
          <ScrollText className="w-4 h-4" />
          <span className="text-sm font-medium">Logs</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${logPanelOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Mobile Event Log Panel */}
      {logPanelOpen && (
        <div className="lg:hidden fixed bottom-16 right-4 left-4 z-30 h-64 bg-surface-900 border border-surface-800 rounded-lg shadow-xl overflow-hidden">
          {eventLogPanel}
        </div>
      )}
    </div>
  );
}
