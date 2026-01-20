/**
 * Network feature public API.
 *
 * @example
 * ```ts
 * import { networkStore } from "@/features/network";
 *
 * const network = networkStore();
 * const isOnline = network.isOnline$.get();
 * ```
 */

export { networkStore } from "./stores";
