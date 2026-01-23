/**
 * Types for the cryptography service.
 *
 * @description
 * Defines interfaces for encryption/decryption operations using WebCrypto API.
 * Uses AES-256-GCM for authenticated encryption.
 */

/**
 * Encrypted field containing ciphertext and initialization vector.
 */
export interface EncryptedField {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded IV (12 bytes for AES-GCM) */
  iv: string;
}

/**
 * Configuration for key derivation.
 */
export interface KeyDerivationConfig {
  /** Salt for HKDF/PBKDF2 (raw bytes) */
  salt: Uint8Array;
  /** Info string for HKDF (context binding) */
  info?: string;
  /** Key length in bits (default: 256) */
  keyLength?: number;
}

/**
 * Result of generating a new encryption key.
 */
export interface KeyGenerationResult {
  /** The generated CryptoKey for encryption/decryption */
  key: CryptoKey;
  /** Salt used in key derivation (store this!) */
  salt: Uint8Array;
}

/**
 * Wrapped key for storage (used in non-PRF fallback).
 */
export interface WrappedKey {
  /** Base64-encoded wrapped key material */
  wrappedKey: string;
  /** Base64-encoded IV used for wrapping */
  iv: string;
  /** Salt used for KEK derivation */
  salt: string;
}

/**
 * Crypto service interface.
 */
export interface CryptoService {
  /**
   * Generate a new random encryption key.
   */
  generateKey(): Promise<CryptoKey>;

  /**
   * Derive an encryption key from PRF output using HKDF.
   *
   * @param prfOutput - Raw bytes from WebAuthn PRF extension
   * @param config - Key derivation configuration
   * @returns Derived CryptoKey
   */
  deriveKeyFromPRF(
    prfOutput: ArrayBuffer,
    config: KeyDerivationConfig
  ): Promise<CryptoKey>;

  /**
   * Derive a key encryption key (KEK) from a password using PBKDF2.
   * Used as fallback when PRF is not supported.
   *
   * @param password - User's password
   * @param salt - Salt for PBKDF2
   * @param iterations - Number of iterations (default: 100000)
   * @returns Derived CryptoKey for wrapping/unwrapping
   */
  deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    iterations?: number
  ): Promise<CryptoKey>;

  /**
   * Encrypt a plaintext string.
   *
   * @param key - CryptoKey for encryption
   * @param plaintext - String to encrypt
   * @returns Encrypted field with ciphertext and IV
   */
  encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedField>;

  /**
   * Decrypt an encrypted field.
   *
   * @param key - CryptoKey for decryption
   * @param encrypted - Encrypted field to decrypt
   * @returns Decrypted plaintext string
   * @throws Error if decryption fails (wrong key or tampered data)
   */
  decrypt(key: CryptoKey, encrypted: EncryptedField): Promise<string>;

  /**
   * Wrap (encrypt) a data encryption key (DEK) with a key encryption key (KEK).
   *
   * @param kek - Key encryption key
   * @param dek - Data encryption key to wrap
   * @returns Wrapped key for storage
   */
  wrapKey(kek: CryptoKey, dek: CryptoKey): Promise<WrappedKey>;

  /**
   * Unwrap (decrypt) a data encryption key (DEK) using a key encryption key (KEK).
   *
   * @param kek - Key encryption key
   * @param wrapped - Wrapped key from storage
   * @returns Unwrapped data encryption key
   * @throws Error if unwrapping fails
   */
  unwrapKey(kek: CryptoKey, wrapped: WrappedKey): Promise<CryptoKey>;

  /**
   * Generate a random salt for key derivation.
   *
   * @param length - Salt length in bytes (default: 16)
   * @returns Random salt
   */
  generateSalt(length?: number): Uint8Array;
}
