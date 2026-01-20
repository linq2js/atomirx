/**
 * Crypto service module.
 *
 * @description
 * Provides encryption/decryption operations using WebCrypto API.
 *
 * @example
 * ```ts
 * import { cryptoService } from "@/services/crypto";
 *
 * const crypto = cryptoService();
 * const key = await crypto.generateKey();
 * const encrypted = await crypto.encrypt(key, "secret data");
 * const decrypted = await crypto.decrypt(key, encrypted);
 * ```
 */

export { cryptoService } from "./crypto.service";
export { CryptoError } from "./crypto.service";
export type {
  CryptoService,
  EncryptedField,
  KeyDerivationConfig,
  KeyGenerationResult,
  WrappedKey,
} from "./crypto.types";
