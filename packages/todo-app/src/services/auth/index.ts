/**
 * Auth service module.
 *
 * @description
 * Provides passkey-based authentication with PRF extension support.
 *
 * @example
 * ```ts
 * import { authService } from "@/services/auth";
 *
 * const auth = authService();
 * const support = await auth.checkSupport();
 *
 * if (support.webauthn && support.platformAuthenticator) {
 *   const result = await auth.register({ username: "user@example.com" });
 *   if (result.success) {
 *     // Use result.prfOutput with crypto service for key derivation
 *   }
 * }
 * ```
 */

export { authService } from "./auth.service";
export type {
  AuthService,
  AuthSupport,
  AuthenticateOptions,
  AuthenticateResult,
  AuthenticateError,
  RegisterOptions,
  RegisterResult,
  RegisterError,
  AuthErrorCode,
  StoredCredential,
} from "./auth.types";
