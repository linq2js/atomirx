import { describe, it, expect, beforeEach, vi } from "vitest";
import { authService } from "./auth.service";
import type { AuthSupport, AuthService } from "./auth.types";

// Get mocks from setup file - cast through unknown to satisfy TypeScript
const mockCredentials = globalThis.navigator.credentials as unknown as {
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const mockPublicKeyCredential = globalThis.PublicKeyCredential as unknown as {
  isUserVerifyingPlatformAuthenticatorAvailable: ReturnType<typeof vi.fn>;
  isConditionalMediationAvailable: ReturnType<typeof vi.fn>;
};

describe("AuthService", () => {
  let auth: AuthService;
  let originalPublicKeyCredential: typeof PublicKeyCredential | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original for tests that delete it
    originalPublicKeyCredential = globalThis.PublicKeyCredential;

    // Reset mock implementations
    mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
    mockPublicKeyCredential.isConditionalMediationAvailable.mockResolvedValue(true);

    // Reset and get fresh instance
    authService.reset();
    auth = authService();
  });

  afterEach(() => {
    // Restore PublicKeyCredential if it was deleted
    if (originalPublicKeyCredential && !globalThis.PublicKeyCredential) {
      (globalThis as { PublicKeyCredential?: typeof PublicKeyCredential }).PublicKeyCredential = originalPublicKeyCredential;
    }
  });

  describe("checkSupport", () => {
    it("should return full support when all features available", async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
        true
      );
      mockPublicKeyCredential.isConditionalMediationAvailable.mockResolvedValue(
        true
      );

      const support = await auth.checkSupport();

      expect(support).toEqual<AuthSupport>({
        webauthn: true,
        platformAuthenticator: true,
        prfExtension: true, // Assumed based on modern browser
        conditionalMediation: true,
      });
    });

    it("should return partial support when platform authenticator unavailable", async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
        false
      );
      mockPublicKeyCredential.isConditionalMediationAvailable.mockResolvedValue(
        true
      );

      const support = await auth.checkSupport();

      expect(support.platformAuthenticator).toBe(false);
      expect(support.webauthn).toBe(true);
    });

    it("should return no support when PublicKeyCredential unavailable", async () => {
      // @ts-expect-error - simulate unsupported browser
      delete globalThis.PublicKeyCredential;

      const support = await auth.checkSupport();

      expect(support).toEqual<AuthSupport>({
        webauthn: false,
        platformAuthenticator: false,
        prfExtension: false,
        conditionalMediation: false,
      });
    });
  });

  describe("register", () => {
    beforeEach(() => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
        true
      );
    });

    it("should register a new passkey successfully", async () => {
      const mockCredential = createMockCredential();
      mockCredentials.create.mockResolvedValue(mockCredential);

      const result = await auth.register({ username: "testuser" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.credentialId).toBeDefined();
        expect(result.publicKey).toBeDefined();
        expect(result.prfSalt).toBeInstanceOf(Uint8Array);
      }
    });

    it("should include PRF output when supported", async () => {
      const prfOutput = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfOutput);

      const mockCredential = createMockCredential({
        prfResults: {
          first: prfOutput.buffer,
        },
      });
      mockCredentials.create.mockResolvedValue(mockCredential);

      const result = await auth.register({ username: "testuser" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.prfOutput).toBeDefined();
        expect(result.prfOutput).toBeInstanceOf(ArrayBuffer);
      }
    });

    it("should return error when user cancels", async () => {
      mockCredentials.create.mockRejectedValue(
        new DOMException("User cancelled", "NotAllowedError")
      );

      const result = await auth.register({ username: "testuser" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("NOT_ALLOWED");
      }
    });

    it("should return error when WebAuthn not supported", async () => {
      // @ts-expect-error - simulate unsupported browser
      delete globalThis.PublicKeyCredential;

      const result = await auth.register({ username: "testuser" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("NOT_SUPPORTED");
      }
    });

    it("should pass correct options to credentials.create", async () => {
      const mockCredential = createMockCredential();
      mockCredentials.create.mockResolvedValue(mockCredential);

      await auth.register({ username: "testuser", requireBiometric: true });

      expect(mockCredentials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            rp: expect.objectContaining({
              name: expect.any(String),
            }),
            user: expect.objectContaining({
              name: "testuser",
              displayName: "testuser",
            }),
            pubKeyCredParams: expect.arrayContaining([
              expect.objectContaining({ type: "public-key" }),
            ]),
            authenticatorSelection: expect.objectContaining({
              userVerification: "required",
            }),
          }),
        })
      );
    });
  });

  describe("authenticate", () => {
    beforeEach(() => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
        true
      );
    });

    it("should authenticate successfully", async () => {
      const mockAssertion = createMockAssertion();
      mockCredentials.get.mockResolvedValue(mockAssertion);

      const result = await auth.authenticate();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.credentialId).toBeDefined();
      }
    });

    it("should include PRF output when supported", async () => {
      const prfOutput = new Uint8Array(32);
      globalThis.crypto.getRandomValues(prfOutput);

      const mockAssertion = createMockAssertion({
        prfResults: {
          first: prfOutput.buffer,
        },
      });
      mockCredentials.get.mockResolvedValue(mockAssertion);

      const result = await auth.authenticate();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.prfOutput).toBeDefined();
      }
    });

    it("should return error when user cancels", async () => {
      mockCredentials.get.mockRejectedValue(
        new DOMException("User cancelled", "NotAllowedError")
      );

      const result = await auth.authenticate();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("NOT_ALLOWED");
      }
    });

    it("should return error when timeout", async () => {
      mockCredentials.get.mockRejectedValue(
        new DOMException("Timeout", "AbortError")
      );

      const result = await auth.authenticate();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("TIMEOUT");
      }
    });

    it("should pass allowCredentials when provided", async () => {
      const mockAssertion = createMockAssertion();
      mockCredentials.get.mockResolvedValue(mockAssertion);

      const credentialIds = ["cred-1", "cred-2"];
      await auth.authenticate({ allowCredentials: credentialIds });

      expect(mockCredentials.get).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            allowCredentials: expect.arrayContaining([
              expect.objectContaining({ type: "public-key" }),
            ]),
          }),
        })
      );
    });
  });

  describe("hasCredentials", () => {
    it("should return false when no credentials stored", async () => {
      const hasCredentials = await auth.hasCredentials();
      expect(hasCredentials).toBe(false);
    });

    // Note: Full credential storage tests would require IndexedDB mocking
    // which will be tested in integration tests
  });
});

// Helper to create mock credential for registration
function createMockCredential(
  extensionResults?: { prfResults?: { first: ArrayBuffer } }
) {
  const id = new Uint8Array(32);
  globalThis.crypto.getRandomValues(id);

  return {
    id: id.buffer,
    rawId: id.buffer,
    type: "public-key",
    response: {
      clientDataJSON: new TextEncoder().encode(
        JSON.stringify({
          type: "webauthn.create",
          challenge: "test",
          origin: "http://localhost",
        })
      ),
      attestationObject: new Uint8Array(100).buffer,
      getPublicKey: () => new Uint8Array(65).buffer,
      getAuthenticatorData: () => new Uint8Array(37).buffer,
    },
    getClientExtensionResults: () => ({
      prf: extensionResults?.prfResults ? { results: extensionResults.prfResults } : undefined,
    }),
    authenticatorAttachment: "platform",
  };
}

// Helper to create mock assertion for authentication
function createMockAssertion(
  extensionResults?: { prfResults?: { first: ArrayBuffer } }
) {
  const id = new Uint8Array(32);
  globalThis.crypto.getRandomValues(id);

  return {
    id: id.buffer,
    rawId: id.buffer,
    type: "public-key",
    response: {
      clientDataJSON: new TextEncoder().encode(
        JSON.stringify({
          type: "webauthn.get",
          challenge: "test",
          origin: "http://localhost",
        })
      ),
      authenticatorData: new Uint8Array(37).buffer,
      signature: new Uint8Array(64).buffer,
      userHandle: new Uint8Array(16).buffer,
    },
    getClientExtensionResults: () => ({
      prf: extensionResults?.prfResults ? { results: extensionResults.prfResults } : undefined,
    }),
    authenticatorAttachment: "platform",
  };
}
