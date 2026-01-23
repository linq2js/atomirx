import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  STORAGE_KEY_PREFERENCES,
  MIN_PANEL_SIZE,
  MAX_PANEL_SIZE,
} from "../devtools/constants";
import {
  DevtoolsPreferences,
  DEFAULT_PREFERENCES,
  DevtoolsTab,
  PanelPosition,
  AtomFilter,
} from "../devtools/types";
import type { DevtoolsRegistry } from "../devtools/types";

/**
 * Load preferences from localStorage.
 */
function loadPreferences(): DevtoolsPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {
    // Ignore errors, use defaults
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save preferences to localStorage.
 */
function savePreferences(prefs: DevtoolsPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for managing devtools preferences with localStorage persistence.
 */
export function useDevtoolsPreferences() {
  const [preferences, setPreferencesState] = useState<DevtoolsPreferences>(() =>
    loadPreferences()
  );

  // Persist on change
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Update helpers
  const setIsOpen = useCallback((isOpen: boolean) => {
    setPreferencesState((prev) => ({ ...prev, isOpen }));
  }, []);

  const setPosition = useCallback((position: PanelPosition) => {
    setPreferencesState((prev) => ({ ...prev, position }));
  }, []);

  const setActiveTab = useCallback((activeTab: DevtoolsTab) => {
    setPreferencesState((prev) => ({ ...prev, activeTab }));
  }, []);

  const setPanelSize = useCallback((size: number) => {
    const panelSize = Math.max(MIN_PANEL_SIZE, Math.min(MAX_PANEL_SIZE, size));
    setPreferencesState((prev) => ({ ...prev, panelSize }));
  }, []);

  const setSearchText = useCallback((tab: DevtoolsTab, text: string) => {
    setPreferencesState((prev) => ({
      ...prev,
      searchText: { ...prev.searchText, [tab]: text },
    }));
  }, []);

  const setAtomFilter = useCallback((atomFilter: AtomFilter) => {
    setPreferencesState((prev) => ({ ...prev, atomFilter }));
  }, []);

  const setSelectedEntityId = useCallback((selectedEntityId: string | null) => {
    setPreferencesState((prev) => ({ ...prev, selectedEntityId }));
  }, []);

  const setShowAtomValues = useCallback((showAtomValues: boolean) => {
    setPreferencesState((prev) => ({ ...prev, showAtomValues }));
  }, []);

  const toggleShowAtomValues = useCallback(() => {
    setPreferencesState((prev) => ({
      ...prev,
      showAtomValues: !prev.showAtomValues,
    }));
  }, []);

  const togglePanel = useCallback(() => {
    setPreferencesState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const cyclePosition = useCallback(() => {
    setPreferencesState((prev) => {
      const positions: PanelPosition[] = ["bottom", "right", "left"];
      const currentIndex = positions.indexOf(prev.position);
      const nextIndex = (currentIndex + 1) % positions.length;
      return { ...prev, position: positions[nextIndex] };
    });
  }, []);

  return {
    preferences,
    setIsOpen,
    setPosition,
    setActiveTab,
    setPanelSize,
    setSearchText,
    setAtomFilter,
    setSelectedEntityId,
    setShowAtomValues,
    togglePanel,
    cyclePosition,
    toggleShowAtomValues,
  };
}

/**
 * Hook for subscribing to devtools registry changes.
 */
export function useDevtoolsRegistry(registry: DevtoolsRegistry | null) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!registry) return () => {};
      return registry.subscribe(onStoreChange);
    },
    [registry]
  );

  const getSnapshot = useCallback(() => {
    if (!registry) return null;
    return registry.entities;
  }, [registry]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Hook for subscribing to devtools logs changes.
 */
export function useDevtoolsLogs(registry: DevtoolsRegistry | null) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!registry) return () => {};
      return registry.subscribe(onStoreChange);
    },
    [registry]
  );

  const getSnapshot = useCallback(() => {
    if (!registry) return null;
    return registry.logs;
  }, [registry]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Hook for keyboard shortcuts.
 */
export function useKeyboardShortcuts(
  onToggle: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D or Cmd+Shift+D to toggle devtools
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "d"
      ) {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle, enabled]);
}

/**
 * Hook for panel resize handling.
 */
export function usePanelResize(
  position: PanelPosition,
  _initialSize: number,
  onSizeChange: (size: number) => void
) {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newSize: number;

      switch (position) {
        case "bottom":
          newSize = window.innerHeight - e.clientY;
          break;
        case "right":
          newSize = window.innerWidth - e.clientX;
          break;
        case "left":
          newSize = e.clientX;
          break;
      }

      onSizeChange(Math.max(MIN_PANEL_SIZE, Math.min(MAX_PANEL_SIZE, newSize)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, position, onSizeChange]);

  return {
    isResizing,
    handleMouseDown,
  };
}

/**
 * Serialize a value for display in devtools.
 * Handles circular references and non-serializable values.
 */
export function serializeValue(
  value: unknown,
  maxLength: number = 500
): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";

  try {
    const seen = new WeakSet();
    const serialized = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        if (typeof val === "function") return "[Function]";
        if (typeof val === "symbol") return val.toString();
        if (val instanceof Error) return `[Error: ${val.message}]`;
        if (val instanceof Map) return `[Map(${val.size})]`;
        if (val instanceof Set) return `[Set(${val.size})]`;
        if (val instanceof WeakMap) return "[WeakMap]";
        if (val instanceof WeakSet) return "[WeakSet]";
        if (val instanceof Promise) return "[Promise]";
        return val;
      },
      2
    );

    if (serialized.length > maxLength) {
      return serialized.slice(0, maxLength) + "...";
    }
    return serialized;
  } catch {
    return "[unserializable]";
  }
}

/**
 * Format a timestamp for display.
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${time}.${ms}`;
}

/**
 * Format a relative time (e.g., "2s ago").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
