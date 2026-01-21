/**
 * Cryptography service using WebCrypto API.
 *
 * @description
 * Provides encryption/decryption operations using AES-256-GCM.
 * Supports key derivation from:
 * - PRF output (WebAuthn extension) via HKDF
 * - Password (fallback) via PBKDF2
 *
 * Security considerations:
 * - Uses authenticated encryption (GCM) to detect tampering
 * - Fresh IV generated for each encryption
 * - Keys are 256-bit for strong security
 * - No secrets stored in memory longer than necessary
 *
 * @example
 * ```ts
 * import { cryptoService } from "@/features/auth";
 *
 * const crypto = cryptoService();
 * const key = await crypto.generateKey();
 * const encrypted = await crypto.encrypt(key, "secret data");
 * ```
 */

import { define } from "atomirx";
import type {
  CryptoService,
  EncryptedField,
  KeyDerivationConfig,
  WrappedKey,
} from "../types/cryptoTypes";

// Re-export types that are used by other modules
export type { EncryptedField } from "../types/cryptoTypes";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/shared/utils";

/** AES-GCM configuration */
const AES_ALGORITHM = "AES-GCM";
const AES_KEY_LENGTH = 256;
const AES_IV_LENGTH = 12; // 96 bits recommended for GCM

/** PBKDF2 configuration */
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";

/** Default salt length */
const DEFAULT_SALT_LENGTH = 16;

/** HKDF info strings for domain separation */
const HKDF_INFO_ENCRYPTION = "todo-app-encryption-key-v1";

/**
 * Custom error for crypto operations.
 */
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CryptoError";
  }
}

/**
 * Helper to convert Uint8Array to BufferSource for WebCrypto APIs.
 * TypeScript's DOM types are overly strict about ArrayBufferLike vs ArrayBuffer.
 */
function toBufferSource(data: Uint8Array): BufferSource {
  return data as unknown as BufferSource;
}

/**
 * Cryptography service module.
 *
 * Provides encryption/decryption operations using AES-256-GCM.
 * Use `cryptoService()` to get the singleton instance.
 *
 * @example
 * ```ts
 * const crypto = cryptoService();
 * const key = await crypto.generateKey();
 * const encrypted = await crypto.encrypt(key, "secret data");
 * ```
 */
export const cryptoService = define((): CryptoService => {
  const subtle = globalThis.crypto.subtle;

  /**
   * Generate random bytes for salt or IV.
   *
   * @param length - Number of random bytes to generate (default: 16)
   * @returns Uint8Array containing cryptographically random bytes
   *
   * @example
   * ```ts
   * const salt = crypto.generateSalt(16);  // 16-byte salt
   * const iv = crypto.generateSalt(12);    // 12-byte IV for AES-GCM
   * ```
   */
  function generateSalt(length: number = DEFAULT_SALT_LENGTH): Uint8Array {
    const salt = new Uint8Array(length);
    globalThis.crypto.getRandomValues(salt);
    return salt;
  }

  /**
   * Generate a new random AES-256-GCM key.
   *
   * @returns A new extractable CryptoKey for AES-256-GCM encryption/decryption
   *
   * @example
   * ```ts
   * const key = await crypto.generateKey();
   * // Use key for encryption
   * const encrypted = await crypto.encrypt(key, "secret");
   * ```
   */
  async function generateKey(): Promise<CryptoKey> {
    return subtle.generateKey(
      {
        name: AES_ALGORITHM,
        length: AES_KEY_LENGTH,
      },
      true, // extractable (needed for wrapping)
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Derive encryption key from PRF output using HKDF.
   *
   * @description
   * Uses HKDF (HMAC-based Key Derivation Function) to derive a key from
   * the PRF extension output. HKDF is preferred over PBKDF2 here because
   * the PRF output is already high-entropy.
   *
   * @param prfOutput - Raw PRF output from WebAuthn authenticator
   * @param config - Key derivation configuration
   * @param config.salt - Salt bytes for HKDF (should be stored with credential)
   * @param config.info - Optional domain separation string (default: encryption key info)
   * @param config.keyLength - Optional key length in bits (default: 256)
   * @returns Derived AES-256-GCM CryptoKey
   *
   * @example
   * ```ts
   * const key = await crypto.deriveKeyFromPRF(prfOutput, {
   *   salt: storedCredential.prfSalt,
   * });
   * ```
   */
  async function deriveKeyFromPRF(
    prfOutput: ArrayBuffer,
    config: KeyDerivationConfig
  ): Promise<CryptoKey> {
    const {
      salt,
      info = HKDF_INFO_ENCRYPTION,
      keyLength = AES_KEY_LENGTH,
    } = config;

    // Ensure we have a proper Uint8Array
    const prfBytes = new Uint8Array(prfOutput);

    // Import PRF output as HKDF key material
    const keyMaterial = await subtle.importKey("raw", prfBytes, "HKDF", false, [
      "deriveKey",
    ]);

    // Derive AES key using HKDF
    return subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: toBufferSource(salt),
        info: new TextEncoder().encode(info),
      },
      keyMaterial,
      {
        name: AES_ALGORITHM,
        length: keyLength,
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Derive key encryption key from password using PBKDF2.
   *
   * @description
   * Used as fallback when PRF extension is not supported.
   * Uses high iteration count to slow down brute-force attacks.
   *
   * @param password - User-provided password
   * @param salt - Random salt bytes (should be stored for key recovery)
   * @param iterations - PBKDF2 iteration count (default: 100,000)
   * @returns Derived AES-256-GCM CryptoKey with wrap/unwrap permissions
   *
   * @example
   * ```ts
   * const salt = crypto.generateSalt(16);
   * const kek = await crypto.deriveKeyFromPassword("user-password", salt);
   * // Store salt securely for later key recovery
   * ```
   */
  async function deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    iterations: number = PBKDF2_ITERATIONS
  ): Promise<CryptoKey> {
    // Import password as PBKDF2 key material
    const keyMaterial = await subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // Derive AES key using PBKDF2
    return subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: toBufferSource(salt),
        iterations: iterations,
        hash: PBKDF2_HASH,
      },
      keyMaterial,
      {
        name: AES_ALGORITHM,
        length: AES_KEY_LENGTH,
      },
      true, // extractable (needed for key operations)
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   *
   * @description
   * Generates a fresh IV for each encryption to ensure security.
   * The IV is stored separately in the output for decryption.
   *
   * @param key - AES-256-GCM CryptoKey for encryption
   * @param plaintext - UTF-8 string to encrypt
   * @returns EncryptedField containing base64-encoded ciphertext and IV
   *
   * @example
   * ```ts
   * const encrypted = await crypto.encrypt(key, "secret data");
   * // Store encrypted.ciphertext and encrypted.iv together
   * ```
   */
  async function encrypt(
    key: CryptoKey,
    plaintext: string
  ): Promise<EncryptedField> {
    const iv = generateSalt(AES_IV_LENGTH);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    const ciphertext = await subtle.encrypt(
      {
        name: AES_ALGORITHM,
        iv: toBufferSource(iv),
      },
      key,
      plaintextBytes
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
    };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM.
   *
   * @param key - AES-256-GCM CryptoKey used for original encryption
   * @param encrypted - EncryptedField containing ciphertext and IV
   * @returns Decrypted UTF-8 plaintext string
   * @throws {CryptoError} If decryption fails (wrong key or tampered data)
   *
   * @example
   * ```ts
   * try {
   *   const plaintext = await crypto.decrypt(key, encrypted);
   * } catch (error) {
   *   if (error instanceof CryptoError) {
   *     console.error("Decryption failed:", error.message);
   *   }
   * }
   * ```
   */
  async function decrypt(
    key: CryptoKey,
    encrypted: EncryptedField
  ): Promise<string> {
    const iv = base64ToArrayBuffer(encrypted.iv);
    const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

    try {
      const plaintextBytes = await subtle.decrypt(
        {
          name: AES_ALGORITHM,
          iv: toBufferSource(iv),
        },
        key,
        toBufferSource(ciphertext)
      );

      return new TextDecoder().decode(plaintextBytes);
    } catch (error) {
      throw new CryptoError(
        "Decryption failed: invalid key or tampered data",
        error
      );
    }
  }

  /**
   * Wrap (encrypt) a data encryption key with a key encryption key.
   *
   * @description
   * Uses AES-GCM key wrapping. The wrapped key can be safely stored
   * and later unwrapped using the same KEK.
   *
   * @param kek - Key Encryption Key (derived from password or PRF)
   * @param dek - Data Encryption Key to wrap (the key used for encrypting data)
   * @returns WrappedKey containing encrypted key material, IV, and salt
   *
   * @example
   * ```ts
   * const dek = await crypto.generateKey();
   * const kek = await crypto.deriveKeyFromPassword("password", salt);
   * const wrapped = await crypto.wrapKey(kek, dek);
   * // Store wrapped key - can be recovered with same password + salt
   * ```
   */
  async function wrapKey(kek: CryptoKey, dek: CryptoKey): Promise<WrappedKey> {
    const iv = generateSalt(AES_IV_LENGTH);
    const salt = generateSalt(DEFAULT_SALT_LENGTH);

    // Need a wrapping key with wrapKey usage
    // Re-export and re-import KEK with wrapKey permission
    const kekRaw = await subtle.exportKey("raw", kek);
    const wrappingKey = await subtle.importKey(
      "raw",
      new Uint8Array(kekRaw),
      { name: AES_ALGORITHM },
      false,
      ["wrapKey"]
    );

    const wrappedKeyBuffer = await subtle.wrapKey("raw", dek, wrappingKey, {
      name: AES_ALGORITHM,
      iv: toBufferSource(iv),
    });

    return {
      wrappedKey: arrayBufferToBase64(wrappedKeyBuffer),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
    };
  }

  /**
   * Unwrap (decrypt) a data encryption key using a key encryption key.
   *
   * @param kek - Key Encryption Key (must match the one used for wrapping)
   * @param wrapped - WrappedKey containing encrypted key material
   * @returns The original Data Encryption Key
   * @throws {CryptoError} If unwrapping fails (wrong KEK or tampered data)
   *
   * @example
   * ```ts
   * try {
   *   const kek = await crypto.deriveKeyFromPassword("password", storedSalt);
   *   const dek = await crypto.unwrapKey(kek, storedWrappedKey);
   *   // Use dek for decryption
   * } catch (error) {
   *   if (error instanceof CryptoError) {
   *     console.error("Wrong password or corrupted key");
   *   }
   * }
   * ```
   */
  async function unwrapKey(
    kek: CryptoKey,
    wrapped: WrappedKey
  ): Promise<CryptoKey> {
    const iv = base64ToArrayBuffer(wrapped.iv);
    const wrappedKeyBuffer = base64ToArrayBuffer(wrapped.wrappedKey);

    // Need an unwrapping key with unwrapKey usage
    const kekRaw = await subtle.exportKey("raw", kek);
    const unwrappingKey = await subtle.importKey(
      "raw",
      new Uint8Array(kekRaw),
      { name: AES_ALGORITHM },
      false,
      ["unwrapKey"]
    );

    try {
      return subtle.unwrapKey(
        "raw",
        toBufferSource(wrappedKeyBuffer),
        unwrappingKey,
        {
          name: AES_ALGORITHM,
          iv: toBufferSource(iv),
        },
        {
          name: AES_ALGORITHM,
          length: AES_KEY_LENGTH,
        },
        true, // extractable
        ["encrypt", "decrypt"]
      );
    } catch (error) {
      throw new CryptoError(
        "Key unwrapping failed: invalid key encryption key",
        error
      );
    }
  }

  return {
    generateSalt,
    generateKey,
    deriveKeyFromPRF,
    deriveKeyFromPassword,
    encrypt,
    decrypt,
    wrapKey,
    unwrapKey,
  };
});
