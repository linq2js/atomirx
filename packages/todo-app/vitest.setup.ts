import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// Mock crypto for tests if not available
if (!globalThis.crypto?.getRandomValues) {
  const cryptoPolyfill = {
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    randomUUID: (): `${string}-${string}-${string}-${string}-${string}` => {
      const hex = "0123456789abcdef";
      const s = (n: number) =>
        Array.from({ length: n }, () => hex[Math.floor(Math.random() * 16)]).join("");
      return `${s(8)}-${s(4)}-4${s(3)}-${hex[(Math.random() * 4) | 8]}${s(3)}-${s(12)}` as `${string}-${string}-${string}-${string}-${string}`;
    },
  };
  Object.assign(globalThis, { crypto: cryptoPolyfill });
}

// Mock navigator.credentials for WebAuthn tests
// Use a mutable object so tests can override
const mockCredentials = {
  create: vi.fn(),
  get: vi.fn(),
};

// Only define if not already defined
if (!globalThis.navigator.credentials) {
  Object.defineProperty(globalThis.navigator, "credentials", {
    value: mockCredentials,
    writable: true,
    configurable: true,
  });
} else {
  // Replace methods on existing object
  Object.assign(globalThis.navigator.credentials, mockCredentials);
}

// Mock PublicKeyCredential
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
  isConditionalMediationAvailable: vi.fn().mockResolvedValue(true),
};

// @ts-expect-error - mock for tests
globalThis.PublicKeyCredential = mockPublicKeyCredential;

// Export mocks for test files to use
export { mockCredentials, mockPublicKeyCredential };

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
