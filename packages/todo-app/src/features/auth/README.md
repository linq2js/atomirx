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

- `comps/` - Business components (PasskeyPrompt, LoginForm, RegisterForm)
- `services/` - Auth and crypto services for WebAuthn operations
- `stores/` - Authentication state management with atomirx
- `screens/` - AuthScreen for login/registration flow (mobile-first terminology)
- `types/` - TypeScript interfaces for auth operations

**Note:** Features MUST NOT have `ui/` folder. Use shared `ui/` components.
**Note:** FSA uses `screens/` instead of `pages/` for mobile-first compatibility.

## Key Files

- `comps/passkeyPrompt/` - Visual prompt during biometric verification
- `comps/loginForm/` - Login form with passkey sign in
- `comps/registerForm/` - Registration form for new users
- `services/authService.ts` - WebAuthn registration/authentication
- `services/cryptoService.ts` - AES-256-GCM encryption operations
- `stores/authStore.ts` - Auth state atoms and actions
- `screens/authScreen/authScreen.tsx` - Login/register screen with logic hook

## Dependencies

- Depends on: `@/features/todos` (storage service for credential storage)
- Used by: `App.tsx` (auth flow), `@/features/todos` (encryption key)

## Authentication Flow

```
┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ AuthScreen   │───►│ authStore   │───►│ authService  │
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
