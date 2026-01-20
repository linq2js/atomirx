import { Effect } from "./effect";
import { hook } from "./hook";
import {
  MutableAtomMeta,
  DerivedAtomMeta,
  MutableAtom,
  DerivedAtom,
  ModuleMeta,
  EffectMeta,
} from "./types";

/**
 * Information provided when a mutable atom is created.
 */
export interface MutableCreateInfo {
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
export interface DerivedCreateInfo {
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
 * Information provided when an effect is created.
 */
export interface EffectCreateInfo {
  /** Discriminator for effects */
  type: "effect";
  /** Optional key from effect options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from effect options */
  meta: EffectMeta | undefined;
  /** The created effect instance */
  effect: Effect;
}

/**
 * Union type for atom creation info (mutable or derived).
 */
export type CreateInfo =
  | MutableCreateInfo
  | DerivedCreateInfo
  | EffectCreateInfo;

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
 * **IMPORTANT**: Always use `.override()` to preserve the hook chain.
 * Direct assignment to `.current` will break existing handlers.
 *
 * @example Basic logging
 * ```ts
 * onCreateHook.override((prev) => (info) => {
 *   prev?.(info); // call existing handlers first
 *   console.log(`Created ${info.type}: ${info.key ?? "anonymous"}`);
 * });
 * ```
 *
 * @example DevTools integration
 * ```ts
 * const atoms = new Map();
 * const modules = new Map();
 *
 * onCreateHook.override((prev) => (info) => {
 *   prev?.(info); // preserve chain
 *   if (info.type === "module") {
 *     modules.set(info.key, info.module);
 *   } else {
 *     atoms.set(info.key, info.atom);
 *   }
 * });
 * ```
 *
 * @example Reset to default (disable all handlers)
 * ```ts
 * onCreateHook.reset();
 * ```
 */
export const onCreateHook =
  hook<(info: CreateInfo | ModuleCreateInfo) => void>();
