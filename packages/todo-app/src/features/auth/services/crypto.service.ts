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
} from "../types";
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
  constructor(message: string, public readonly cause?: unknown) {
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
   */
  function generateSalt(length: number = DEFAULT_SALT_LENGTH): Uint8Array {
    const salt = new Uint8Array(length);
    globalThis.crypto.getRandomValues(salt);
    return salt;
  }

  /**
   * Generate a new random AES-256-GCM key.
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
   */
  async function deriveKeyFromPRF(
    prfOutput: ArrayBuffer,
    config: KeyDerivationConfig
  ): Promise<CryptoKey> {
    const { salt, info = HKDF_INFO_ENCRYPTION, keyLength = AES_KEY_LENGTH } = config;

    // Ensure we have a proper Uint8Array
    const prfBytes = new Uint8Array(prfOutput);

    // Import PRF output as HKDF key material
    const keyMaterial = await subtle.importKey(
      "raw",
      prfBytes,
      "HKDF",
      false,
      ["deriveKey"]
    );

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
   * The IV is prepended to the ciphertext in the output.
   */
  async function encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedField> {
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
   * @throws CryptoError if decryption fails (wrong key or tampered data)
   */
  async function decrypt(key: CryptoKey, encrypted: EncryptedField): Promise<string> {
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
      throw new CryptoError("Decryption failed: invalid key or tampered data", error);
    }
  }

  /**
   * Wrap (encrypt) a data encryption key with a key encryption key.
   *
   * @description
   * Uses AES-GCM key wrapping. The wrapped key can be safely stored
   * and later unwrapped using the same KEK.
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

    const wrappedKeyBuffer = await subtle.wrapKey(
      "raw",
      dek,
      wrappingKey,
      {
        name: AES_ALGORITHM,
        iv: toBufferSource(iv),
      }
    );

    return {
      wrappedKey: arrayBufferToBase64(wrappedKeyBuffer),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
    };
  }

  /**
   * Unwrap (decrypt) a data encryption key using a key encryption key.
   *
   * @throws CryptoError if unwrapping fails (wrong KEK)
   */
  async function unwrapKey(kek: CryptoKey, wrapped: WrappedKey): Promise<CryptoKey> {
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
      throw new CryptoError("Key unwrapping failed: invalid key encryption key", error);
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
