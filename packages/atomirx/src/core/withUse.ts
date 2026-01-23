import type { Pipeable } from "./types";

/**
 * Adds a chainable `.use()` method to any object, enabling plugin-based transformations.
 *
 * The `.use()` method accepts a plugin function that receives the source object
 * and can return a transformed version. Supports several return patterns:
 *
 * - **Void/falsy**: Returns the original source unchanged (side-effect only plugins)
 * - **Object/function with `.use`**: Returns as-is (already chainable)
 * - **Object/function without `.use`**: Wraps with `withUse()` for continued chaining
 * - **Primitive**: Returns the value directly
 *
 * @template TSource - The type of the source object being enhanced
 * @param source - The object to add `.use()` method to
 * @returns The source object with `.use()` method attached
 *
 * @example
 * // Basic usage with atom tuple
 * const mappable = withUse([signal, setter]);
 * const transformed = mappable.use(([sig, set]) => ({
 *   sig,
 *   set: (v: string) => set(Number(v))
 * }));
 *
 * @example
 * // Chaining multiple transformations
 * atom(0)
 *   .use(([sig, set]) => [sig, (v: number) => set(v * 2)])
 *   .use(([sig, set]) => [sig, (v: number) => set(v + 1)]);
 *
 * @example
 * // Side-effect only plugin (returns void)
 * mappable.use((source) => {
 *   console.log('Source:', source);
 *   // returns undefined - original source is returned
 * });
 */
export function withUse<TSource extends object>(
  source: TSource
): TSource & Pipeable {
  return Object.assign(source, {
    use<TNew = void>(plugin: (source: NoInfer<TSource> | object) => TNew): any {
      if (typeof source === "object") {
        if (Array.isArray(plugin)) {
          return source;
        }
        return Object.assign(source, { ...plugin });
      }

      const result = plugin(source);
      // Void/falsy: return original source (side-effect only plugins)
      if (!result) return source;
      // Object or function: check if already has .use(), otherwise wrap
      if (typeof result === "object" || typeof result === "function") {
        if ("use" in result) {
          return result;
        }
        return withUse(result);
      }
      // Primitive values: return directly (not chainable)
      return result;
    },
  }) as TSource & Pipeable;
}
