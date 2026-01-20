/**
 * @module authStore
 *
 * @description Manages authentication state using WebAuthn/Passkeys.
 * Handles login, logout, registration, and encryption key management.
 *
 * @atoms
 * - user$ - Current authenticated user (null if not logged in)
 * - authSupport$ - WebAuthn/PRF support status
 * - encryptionKey$ - CryptoKey for encrypting/decrypting todos
 * - authError$ - Last authentication error
 * - isLoading$ - Whether an auth operation is in progress
 *
 * @derived
 * - isAuthenticated$ - Whether user is logged in
 * - canUsePRF$ - Whether PRF extension is available
 *
 * @actions
 * - checkSupport() - Check WebAuthn support
 * - register(username) - Register a new passkey
 * - login() - Authenticate with existing passkey
 * - logout() - Clear session and encryption key
 * - clearError() - Clear last error
 *
 * @reactive-flow
 * register/login → [auth service] → user$ + encryptionKey$ → storage initialized
 * logout → user$ = null, encryptionKey$ = null → storage cleared
 */

import { atom, derived, define, batch, readonly } from "atomirx";
import { authService } from "../services/authService";
import { cryptoService } from "../services/cryptoService";
import { storageService } from "@/features/todos/services/storageService";
import { arrayBufferToBase64Url } from "@/shared/utils";

/** Session storage key for persisting auth state */
const SESSION_STORAGE_KEY = "secure-todo-session";

/** Session data stored in sessionStorage */
interface StoredSession {
  user: User;
  /** Exported CryptoKey in JWK format */
  keyJwk: JsonWebKey;
}

/**
 * User session information.
 */
export interface User {
  /** Username/display name */
  username: string;
  /** Credential ID (base64url) */
  credentialId: string;
  /** Whether PRF was used for key derivation */
  hasPRF: boolean;
}

/**
 * Auth support information.
 */
export interface AuthSupportInfo {
  /** Whether WebAuthn is supported */
  webauthn: boolean;
  /** Whether platform authenticator is available */
  platformAuthenticator: boolean;
  /** Whether PRF extension is supported */
  prfExtension: boolean;
  /** Whether conditional mediation is supported */
  conditionalMediation: boolean;
}

/**
 * Auth error with code and message.
 */
export interface AuthError {
  code: string;
  message: string;
}

/**
 * Authentication state module.
 *
 * @example
 * ```ts
 * const auth = authStore();
 *
 * // Check support on app start
 * await auth.checkSupport();
 *
 * // Register new user
 * const result = await auth.register("user@example.com");
 * if (result.success) {
 *   // User is now logged in with encryption key ready
 * }
 *
 * // Login existing user
 * const loginResult = await auth.login();
 * ```
 */
export const authStore = define(() => {
  // ┌─────────────────────────────────────────────────────────────┐
  // │ Dependency Graph:                                          │
  // │                                                            │
  // │  register/login                                            │
  // │        │                                                   │
  // │        ├──────────────────┬────────────────┐               │
  // │        ▼                  ▼                ▼               │
  // │     user$          encryptionKey$    authError$            │
  // │        │                  │                                │
  // │        ▼                  ▼                                │
  // │  isAuthenticated$   storage.initialize()                   │
  // │                                                            │
  // │  authSupport$ ────► canUsePRF$                             │
  // └─────────────────────────────────────────────────────────────┘

  const auth = authService();
  const crypto = cryptoService();
  const storage = storageService();

  // ─────────────────────────────────────────────────────────────
  // Atoms
  // ─────────────────────────────────────────────────────────────

  /**
   * Current authenticated user.
   * Null when not logged in.
   */
  const user$ = atom<User | null>(null, {
    meta: { key: "auth.user" },
  });

  /**
   * WebAuthn support information.
   * Null until checkSupport() is called.
   */
  const authSupport$ = atom<AuthSupportInfo | null>(null, {
    meta: { key: "auth.support" },
  });

  /**
   * Encryption key derived from passkey PRF or password.
   * Used to encrypt/decrypt todo content.
   * Null when not logged in.
   */
  const encryptionKey$ = atom<CryptoKey | null>(null, {
    meta: { key: "auth.encryptionKey" },
  });

  /**
   * Last authentication error.
   * Null when no error.
   */
  const authError$ = atom<AuthError | null>(null, {
    meta: { key: "auth.error" },
  });

  /**
   * Whether an auth operation is in progress.
   */
  const isLoading$ = atom<boolean>(false, {
    meta: { key: "auth.isLoading" },
  });

  // ─────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────

  /**
   * Whether user is currently authenticated.
   */
  const isAuthenticated$ = derived(({ read }) => read(user$) !== null, {
    meta: { key: "auth.isAuthenticated" },
  });

  /**
   * Whether PRF extension can be used.
   */
  const canUsePRF$ = derived(
    ({ read }) => {
      const support = read(authSupport$);
      return support?.prfExtension ?? false;
    },
    { meta: { key: "auth.canUsePRF" } }
  );

  // ─────────────────────────────────────────────────────────────
  // Session Persistence (sessionStorage for same-tab persistence)
  // ─────────────────────────────────────────────────────────────

  /**
   * Save session to sessionStorage.
   * Exports the CryptoKey to JWK format for serialization.
   */
  async function saveSession(user: User, key: CryptoKey): Promise<void> {
    try {
      const keyJwk = await globalThis.crypto.subtle.exportKey("jwk", key);
      const session: StoredSession = { user, keyJwk };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      // Silent fail - session persistence is optional
      console.warn("Failed to save session:", error);
    }
  }

  /**
   * Clear session from sessionStorage.
   */
  function clearSession(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Restore session from sessionStorage.
   * Returns true if session was restored successfully.
   *
   * Validates that the session's credential still exists in IndexedDB
   * before restoring, to prevent key mismatch issues.
   */
  async function restoreSession(): Promise<boolean> {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) {
        console.log("[Auth] No session found in sessionStorage");
        return false;
      }

      console.log("[Auth] Restoring session from sessionStorage...");
      const session: StoredSession = JSON.parse(stored);

      // Validate that the credential still exists in IndexedDB
      const storedCredentials = await storage.getCredentialsForLogin();
      const matchingCredential = storedCredentials.find(
        (c) => c.credentialId === session.user.credentialId
      );

      if (!matchingCredential) {
        console.warn(
          "[Auth] Session credential not found in storage, clearing session"
        );
        clearSession();
        return false;
      }

      // Import the key from JWK
      const key = await globalThis.crypto.subtle.importKey(
        "jwk",
        session.keyJwk,
        { name: "AES-GCM", length: 256 },
        true, // extractable
        ["encrypt", "decrypt"]
      );
      console.log("[Auth] Key imported from JWK");

      // Initialize storage with the restored key
      storage.initialize(key);
      console.log("[Auth] Storage initialized with restored key");

      // Set state (batch to trigger single notification)
      batch(() => {
        user$.set(session.user);
        encryptionKey$.set(key);
      });
      console.log(
        "[Auth] Session restored successfully for user:",
        session.user.username
      );

      return true;
    } catch (error) {
      // Session restore failed - clear invalid session
      console.error("[Auth] Failed to restore session:", error);
      clearSession();
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────

  /**
   * Check WebAuthn/PRF support in current browser.
   */
  async function checkSupport(): Promise<AuthSupportInfo> {
    const support = await auth.checkSupport();
    authSupport$.set(support);
    return support;
  }

  /**
   * Register a new passkey and initialize encryption.
   *
   * @param username - Display name for the credential
   * @returns Success with user info or error
   */
  async function register(
    username: string
  ): Promise<
    { success: true; user: User } | { success: false; error: AuthError }
  > {
    authError$.set(null);
    isLoading$.set(true);

    try {
      const result = await auth.register({ username });

      if (!result.success) {
        const error: AuthError = {
          code: result.code,
          message: result.message,
        };
        authError$.set(error);
        return { success: false, error };
      }

      // Derive encryption key from PRF output or generate new one
      let key: CryptoKey;
      if (result.prfOutput) {
        // Use PRF output to derive encryption key
        key = await crypto.deriveKeyFromPRF(result.prfOutput, {
          salt: result.prfSalt,
        });
      } else {
        // No PRF support - generate a random key
        // In a real app, we'd use password-based derivation here
        key = await crypto.generateKey();
      }

      // Initialize storage with encryption key
      storage.initialize(key);

      // Store credential for future logins
      await storage.storeCredential({
        credentialId: result.credentialId,
        publicKey: result.publicKey,
        displayName: username,
        prfSalt: arrayBufferToBase64Url(result.prfSalt.buffer as ArrayBuffer),
        hasPRF: !!result.prfOutput,
      });

      // Set user state (batch to trigger single notification)
      const user: User = {
        username,
        credentialId: result.credentialId,
        hasPRF: !!result.prfOutput,
      };
      batch(() => {
        user$.set(user);
        encryptionKey$.set(key);
      });

      // Save session for persistence across refresh
      await saveSession(user, key);

      return { success: true, user };
    } catch (error) {
      const authErr: AuthError = {
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Registration failed",
      };
      authError$.set(authErr);
      return { success: false, error: authErr };
    } finally {
      isLoading$.set(false);
    }
  }

  /**
   * Authenticate with an existing passkey.
   *
   * @returns Success with user info or error
   */
  async function login(): Promise<
    { success: true; user: User } | { success: false; error: AuthError }
  > {
    authError$.set(null);
    isLoading$.set(true);

    try {
      // Get stored credentials to find PRF salt (doesn't require initialization)
      const credentials = await storage.getCredentialsForLogin();
      const allowCredentials = credentials.map((c) => c.credentialId);

      const result = await auth.authenticate({ allowCredentials });

      if (!result.success) {
        const error: AuthError = {
          code: result.code,
          message: result.message,
        };
        authError$.set(error);
        return { success: false, error };
      }

      // Find the credential that was used
      const usedCredential = credentials.find(
        (c) => c.credentialId === result.credentialId
      );

      if (!usedCredential) {
        const error: AuthError = {
          code: "CREDENTIAL_NOT_FOUND",
          message: "Credential not found in local storage",
        };
        authError$.set(error);
        return { success: false, error };
      }

      // Derive encryption key
      let key: CryptoKey;
      if (result.prfOutput && usedCredential.hasPRF) {
        // Use PRF output with stored salt
        const saltBuffer = Uint8Array.from(
          atob(usedCredential.prfSalt.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0)
        );
        key = await crypto.deriveKeyFromPRF(result.prfOutput, {
          salt: saltBuffer,
        });
      } else {
        // No PRF - would need password fallback in real app
        // For now, generate a new key (data won't be recoverable)
        key = await crypto.generateKey();
      }

      // Initialize storage with encryption key
      storage.initialize(key);

      // Update last used timestamp
      await storage.updateCredentialLastUsed(result.credentialId);

      // Set user state (batch to trigger single notification)
      const user: User = {
        username: usedCredential.displayName,
        credentialId: result.credentialId,
        hasPRF: !!result.prfOutput,
      };
      batch(() => {
        user$.set(user);
        encryptionKey$.set(key);
      });

      // Save session for persistence across refresh
      await saveSession(user, key);

      return { success: true, user };
    } catch (error) {
      const authErr: AuthError = {
        code: "UNKNOWN",
        message:
          error instanceof Error ? error.message : "Authentication failed",
      };
      authError$.set(authErr);
      return { success: false, error: authErr };
    } finally {
      isLoading$.set(false);
    }
  }

  /**
   * Log out and clear session.
   * Clears user state and encryption key from memory.
   * Does NOT clear stored data.
   */
  function logout(): void {
    batch(() => {
      user$.set(null);
      encryptionKey$.set(null);
      authError$.set(null);
    });
    clearSession();
  }

  /**
   * Clear the last error.
   */
  function clearError(): void {
    authError$.set(null);
  }

  /**
   * Check if there are any stored credentials.
   * Uses getCredentialsForLogin() which doesn't require initialization.
   */
  async function hasStoredCredentials(): Promise<boolean> {
    try {
      const credentials = await storage.getCredentialsForLogin();
      return credentials.length > 0;
    } catch {
      return false;
    }
  }

  return {
    // Read-only state (prevents external mutations)
    ...readonly({
      user$,
      authSupport$,
      encryptionKey$,
      authError$,
      isLoading$,
    }),

    // Derived state (already read-only by nature)
    isAuthenticated$,
    canUsePRF$,

    // Actions
    checkSupport,
    register,
    login,
    logout,
    clearError,
    hasStoredCredentials,
    restoreSession,
  };
});
