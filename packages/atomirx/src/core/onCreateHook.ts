import { Effect } from "./effect";
import { hook } from "./hook";
import {
  MutableAtomMeta,
  DerivedAtomMeta,
  MutableAtom,
  DerivedAtom,
  ModuleMeta,
  EffectMeta,
  PoolMeta,
  Pool,
} from "./types";

/**
 * Information provided when a mutable atom is created.
 */
export interface MutableInfo {
  /** Discriminator for mutable atoms */
  type: "mutable";
  /** Optional key from atom options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from atom options */
  meta: MutableAtomMeta | undefined;
  /** The created mutable atom instance */
  instance: MutableAtom<unknown>;
}

/**
 * Information provided when a derived atom is created.
 */
export interface DerivedInfo {
  /** Discriminator for derived atoms */
  type: "derived";
  /** Optional key from derived options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from derived options */
  meta: DerivedAtomMeta | undefined;
  /** The created derived atom instance */
  instance: DerivedAtom<unknown, boolean>;
}

/**
 * Information provided when an effect is created.
 */
export interface EffectInfo {
  /** Discriminator for effects */
  type: "effect";
  /** Optional key from effect options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from effect options */
  meta: EffectMeta | undefined;
  /** The created effect instance */
  instance: Effect;
}

/**
 * Union type for atom/derived/effect creation info.
 */
export type CreateInfo = MutableInfo | DerivedInfo | EffectInfo | PoolInfo;

/**
 * Information provided when a module (via define()) is created.
 */
export interface ModuleInfo {
  /** Discriminator for modules */
  type: "module";
  /** Optional key from define options (for debugging/devtools) */
  key: string | undefined;
  /** Optional metadata from define options */
  meta: ModuleMeta | undefined;
  /** The created module instance */
  instance: unknown;
}

/**
 * Information provided when a pool is created.
 */
export interface PoolInfo {
  /** Discriminator for pools */
  type: "pool";
  /** Optional key from pool options (for debugging/devtools) */
  key: string | undefined;

  /** Optional metadata from pool options */
  meta: PoolMeta | undefined;
  /** The created pool instance */
  instance: Pool<any, any>;
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
 * const registry = new Map();
 *
 * onCreateHook.override((prev) => (info) => {
 *   prev?.(info); // preserve chain
 *   registry.set(info.key, info.instance);
 * });
 * ```
 *
 * @example Reset to default (disable all handlers)
 * ```ts
 * onCreateHook.reset();
 * ```
 */
export const onCreateHook = hook<(info: CreateInfo | ModuleInfo) => void>();
