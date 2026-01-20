import { describe, it, expect, beforeEach } from "vitest";
import { cryptoService } from "./crypto.service";
import type { CryptoService, EncryptedField } from "../types/crypto.types";

describe("CryptoService", () => {
  let crypto: CryptoService;

  beforeEach(() => {
    // Reset and get fresh instance
    cryptoService.reset();
    crypto = cryptoService();
  });

  describe("generateSalt", () => {
    it("should generate salt of default length (16 bytes)", () => {
      const salt = crypto.generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it("should generate salt of custom length", () => {
      const salt = crypto.generateSalt(32);
      expect(salt.length).toBe(32);
    });

    it("should generate unique salts", () => {
      const salt1 = crypto.generateSalt();
      const salt2 = crypto.generateSalt();
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe("generateKey", () => {
    it("should generate a valid AES-GCM key", async () => {
      const key = await crypto.generateKey();

      expect(key).toBeDefined();
      expect(key.type).toBe("secret");
      expect(key.algorithm.name).toBe("AES-GCM");
      expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
      expect(key.extractable).toBe(true);
      expect(key.usages).toContain("encrypt");
      expect(key.usages).toContain("decrypt");
    });

    it("should generate unique keys", async () => {
      const key1 = await crypto.generateKey();
      const key2 = await crypto.generateKey();

      const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
      const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
    });
  });

  describe("deriveKeyFromPRF", () => {
    it("should derive a key from PRF output", async () => {
      // Simulate PRF output (32 bytes)
      const prfOutput = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfOutput);
      const salt = crypto.generateSalt();

      const key = await crypto.deriveKeyFromPRF(prfOutput.buffer, { salt });

      expect(key).toBeDefined();
      expect(key.type).toBe("secret");
      expect(key.algorithm.name).toBe("AES-GCM");
    });

    it("should derive the same key from same inputs", async () => {
      const prfOutput = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfOutput);
      const salt = crypto.generateSalt();

      const key1 = await crypto.deriveKeyFromPRF(prfOutput.buffer, { salt });
      const key2 = await crypto.deriveKeyFromPRF(prfOutput.buffer, { salt });

      const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
      const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

      expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
    });

    it("should derive different keys with different salts", async () => {
      const prfOutput = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfOutput);
      const salt1 = crypto.generateSalt();
      const salt2 = crypto.generateSalt();

      const key1 = await crypto.deriveKeyFromPRF(prfOutput.buffer, {
        salt: salt1,
      });
      const key2 = await crypto.deriveKeyFromPRF(prfOutput.buffer, {
        salt: salt2,
      });

      const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
      const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
    });
  });

  describe("deriveKeyFromPassword", () => {
    it("should derive a key from password", async () => {
      const password = "test-password-123";
      const salt = crypto.generateSalt();

      const key = await crypto.deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.type).toBe("secret");
      expect(key.algorithm.name).toBe("AES-GCM");
    });

    it("should derive same key from same password and salt", async () => {
      const password = "test-password-123";
      const salt = crypto.generateSalt();

      const key1 = await crypto.deriveKeyFromPassword(password, salt);
      const key2 = await crypto.deriveKeyFromPassword(password, salt);

      const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
      const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

      expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
    });

    it("should derive different keys with different passwords", async () => {
      const salt = crypto.generateSalt();

      const key1 = await crypto.deriveKeyFromPassword("password1", salt);
      const key2 = await crypto.deriveKeyFromPassword("password2", salt);

      const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
      const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
    });
  });

  describe("encrypt/decrypt", () => {
    let key: CryptoKey;

    beforeEach(async () => {
      key = await crypto.generateKey();
    });

    it("should encrypt and decrypt plaintext", async () => {
      const plaintext = "Hello, World!";

      const encrypted = await crypto.encrypt(key, plaintext);
      const decrypted = await crypto.decrypt(key, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt to different ciphertext each time (random IV)", async () => {
      const plaintext = "Hello, World!";

      const encrypted1 = await crypto.encrypt(key, plaintext);
      const encrypted2 = await crypto.encrypt(key, plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it("should handle empty string", async () => {
      const plaintext = "";

      const encrypted = await crypto.encrypt(key, plaintext);
      const decrypted = await crypto.decrypt(key, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", async () => {
      const plaintext = "Hello, 世界! 🎉";

      const encrypted = await crypto.encrypt(key, plaintext);
      const decrypted = await crypto.decrypt(key, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", async () => {
      const plaintext = "a".repeat(10000);

      const encrypted = await crypto.encrypt(key, plaintext);
      const decrypted = await crypto.decrypt(key, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should fail decryption with wrong key", async () => {
      const plaintext = "Hello, World!";
      const wrongKey = await crypto.generateKey();

      const encrypted = await crypto.encrypt(key, plaintext);

      await expect(crypto.decrypt(wrongKey, encrypted)).rejects.toThrow();
    });

    it("should fail decryption with tampered ciphertext", async () => {
      const plaintext = "Hello, World!";
      const encrypted = await crypto.encrypt(key, plaintext);

      // Tamper with ciphertext
      const tampered: EncryptedField = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, -4) + "XXXX",
      };

      await expect(crypto.decrypt(key, tampered)).rejects.toThrow();
    });

    it("should fail decryption with tampered IV", async () => {
      const plaintext = "Hello, World!";
      const encrypted = await crypto.encrypt(key, plaintext);

      // Tamper with IV
      const tampered: EncryptedField = {
        ...encrypted,
        iv: "AAAAAAAAAAAAAAAA", // Different IV
      };

      await expect(crypto.decrypt(key, tampered)).rejects.toThrow();
    });
  });

  describe("wrapKey/unwrapKey", () => {
    let kek: CryptoKey;
    let dek: CryptoKey;

    beforeEach(async () => {
      // KEK derived from password (simulating user auth)
      const salt = crypto.generateSalt();
      kek = await crypto.deriveKeyFromPassword("master-password", salt);
      // DEK is the actual encryption key
      dek = await crypto.generateKey();
    });

    it("should wrap and unwrap a key", async () => {
      const wrapped = await crypto.wrapKey(kek, dek);
      const unwrapped = await crypto.unwrapKey(kek, wrapped);

      // Verify keys are equivalent by encrypting/decrypting
      const plaintext = "test data";
      const encrypted = await crypto.encrypt(dek, plaintext);
      const decrypted = await crypto.decrypt(unwrapped, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different wrapped output each time (random IV)", async () => {
      const wrapped1 = await crypto.wrapKey(kek, dek);
      const wrapped2 = await crypto.wrapKey(kek, dek);

      expect(wrapped1.wrappedKey).not.toBe(wrapped2.wrappedKey);
      expect(wrapped1.iv).not.toBe(wrapped2.iv);
    });

    it("should fail unwrap with wrong KEK", async () => {
      const wrongKek = await crypto.deriveKeyFromPassword(
        "wrong-password",
        crypto.generateSalt()
      );

      const wrapped = await crypto.wrapKey(kek, dek);

      await expect(crypto.unwrapKey(wrongKek, wrapped)).rejects.toThrow();
    });

    it("should include salt in wrapped key for storage", async () => {
      const wrapped = await crypto.wrapKey(kek, dek);

      expect(wrapped.salt).toBeDefined();
      expect(typeof wrapped.salt).toBe("string");
      expect(wrapped.salt.length).toBeGreaterThan(0);
    });
  });

  describe("integration: full encryption flow", () => {
    it("should encrypt/decrypt with PRF-derived key", async () => {
      // Simulate PRF output from WebAuthn
      const prfOutput = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfOutput);
      const salt = crypto.generateSalt();

      // Derive key
      const key = await crypto.deriveKeyFromPRF(prfOutput.buffer, { salt });

      // Encrypt
      const plaintext = "My secret todo item";
      const encrypted = await crypto.encrypt(key, plaintext);

      // Later: derive same key and decrypt
      const key2 = await crypto.deriveKeyFromPRF(prfOutput.buffer, { salt });
      const decrypted = await crypto.decrypt(key2, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt/decrypt with password fallback flow", async () => {
      const password = "user-password-123";
      const salt = crypto.generateSalt();

      // Derive KEK from password
      const kek = await crypto.deriveKeyFromPassword(password, salt);

      // Generate DEK
      const dek = await crypto.generateKey();

      // Wrap DEK for storage
      const wrapped = await crypto.wrapKey(kek, dek);

      // Encrypt data
      const plaintext = "My secret todo item";
      const encrypted = await crypto.encrypt(dek, plaintext);

      // Later: derive KEK from password, unwrap DEK, decrypt
      const kek2 = await crypto.deriveKeyFromPassword(password, salt);
      const dek2 = await crypto.unwrapKey(kek2, wrapped);
      const decrypted = await crypto.decrypt(dek2, encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
