# Service Documentation Template

**MUST** use this JSDoc template when documenting atomirx services to help both humans and AI understand the interface.

## When to Use Service (CRITICAL)

A **Service** is for **stateless** logic that wraps external I/O.

| Criteria                                  | Service          | Store                 |
| ----------------------------------------- | ---------------- | --------------------- |
| Contains atoms/derived/effects            | ❌ **FORBIDDEN** | ✅ **REQUIRED**       |
| Wraps external I/O (API, storage, crypto) | ✅ **REQUIRED**  | ❌ **NEVER**          |
| Pure functions / async operations         | ✅ Yes           | Actions call services |

## Naming Convention (MUST Follow)

| Element  | Pattern        | Example                                |
| -------- | -------------- | -------------------------------------- |
| Variable | `*Service`     | `authService`, `cryptoService`         |
| File     | `*.service.ts` | `auth.service.ts`, `crypto.service.ts` |
| Location | `services/`    | `src/services/auth/auth.service.ts`    |

## Key Distinction (CRITICAL)

Services are **stateless** - they **MUST NEVER** contain atoms, derived, or effects. They wrap external I/O (APIs, storage, crypto) and **MUST** be injected into stores via `define()`.

## Full Template

```typescript
/**
 * @service serviceName
 *
 * @description Brief description of what this service handles
 *
 * @methods
 * - methodName(args) - What it does
 * - anotherMethod() - What it does
 *
 * @throws
 * - ErrorType - When this error occurs
 *
 * @example
 * // Usage in a store
 * const myStore = define(() => {
 *   const svc = serviceName();
 *   // use svc.methodName()
 * });
 */
export const serviceName = define(
  (): ServiceInterface => ({
    methodName: async (args) => {
      // Implementation
    },
  })
);
```

## Complete Example

```typescript
/**
 * @service authService
 *
 * @description Handles WebAuthn/Passkey authentication operations.
 * Wraps browser WebAuthn API for credential creation and assertion.
 *
 * @methods
 * - checkSupport() - Check browser WebAuthn/PRF support
 * - register(opts) - Create new passkey credential
 * - authenticate(opts) - Authenticate with existing passkey
 *
 * @throws
 * - AuthError - When WebAuthn operation fails
 * - NotSupportedError - When browser doesn't support WebAuthn
 *
 * @example
 * // In auth.store.ts
 * const authStore = define(() => {
 *   const auth = authService();
 *
 *   const login = async () => {
 *     const result = await auth.authenticate({});
 *     if (result.success) user$.set(result.user);
 *   };
 * });
 */
export const authService = define(
  (): AuthService => ({
    checkSupport: async () => {
      const webauthn = !!window.PublicKeyCredential;
      const platformAuthenticator =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return { webauthn, platformAuthenticator };
    },

    register: async (opts) => {
      // WebAuthn credential creation
    },

    authenticate: async (opts) => {
      // WebAuthn credential assertion
    },
  })
);
```

## Minimal Template (Simple Services)

For simple services, use condensed format:

```typescript
/**
 * @service storageService
 * @methods get(key), set(key, value), remove(key)
 */
export const storageService = define(
  (): StorageService => ({
    get: (key) => localStorage.getItem(key),
    set: (key, val) => localStorage.setItem(key, val),
    remove: (key) => localStorage.removeItem(key),
  })
);
```

## Service with Dependencies

Services can depend on other services:

```typescript
/**
 * @service apiService
 *
 * @description HTTP client with authentication
 *
 * @dependencies
 * - authService - For getting auth tokens
 *
 * @methods
 * - get(url) - Authenticated GET request
 * - post(url, body) - Authenticated POST request
 */
export const apiService = define((): ApiService => {
  const auth = authService(); // Inject dependency

  const getHeaders = async () => ({
    Authorization: `Bearer ${await auth.getToken()}`,
  });

  return {
    get: async (url) => {
      const headers = await getHeaders();
      return fetch(url, { headers }).then((r) => r.json());
    },
    post: async (url, body) => {
      const headers = await getHeaders();
      return fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
    },
  };
});
```

## Override Pattern for Testing (REQUIRED)

**MUST** use `define()` to enable testing with `override()`:

```typescript
// MUST define with interface for type safety
export const cryptoService = define(
  (): CryptoService => ({
    encrypt: async (data, key) => {
      /* real implementation */
    },
    decrypt: async (data, key) => {
      /* real implementation */
    },
  })
);

// In tests: MUST use override() for mocking
cryptoService.override(() => ({
  encrypt: jest.fn().mockResolvedValue("encrypted"),
  decrypt: jest.fn().mockResolvedValue("decrypted"),
}));

// MUST reset after tests
afterEach(() => {
  cryptoService.reset();
});
```

## Service Rules Summary (MUST Follow)

| Rule      | Requirement                                                                |
| --------- | -------------------------------------------------------------------------- |
| State     | **MUST NEVER** contain atoms, derived, or effects                          |
| I/O       | **MUST** wrap external I/O (API, storage, crypto)                          |
| Naming    | **MUST** use `*Service` suffix and `*.service.ts` file                     |
| Module    | **MUST** use `define()` for testability                                    |
| Testing   | **MUST** use `override()` for mocking, `reset()` after tests               |
| Injection | **MUST** be consumed via invocation in stores, **NEVER** imported directly |
