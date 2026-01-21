/**
 * @module ShowcaseScreen
 * @description Main orchestrating screen for the showcase application.
 * Composes header, navigation, demos, and event log panel.
 */

import { useState, useEffect, ComponentType } from "react";
import { ShowcaseScreenPure } from "./showcaseScreen.pure";
import { ShowcaseHeader } from "../../comps/showcaseHeader";
import { ShowcaseNav, type DemoId } from "../../comps/showcaseNav";
import { EventLogPanel } from "../../comps/eventLogPanel";
import { BasicAtomDemo } from "../../comps/basicAtomDemo";
import { DerivedAtomDemo } from "../../comps/derivedAtomDemo";
import { BatchDemo } from "../../comps/batchDemo";
import { TodoListDemo } from "../../comps/todoListDemo";
import { AsyncUtilitiesDemo } from "../../comps/asyncUtilitiesDemo";
import { UseActionDemo } from "../../comps/useActionDemo";
import { UseSelectorDemo } from "../../comps/useSelectorDemo";

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
 * Main showcase screen component.
 *
 * @description
 * This is the main orchestrating component for the showcase application.
 * It manages:
 * - Demo selection state (synced with URL hash and localStorage)
 * - Mobile menu state
 * - Event log panel visibility
 *
 * Uses composition pattern to inject components into the screen layout.
 *
 * @example
 * ```tsx
 * // In App.tsx or main entry
 * import { ShowcaseScreen } from "@/features/showcase/screens/showcaseScreen";
 *
 * function App() {
 *   return <ShowcaseScreen />;
 * }
 * ```
 */
export function ShowcaseScreen() {
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
    <ShowcaseScreenPure
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
    </ShowcaseScreenPure>
  );
}
