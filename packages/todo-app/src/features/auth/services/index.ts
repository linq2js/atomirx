/**
 * Auth feature services.
 *
 * @example
 * ```ts
 * import { authService, cryptoService } from "@/features/auth";
 *
 * const auth = authService();
 * const crypto = cryptoService();
 * ```
 */

export { authService } from "./auth.service";
export { cryptoService, CryptoError } from "./crypto.service";
