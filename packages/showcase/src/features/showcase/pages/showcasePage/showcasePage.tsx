/**
 * @module ShowcasePage
 * @description Main orchestrating page for the showcase application.
 * Composes header, navigation, demos, and event log panel.
 */

import { useState, useEffect, ComponentType } from "react";
import { ShowcasePagePure } from "./showcasePage.pure";
import {
  ShowcaseHeader,
  ShowcaseNav,
  EventLogPanel,
  type DemoId,
} from "../../comps";
import {
  BasicAtomDemo,
  DerivedAtomDemo,
  BatchDemo,
  TodoListDemo,
  AsyncUtilitiesDemo,
  UseActionDemo,
  UseSelectorDemo,
} from "../../demos";

// ============================================================================
// Demo Registry
// ============================================================================

/**
 * Map of demo IDs to their components.
 */
const demoComponents: Record<DemoId, ComponentType> = {
  "basic-atom": BasicAtomDemo,
  "todo-list": TodoListDemo,
  derived: DerivedAtomDemo,
  batch: BatchDemo,
  "use-action": UseActionDemo,
  "use-selector": UseSelectorDemo,
  "async-utils": AsyncUtilitiesDemo,
};

const VALID_DEMO_IDS = new Set<string>(Object.keys(demoComponents));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the initial demo from URL hash or localStorage.
 *
 * @returns The initial demo ID based on URL hash, localStorage, or default
 */
function getInitialDemo(): DemoId {
  // First, check URL hash (e.g., #async-atom)
  const hash = window.location.hash.slice(1);
  if (hash && VALID_DEMO_IDS.has(hash)) {
    return hash as DemoId;
  }

  // Fallback to localStorage
  const stored = localStorage.getItem("atomirx-showcase-demo");
  if (stored && VALID_DEMO_IDS.has(stored)) {
    return stored as DemoId;
  }

  return "basic-atom";
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Main showcase page component.
 *
 * @description
 * This is the main orchestrating component for the showcase application.
 * It manages:
 * - Demo selection state (synced with URL hash and localStorage)
 * - Mobile menu state
 * - Event log panel visibility
 *
 * Uses composition pattern to inject components into the page layout.
 *
 * @example
 * ```tsx
 * // In App.tsx or main entry
 * import { ShowcasePage } from "./features/showcase/pages";
 *
 * function App() {
 *   return <ShowcasePage />;
 * }
 * ```
 */
export function ShowcasePage() {
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────

  const [activeDemo, setActiveDemo] = useState<DemoId>(getInitialDemo);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logPanelOpen, setLogPanelOpen] = useState(true);

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  // Sync activeDemo to URL hash and localStorage
  useEffect(() => {
    window.location.hash = activeDemo;
    localStorage.setItem("atomirx-showcase-demo", activeDemo);
  }, [activeDemo]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && VALID_DEMO_IDS.has(hash)) {
        setActiveDemo(hash as DemoId);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  const handleSelectDemo = (demoId: DemoId) => {
    setActiveDemo(demoId);
  };

  const handleMobileSelectDemo = (demoId: DemoId) => {
    setActiveDemo(demoId);
    setMobileMenuOpen(false);
  };

  const handleToggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleToggleLogPanel = () => {
    setLogPanelOpen(!logPanelOpen);
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  const ActiveDemoComponent = demoComponents[activeDemo];

  return (
    <ShowcasePagePure
      activeDemo={activeDemo}
      mobileMenuOpen={mobileMenuOpen}
      logPanelOpen={logPanelOpen}
      onToggleLogPanel={handleToggleLogPanel}
      header={
        <ShowcaseHeader
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuToggle={handleToggleMobileMenu}
        />
      }
      navDesktop={
        <ShowcaseNav
          activeDemo={activeDemo}
          onSelectDemo={handleSelectDemo}
          mobileMenuOpen={false}
          onCloseMobileMenu={() => {}}
        />
      }
      navMobile={
        <ShowcaseNav
          activeDemo={activeDemo}
          onSelectDemo={handleMobileSelectDemo}
          mobileMenuOpen={true}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />
      }
      eventLogPanel={<EventLogPanel />}
    >
      <ActiveDemoComponent />
    </ShowcasePagePure>
  );
}
