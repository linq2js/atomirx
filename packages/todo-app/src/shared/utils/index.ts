/**
 * Shared utility functions.
 *
 * @example
 * ```ts
 * import { cn, generateId, now } from "@/shared/utils";
 * ```
 */

export {
  cn,
  generateId,
  now,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  sleep,
  debounce,
  formatDate,
  isSecureContext,
  isStandalonePWA,
} from "./utils";
