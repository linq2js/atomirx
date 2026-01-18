import { hook } from "./hook";
import {
  MutableAtomMeta,
  DerivedAtomMeta,
  MutableAtom,
  DerivedAtom,
  ModuleMeta,
} from "./types";

/**
 * Information provided when a mutable atom is created.
 */
export interface MutableAtomCreateInfo {
  /** Discriminator for mutable atoms */
  type: "mutable";
  /** Optional key from atom options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from atom options */
  meta: MutableAtomMeta | undefined;
  /** The created mutable atom instance */
  atom: MutableAtom<unknown>;
}

/**
 * Information provided when a derived atom is created.
 */
export interface DerivedAtomCreateInfo {
  /** Discriminator for derived atoms */
  type: "derived";
  /** Optional key from derived options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from derived options */
  meta: DerivedAtomMeta | undefined;
  /** The created derived atom instance */
  atom: DerivedAtom<unknown, boolean>;
}

/**
 * Union type for atom creation info (mutable or derived).
 */
export type AtomCreateInfo = MutableAtomCreateInfo | DerivedAtomCreateInfo;

/**
 * Information provided when a module (via define()) is created.
 */
export interface ModuleCreateInfo {
  /** Discriminator for modules */
  type: "module";
  /** Optional key from define options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from define options */
  meta: ModuleMeta | undefined;
  /** The created module instance */
  module: unknown;
}

/**
 * Global hook that fires whenever an atom or module is created.
 *
 * This is useful for:
 * - **DevTools integration** - track all atoms/modules in the app
 * - **Debugging** - log atom creation for troubleshooting
 * - **Testing** - verify expected atoms are created
 *
 * @example Basic logging
 * ```ts
 * onCreateHook.current = (info) => {
 *   console.log(`Created ${info.type}: ${info.key ?? "anonymous"}`);
 * };
 * ```
 *
 * @example DevTools integration
 * ```ts
 * const atoms = new Map();
 * const modules = new Map();
 *
 * onCreateHook.current = (info) => {
 *   if (info.type === "module") {
 *     modules.set(info.key, info.module);
 *   } else {
 *     atoms.set(info.key, info.atom);
 *   }
 * };
 * ```
 *
 * @example Cleanup (disable hook)
 * ```ts
 * onCreateHook.current = undefined;
 * ```
 */
export const onCreateHook =
  hook<(info: AtomCreateInfo | ModuleCreateInfo) => void>();
