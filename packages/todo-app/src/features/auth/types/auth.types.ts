/**
 * Types for the authentication service using WebAuthn/Passkeys.
 *
 * @description
 * Defines interfaces for passkey-based authentication with PRF extension
 * support for encryption key derivation.
 */

/**
 * Result of checking WebAuthn/PRF support in the browser.
 */
export interface AuthSupport {
  /** Whether WebAuthn is supported at all */
  webauthn: boolean;
  /** Whether platform authenticator (biometric) is available */
  platformAuthenticator: boolean;
  /** Whether PRF extension is supported for key derivation */
  prfExtension: boolean;
  /** Whether conditional mediation (autofill) is supported */
  conditionalMediation: boolean;
}

/**
 * Options for passkey registration.
 */
export interface RegisterOptions {
  /** Display name for the credential */
  username: string;
  /** Whether to require biometric verification */
  requireBiometric?: boolean;
}

/**
 * Result of successful passkey registration.
 */
export interface RegisterResult {
  /** Whether registration was successful */
  success: true;
  /** Credential ID (base64url encoded) */
  credentialId: string;
  /** Public key (base64url encoded) */
  publicKey: string;
  /** PRF output for key derivation (if PRF supported) */
  prfOutput?: ArrayBuffer;
  /** Salt used for PRF evaluation */
  prfSalt: Uint8Array;
}

/**
 * Result of failed passkey registration.
 */
export interface RegisterError {
  /** Whether registration was successful */
  success: false;
  /** Error code */
  code: AuthErrorCode;
  /** Error message */
  message: string;
}

/**
 * Options for passkey authentication.
 */
export interface AuthenticateOptions {
  /** Whether to require biometric verification */
  requireBiometric?: boolean;
  /** Credential IDs to allow (if known) */
  allowCredentials?: string[];
}

/**
 * Result of successful passkey authentication.
 */
export interface AuthenticateResult {
  /** Whether authentication was successful */
  success: true;
  /** Credential ID used (base64url encoded) */
  credentialId: string;
  /** PRF output for key derivation (if PRF supported) */
  prfOutput?: ArrayBuffer;
}

/**
 * Result of failed passkey authentication.
 */
export interface AuthenticateError {
  /** Whether authentication was successful */
  success: false;
  /** Error code */
  code: AuthErrorCode;
  /** Error message */
  message: string;
}

/**
 * Error codes for authentication operations.
 */
export type AuthErrorCode =
  | "NOT_SUPPORTED"
  | "CANCELLED"
  | "TIMEOUT"
  | "INVALID_STATE"
  | "NOT_ALLOWED"
  | "SECURITY_ERROR"
  | "UNKNOWN";

/**
 * Stored credential information.
 */
export interface StoredCredential {
  /** Credential ID (base64url encoded) */
  credentialId: string;
  /** Public key (base64url encoded) */
  publicKey: string;
  /** Display name */
  displayName: string;
  /** Salt used for PRF evaluation */
  prfSalt: string;
  /** Whether PRF was supported when registered */
  hasPRF: boolean;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when last used */
  lastUsedAt: number;
}

/**
 * Auth service interface.
 */
export interface AuthService {
  /**
   * Check what WebAuthn features are supported.
   */
  checkSupport(): Promise<AuthSupport>;

  /**
   * Register a new passkey.
   *
   * @param options - Registration options
   * @returns Registration result or error
   */
  register(options: RegisterOptions): Promise<RegisterResult | RegisterError>;

  /**
   * Authenticate with an existing passkey.
   *
   * @param options - Authentication options
   * @returns Authentication result or error
   */
  authenticate(
    options?: AuthenticateOptions
  ): Promise<AuthenticateResult | AuthenticateError>;

  /**
   * Check if user has any registered credentials.
   */
  hasCredentials(): Promise<boolean>;
}
