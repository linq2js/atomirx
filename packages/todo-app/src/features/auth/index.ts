/**
 * Auth feature public API.
 *
 * @description
 * Provides passkey-based authentication with WebAuthn and PRF extension
 * for encryption key derivation.
 *
 * @example
 * ```ts
 * import { authStore, authService, cryptoService, AuthPage } from "@/features/auth";
 *
 * // Get store instance
 * const auth = authStore();
 *
 * // Check support
 * await auth.checkSupport();
 *
 * // Register or login
 * const result = await auth.register("user@example.com");
 * ```
 */

// Domain components
export { PasskeyPrompt, PasskeyError } from "./domain";
export type { PasskeyErrorProps } from "./domain";

// Services
export { authService, cryptoService, CryptoError } from "./services";

// Stores
export { authStore } from "./stores";
export type { User, AuthSupportInfo, AuthError } from "./stores";

// Pages
export { AuthPage } from "./pages";

// Types
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
  CryptoService,
  EncryptedField,
  KeyDerivationConfig,
  KeyGenerationResult,
  WrappedKey,
} from "./types";
