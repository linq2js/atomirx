/**
 * Authentication service using WebAuthn/Passkeys.
 *
 * @description
 * Provides passkey-based authentication with PRF extension support
 * for deriving encryption keys directly from the authenticator.
 *
 * Features:
 * - Passkey registration with platform authenticator
 * - Passkey authentication with biometric verification
 * - PRF extension for key derivation (when supported)
 * - Graceful fallback for older browsers
 *
 * @example
 * ```ts
 * import { authService } from "@/features/auth";
 *
 * const auth = authService();
 * const support = await auth.checkSupport();
 *
 * if (support.webauthn) {
 *   const result = await auth.register({ username: "user@example.com" });
 * }
 * ```
 */

import { define } from "atomirx";
import type {
  AuthService,
  AuthSupport,
  AuthenticateOptions,
  AuthenticateResult,
  AuthenticateError,
  RegisterOptions,
  RegisterResult,
  RegisterError,
  AuthErrorCode,
} from "../types";
import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from "@/shared/utils";

/** Relying Party configuration */
const RP_NAME = "Secure Todo";
const RP_ID =
  typeof window !== "undefined" ? window.location.hostname : "localhost";

/** PRF salt for key derivation */
const PRF_SALT_PREFIX = "secure-todo-prf-v1";

/** Timeout for WebAuthn ceremonies (5 minutes) */
const CEREMONY_TIMEOUT = 300_000;

/**
 * Map DOMException to AuthErrorCode.
 */
function mapErrorCode(error: unknown): AuthErrorCode {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "NOT_ALLOWED";
      case "AbortError":
        return "TIMEOUT";
      case "InvalidStateError":
        return "INVALID_STATE";
      case "SecurityError":
        return "SECURITY_ERROR";
      case "NotSupportedError":
        return "NOT_SUPPORTED";
      default:
        return "UNKNOWN";
    }
  }
  return "UNKNOWN";
}

/**
 * Authentication service module.
 *
 * Provides passkey-based authentication with PRF extension support.
 * Use `authService()` to get the singleton instance.
 *
 * @example
 * ```ts
 * const auth = authService();
 * const support = await auth.checkSupport();
 *
 * if (support.webauthn) {
 *   const result = await auth.register({ username: "user@example.com" });
 * }
 * ```
 */
export const authService = define((): AuthService => {
  /**
   * Check what WebAuthn features are supported.
   */
  async function checkSupport(): Promise<AuthSupport> {
    // Check if WebAuthn is available
    if (typeof PublicKeyCredential === "undefined") {
      return {
        webauthn: false,
        platformAuthenticator: false,
        prfExtension: false,
        conditionalMediation: false,
      };
    }

    // Check platform authenticator support
    let platformAuthenticator = false;
    try {
      platformAuthenticator =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      // Not supported
    }

    // Check conditional mediation (autofill) support
    let conditionalMediation = false;
    try {
      if ("isConditionalMediationAvailable" in PublicKeyCredential) {
        conditionalMediation = await (
          PublicKeyCredential as typeof PublicKeyCredential & {
            isConditionalMediationAvailable: () => Promise<boolean>;
          }
        ).isConditionalMediationAvailable();
      }
    } catch {
      // Not supported
    }

    // PRF extension is available in Chrome 116+, Safari 18+, Edge 116+
    // We'll detect it during registration/authentication
    // For now, assume it's available if platform authenticator is available
    const prfExtension = platformAuthenticator;

    return {
      webauthn: true,
      platformAuthenticator,
      prfExtension,
      conditionalMediation,
    };
  }

  /**
   * Register a new passkey.
   */
  async function register(
    options: RegisterOptions
  ): Promise<RegisterResult | RegisterError> {
    const { username, requireBiometric = false } = options;

    // Check support
    if (typeof PublicKeyCredential === "undefined") {
      return {
        success: false,
        code: "NOT_SUPPORTED",
        message: "WebAuthn is not supported in this browser",
      };
    }

    try {
      // Generate user ID and challenge
      const userId = new Uint8Array(32);
      globalThis.crypto.getRandomValues(userId);

      const challenge = new Uint8Array(32);
      globalThis.crypto.getRandomValues(challenge);

      // Generate PRF salt
      const prfSalt = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfSalt);

      // Create PRF input with domain separation
      const prfInput = new TextEncoder().encode(
        `${PRF_SALT_PREFIX}:${arrayBufferToBase64Url(prfSalt.buffer as ArrayBuffer)}`
      );

      // Build credential creation options
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: RP_NAME,
          id: RP_ID,
        },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: requireBiometric ? "required" : "preferred",
          residentKey: "required",
          requireResidentKey: true,
        },
        timeout: CEREMONY_TIMEOUT,
        attestation: "none",
        extensions: {
          // PRF extension for key derivation
          prf: {
            eval: {
              first: prfInput,
            },
          },
        } as AuthenticationExtensionsClientInputs,
      };

      // Create credential
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        return {
          success: false,
          code: "CANCELLED",
          message: "Credential creation was cancelled",
        };
      }

      // Extract response
      const response = credential.response as AuthenticatorAttestationResponse;

      // Get public key
      const publicKey = response.getPublicKey?.();
      if (!publicKey) {
        return {
          success: false,
          code: "UNKNOWN",
          message: "Failed to extract public key from credential",
        };
      }

      // Check for PRF results
      const extensionResults = credential.getClientExtensionResults() as {
        prf?: { results?: { first?: ArrayBuffer } };
      };
      const prfOutput = extensionResults?.prf?.results?.first;

      return {
        success: true,
        credentialId: arrayBufferToBase64Url(credential.rawId),
        publicKey: arrayBufferToBase64Url(publicKey),
        prfOutput,
        prfSalt,
      };
    } catch (error) {
      const code = mapErrorCode(error);
      return {
        success: false,
        code,
        message: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }

  /**
   * Authenticate with an existing passkey.
   */
  async function authenticate(
    options?: AuthenticateOptions
  ): Promise<AuthenticateResult | AuthenticateError> {
    const { requireBiometric = false, allowCredentials } = options ?? {};

    // Check support
    if (typeof PublicKeyCredential === "undefined") {
      return {
        success: false,
        code: "NOT_SUPPORTED",
        message: "WebAuthn is not supported in this browser",
      };
    }

    try {
      // Generate challenge
      const challenge = new Uint8Array(32);
      globalThis.crypto.getRandomValues(challenge);

      // Build credential request options
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        rpId: RP_ID,
        userVerification: requireBiometric ? "required" : "preferred",
        timeout: CEREMONY_TIMEOUT,
        // PRF extension for key derivation
        extensions: {
          prf: {
            eval: {
              first: new TextEncoder().encode(PRF_SALT_PREFIX),
            },
          },
        } as AuthenticationExtensionsClientInputs,
      };

      // Add allowed credentials if provided
      if (allowCredentials && allowCredentials.length > 0) {
        publicKeyOptions.allowCredentials = allowCredentials.map((id) => ({
          type: "public-key" as const,
          id: base64UrlToArrayBuffer(id) as unknown as BufferSource,
          transports: ["internal" as AuthenticatorTransport],
        }));
      }

      // Get credential
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        return {
          success: false,
          code: "CANCELLED",
          message: "Authentication was cancelled",
        };
      }

      // Check for PRF results
      const extensionResults = credential.getClientExtensionResults() as {
        prf?: { results?: { first?: ArrayBuffer } };
      };
      const prfOutput = extensionResults?.prf?.results?.first;

      return {
        success: true,
        credentialId: arrayBufferToBase64Url(credential.rawId),
        prfOutput,
      };
    } catch (error) {
      const code = mapErrorCode(error);
      return {
        success: false,
        code,
        message:
          error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  /**
   * Check if user has any registered credentials.
   *
   * @description
   * This checks local storage/IndexedDB for stored credential metadata.
   * Note: This doesn't verify the credential is still valid with the authenticator.
   */
  async function hasCredentials(): Promise<boolean> {
    // TODO: Implement when storage service is ready
    // For now, return false (no credentials stored)
    return false;
  }

  return {
    checkSupport,
    register,
    authenticate,
    hasCredentials,
  };
});
