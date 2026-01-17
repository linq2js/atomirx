/**
 * A setup function that returns a release function.
 * Called by hook.use() to activate a hook, release restores previous value.
 */
export type HookSetup = () => VoidFunction;

/**
 * A hook is a callable factory that creates setup functions,
 * with direct access to current value via `.current`.
 *
 * @example
 * ```ts
 * const myHook = hook<string>("default");
 *
 * // Read current value (fast - direct property access)
 * console.log(myHook.current); // "default"
 *
 * // Create a setup function
 * const setup = myHook("new value");
 *
 * // Use with hook.use()
 * hook.use([myHook("temp")], () => {
 *   console.log(myHook.current); // "temp"
 * });
 * console.log(myHook.current); // "default" (restored)
 * ```
 */
export interface Hook<T> {
  /**
   * Creates a HookSetup that will set this hook to the given value.
   */
  (value: T): HookSetup;

  /**
   * Current value of the hook. Direct property access for fast reads.
   */
  current: T;

  /**
   * Override the current value directly.
   * Unlike the setup/release pattern, this is an immediate mutation.
   */
  override(value: T): void;

  reset(): void;
}

/**
 * Creates a new hook with an initial value.
 *
 * Hooks use the setup/release pattern for performance:
 * - Reads are direct property access (fastest)
 * - Writes use setup/release for proper nesting
 *
 * @param initial - Initial value for the hook
 * @returns A Hook instance
 *
 * @example
 * ```ts
 * // Create a hook
 * const countHook = hook(0);
 *
 * // Read
 * console.log(countHook.current); // 0
 *
 * // Use with hook.use()
 * hook.use([countHook(5)], () => {
 *   console.log(countHook.current); // 5
 * });
 * ```
 */
function createHook<T>(initial: T): Hook<T>;
function createHook<T>(): Hook<T | undefined>;
function createHook<T>(initial?: T): Hook<T | undefined> {
  // The hook function creates a setup that returns a release
  const h = Object.assign(
    (value: T | undefined): HookSetup => {
      return () => {
        const prev = h.current;
        h.current = value;
        return () => {
          h.current = prev;
        };
      };
    },
    {
      current: initial,
      // Override method for direct mutation
      override: (value: T | undefined) => {
        h.current = value;
      },
      reset: () => {
        h.current = initial;
      },
    }
  );

  return h as Hook<T | undefined>;
}

/**
 * Executes a function with multiple hooks temporarily set.
 *
 * @param setups - Array of HookSetup functions (from hook factories)
 * @param fn - Function to execute with hooks active
 * @returns The return value of fn
 *
 * @example
 * ```ts
 * hook.use([trackHook(myTracker), debugHook(true)], () => {
 *   // hooks active here
 * });
 * ```
 */
function use<T>(setups: HookSetup[], fn: () => T): T {
  const releases: VoidFunction[] = [];
  for (const setup of setups) {
    releases.push(setup());
  }
  try {
    return fn();
  } finally {
    for (const release of releases.reverse()) {
      release();
    }
  }
}

// Combine into namespace
export const hook = Object.assign(createHook, { use });
