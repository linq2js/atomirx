# Auth Feature

## Purpose

Handles user authentication using WebAuthn/Passkeys with optional PRF extension for encryption key derivation. Provides secure, passwordless authentication with biometric verification.

## Business Rules Summary

- Users authenticate using platform authenticators (Touch ID, Face ID, Windows Hello)
- PRF extension is used to derive encryption keys when supported
- Session persists in sessionStorage for same-tab refresh
- Credentials are stored in IndexedDB for future logins
- Encryption keys never leave the device unencrypted

## Folder Structure

- `domain/` - PasskeyPrompt component for WebAuthn ceremony UI
- `services/` - Auth and crypto services for WebAuthn operations
- `stores/` - Authentication state management with atomirx
- `pages/` - AuthPage for login/registration flow
- `types/` - TypeScript interfaces for auth operations

## Key Files

- `domain/PasskeyPrompt.tsx` - Visual prompt during biometric verification
- `services/auth.service.ts` - WebAuthn registration/authentication
- `services/crypto.service.ts` - AES-256-GCM encryption operations
- `stores/auth.store.ts` - Auth state atoms and actions
- `pages/AuthPage.tsx` - Login/register page composition

## Dependencies

- Depends on: `@/features/todos` (storage service for credential storage)
- Used by: `App.tsx` (auth flow), `@/features/todos` (encryption key)

## Authentication Flow

```
┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   AuthPage   │───►│ authStore   │───►│ authService  │
│  (register)  │    │ (state)     │    │ (WebAuthn)   │
└──────────────┘    └─────────────┘    └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │cryptoService│
                    │(key derive) │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │storageService│
                    │(credential) │
                    └─────────────┘
```

## Security Considerations

- PRF salt is unique per credential for domain separation
- Encryption keys are derived using HKDF with high-entropy PRF output
- Session keys are stored in sessionStorage (cleared on tab close)
- No secrets are persisted in localStorage or IndexedDB
