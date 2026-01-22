import { onCreateHook } from "../core/onCreateHook";
import type { CreateInfo, ModuleInfo } from "../core/onCreateHook";
import { getRegistry, _forceResetRegistry } from "./registry";
import type { DevtoolsOptions, DevtoolsRegistry } from "./types";
import { DEFAULT_MAX_HISTORY_SIZE } from "./constants";

/**
 * Check if running in production environment.
 */
function isProduction(): boolean {
  try {
    // Check common environment variables
    if (typeof process !== "undefined" && process.env) {
      const env = process.env.NODE_ENV;
      return env === "production";
    }
  } catch {
    // Ignore
  }

  // Check import.meta.env for Vite
  try {
    // @ts-expect-error - import.meta.env may not exist
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // @ts-expect-error - import.meta.env may not exist
      return import.meta.env.PROD === true;
    }
  } catch {
    // Ignore
  }

  return false;
}

/**
 * Whether devtools is currently enabled.
 */
let isEnabled = false;

/**
 * Cleanup function to disable devtools.
 */
let cleanupFn: (() => void) | null = null;

/**
 * Set up devtools to track all atomirx entities.
 *
 * This function hooks into the entity creation system and registers
 * all atoms, derived atoms, effects, pools, and modules with the
 * devtools registry for inspection.
 *
 * @param options - Configuration options
 * @returns Cleanup function to disable devtools
 *
 * @example Basic setup
 * ```ts
 * import { setupDevtools } from 'atomirx/devtools';
 *
 * // Enable devtools (disabled in production by default)
 * const cleanup = setupDevtools();
 *
 * // Later: disable devtools
 * cleanup();
 * ```
 *
 * @example Enable in production
 * ```ts
 * setupDevtools({ enableInProduction: true });
 * ```
 *
 * @example Custom history size
 * ```ts
 * setupDevtools({ maxHistorySize: 100 });
 * ```
 */
export function setupDevtools(options: DevtoolsOptions = {}): () => void {
  const {
    maxHistorySize = DEFAULT_MAX_HISTORY_SIZE,
    enableInProduction = false,
  } = options;

  // Skip in production unless explicitly enabled
  if (isProduction() && !enableInProduction) {
    console.warn(
      "[atomirx-devtools] Devtools disabled in production. " +
        "Use { enableInProduction: true } to enable."
    );
    return () => {};
  }

  // Already enabled, return existing cleanup
  if (isEnabled && cleanupFn) {
    return cleanupFn;
  }

  const registry = getRegistry(maxHistorySize);

  // Hook into entity creation
  onCreateHook.override((prev) => (info: CreateInfo | ModuleInfo) => {
    // Call previous handlers first
    prev?.(info);

    // Register with devtools
    switch (info.type) {
      case "mutable":
        registry.registerMutable(info.instance, info.key);
        break;

      case "derived":
        // Note: We don't have dependency info at creation time
        // Could be enhanced later with dependency tracking
        registry.registerDerived(info.instance, info.key);
        break;

      case "effect":
        registry.registerEffect(info.instance, info.key);
        break;

      case "pool":
        // Note: gcTime is not available in PoolMeta, using 0 as default
        registry.registerPool(info.instance, info.key, 0);
        break;

      case "module":
        if (typeof info.instance === "object" && info.instance !== null) {
          registry.registerModule(info.instance, info.key);
        }
        break;
    }
  });

  isEnabled = true;

  // Create cleanup function
  cleanupFn = () => {
    onCreateHook.reset();
    registry.clear();
    isEnabled = false;
    cleanupFn = null;
  };

  return cleanupFn;
}

/**
 * Get the devtools registry.
 *
 * Returns the registry instance if devtools is enabled,
 * otherwise returns null.
 *
 * @returns The registry or null if devtools not enabled
 *
 * @example
 * ```ts
 * import { getDevtoolsRegistry } from 'atomirx/devtools';
 *
 * const registry = getDevtoolsRegistry();
 * if (registry) {
 *   console.log('Stats:', registry.getStats());
 * }
 * ```
 */
export function getDevtoolsRegistry(): DevtoolsRegistry | null {
  if (!isEnabled) return null;
  return getRegistry();
}

/**
 * Check if devtools is currently enabled.
 */
export function isDevtoolsEnabled(): boolean {
  return isEnabled;
}

/**
 * Reset devtools state (for testing).
 * @internal
 */
export function _resetDevtools(): void {
  if (cleanupFn) {
    cleanupFn();
  }
  _forceResetRegistry();
  isEnabled = false;
  cleanupFn = null;
}
