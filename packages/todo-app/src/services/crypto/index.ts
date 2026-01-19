/**
 * Crypto service module.
 *
 * @description
 * Provides encryption/decryption operations using WebCrypto API.
 *
 * @example
 * ```ts
 * import { getCryptoService } from "@/services/crypto";
 *
 * const crypto = getCryptoService();
 * const key = await crypto.generateKey();
 * const encrypted = await crypto.encrypt(key, "secret data");
 * const decrypted = await crypto.decrypt(key, encrypted);
 * ```
 */

export { createCryptoService, getCryptoService } from "./crypto.service";
export type { CryptoServiceImpl } from "./crypto.service";
export type {
  CryptoService,
  EncryptedField,
  KeyDerivationConfig,
  KeyGenerationResult,
  WrappedKey,
} from "./crypto.types";
