# Plan: Offline-First Todo App with Passkey Encryption

## Context

Building a secure, offline-first todo application with:

- Passkey PRF-derived encryption for sensitive data
- PWA with service worker for offline support
- IndexedDB local storage with sync to jsonplaceholder
- CRDT-style conflict resolution (LWW with field-level merge)
- Base UI components with Tailwind styling
- atomirx state management

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React App                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Base UI    │  │   atomirx   │  │    React Components     │  │
│  │  Components │  │    State    │  │  (Auth, Todos, Sync)    │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                    Service Layer                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │ AuthSvc  │  │ CryptoSvc│  │ StorageSvc│ │ SyncSvc  │   │  │
│  │  │(Passkey) │  │(AES-GCM) │  │(IndexedDB)│ │(REST)    │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   IndexedDB   │    │ Service Worker│    │jsonplaceholder│
│  (Encrypted)  │    │    (PWA)      │    │   (Mock API)  │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Data Model

```typescript
// Core Todo entity
interface Todo {
  id: string; // UUID
  content: string; // Encrypted field
  completed: boolean;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp (for LWW)
  syncStatus: "pending" | "synced" | "conflict";
  serverId?: number; // jsonplaceholder ID
  deleted?: boolean; // Soft delete for sync
}

// Sync metadata
interface SyncMeta {
  lastSyncAt: number;
  pendingOps: Operation[];
}

// Operation log for offline sync
interface Operation {
  id: string;
  type: "create" | "update" | "delete";
  todoId: string;
  timestamp: number;
  payload: Partial<Todo>;
}

// Auth/Crypto
interface UserCredential {
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer;
  wrappedDEK?: ArrayBuffer; // For non-PRF fallback
  salt: Uint8Array;
  createdAt: number;
}
```

## Tasks

| #   | Task                                  | Status     | Dependencies | Files   | Updated    |
| --- | ------------------------------------- | ---------- | ------------ | ------- | ---------- |
| 1   | Project scaffolding                   | ✅ done    | -            | ~15 new | 2026-01-19 |
| 2   | Crypto service (WebCrypto + PRF)      | ✅ done    | 1            | 4 new   | 2026-01-19 |
| 3   | Auth service (Passkeys)               | ✅ done    | 2            | 3 new   | 2026-01-19 |
| 4   | Storage service (Dexie + encryption)  | ✅ done    | 2            | 4 new   | 2026-01-19 |
| 5   | atomirx state modules                 | ✅ done    | 3, 4         | 5 new   | 2026-01-19 |
| 6   | Sync service (jsonplaceholder + CRDT) | ✅ done    | 4, 5         | 1 new   | 2026-01-19 |
| 7   | Base UI components                    | ✅ done    | 1            | 8 new   | 2026-01-19 |
| 8   | Auth screens (register/login)         | ✅ done    | 3, 7         | 3 new   | 2026-01-19 |
| 9   | Todo list UI                          | ✅ done    | 5, 7         | 4 new   | 2026-01-19 |
| 10  | Offline indicator + sync status       | ✅ done    | 5, 6         | 0 new   | 2026-01-19 |
| 11  | Export/Import functionality           | ✅ done    | 4            | 3 new   | 2026-01-19 |
| 12  | PWA setup (vite-plugin-pwa)           | ✅ done    | 1            | 5 new   | 2026-01-19 |
| 13  | Integration tests                     | ⏳ pending | all          | 5 new   | -          |

---

## Task Details

### Task 1: Project Scaffolding ⏳

**Objective:** Set up the package structure with all dependencies

**Files to create:**

- `packages/todo-app/package.json`
- `packages/todo-app/tsconfig.json`
- `packages/todo-app/vite.config.ts`
- `packages/todo-app/vitest.config.ts`
- `packages/todo-app/tailwind.config.js`
- `packages/todo-app/postcss.config.js`
- `packages/todo-app/index.html`
- `packages/todo-app/src/main.tsx`
- `packages/todo-app/src/App.tsx`
- `packages/todo-app/src/index.css`
- `packages/todo-app/public/` (icons, manifest assets)

**Dependencies:**

```json
{
  "dependencies": {
    "atomirx": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@base-ui-components/react": "^1.0.0-alpha",
    "dexie": "^4.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.19.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^14.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

---

### Task 2: Crypto Service (WebCrypto + PRF) ⏳

**Objective:** Implement encryption/decryption with PRF-derived keys

**Files to create:**

- `src/services/crypto/crypto.service.ts`
- `src/services/crypto/crypto.types.ts`
- `src/services/crypto/crypto.service.test.ts`

**Key functions:**

```typescript
// Derive key from PRF output
deriveKeyFromPRF(prfOutput: ArrayBuffer, salt: Uint8Array): Promise<CryptoKey>

// Encrypt field (AES-GCM)
encryptField(key: CryptoKey, plaintext: string): Promise<EncryptedField>

// Decrypt field
decryptField(key: CryptoKey, encrypted: EncryptedField): Promise<string>

// Wrap/unwrap DEK (for non-PRF fallback)
wrapDEK(kek: CryptoKey, dek: CryptoKey): Promise<ArrayBuffer>
unwrapDEK(kek: CryptoKey, wrappedDEK: ArrayBuffer): Promise<CryptoKey>
```

**Security considerations:**

- Fresh IV per encryption (12 bytes for AES-GCM)
- 256-bit keys
- No key storage in memory longer than needed

---

### Task 3: Auth Service (Passkeys) ⏳

**Objective:** Implement WebAuthn registration/authentication with PRF extension

**Files to create:**

- `src/services/auth/auth.service.ts`
- `src/services/auth/auth.types.ts`
- `src/services/auth/auth.service.test.ts`

**Key functions:**

```typescript
// Check if passkey + PRF is supported
checkSupport(): Promise<AuthSupport>

// Register new passkey with PRF extension
register(username: string): Promise<RegisterResult>

// Authenticate and get PRF output
authenticate(options?: { requireBiometric?: boolean }): Promise<AuthResult>

// Get encryption key from auth result
getEncryptionKey(authResult: AuthResult): Promise<CryptoKey>
```

**PRF Extension usage:**

```typescript
const prfExtension = {
  prf: {
    eval: {
      first: new TextEncoder().encode("encryption-key-v1"),
    },
  },
};
```

---

### Task 4: Storage Service (Dexie + Encryption) ⏳

**Objective:** IndexedDB wrapper with transparent encryption for sensitive fields

**Files to create:**

- `src/services/storage/storage.service.ts`
- `src/services/storage/db.ts` (Dexie schema)
- `src/services/storage/storage.service.test.ts`

**Dexie Schema:**

```typescript
class TodoDatabase extends Dexie {
  todos!: Table<EncryptedTodo>;
  credentials!: Table<UserCredential>;
  syncMeta!: Table<SyncMeta>;
  operations!: Table<Operation>;

  constructor() {
    super("todo-app");
    this.version(1).stores({
      todos: "id, completed, updatedAt, syncStatus, serverId",
      credentials: "credentialId",
      syncMeta: "id",
      operations: "id, todoId, timestamp",
    });
  }
}
```

---

### Task 5: atomirx State Modules ⏳

**Objective:** Define reactive state using atomirx patterns

**Files to create:**

- `src/state/auth.module.ts`
- `src/state/todos.module.ts`
- `src/state/sync.module.ts`
- `src/state/network.module.ts`

**Auth Module:**

```typescript
export const authModule = define(() => {
  const user$ = atom<User | null>(null);
  const isAuthenticated$ = derived(({ read }) => read(user$) !== null);
  const authSupport$ = atom<AuthSupport | null>(null);

  return {
    user$,
    isAuthenticated$,
    authSupport$,
    login: async () => {
      /* ... */
    },
    logout: () => {
      /* ... */
    },
    register: async (username: string) => {
      /* ... */
    },
  };
});
```

**Todos Module:**

```typescript
export const todosModule = define(() => {
  const todos$ = atom<Todo[]>([]);
  const filter$ = atom<"all" | "active" | "completed">("all");

  const filteredTodos$ = derived(({ read }) => {
    const todos = read(todos$);
    const filter = read(filter$);
    // ... filter logic
  });

  return {
    todos$,
    filter$,
    filteredTodos$,
    addTodo: async (content: string) => {
      /* ... */
    },
    toggleTodo: async (id: string) => {
      /* ... */
    },
    deleteTodo: async (id: string) => {
      /* ... */
    },
  };
});
```

---

### Task 6: Sync Service (jsonplaceholder + CRDT) ⏳

**Objective:** Implement offline-first sync with conflict resolution

**Files to create:**

- `src/services/sync/sync.service.ts`
- `src/services/sync/conflict.ts` (CRDT merge logic)
- `src/services/sync/sync.service.test.ts`

**Sync Strategy:**

1. On app start: Load from IndexedDB → Fetch from server → Merge
2. On create/update: Write to IndexedDB → Queue operation → Attempt sync
3. On reconnect: Replay pending operations → Fetch server state → Merge conflicts

**Conflict Resolution (LWW with field merge):**

```typescript
function mergeTodos(local: Todo, remote: Todo): Todo {
  // If same updatedAt, prefer local (user's work)
  if (local.updatedAt >= remote.updatedAt) {
    return { ...local, syncStatus: "synced" };
  }

  // Field-level merge for specific fields
  return {
    ...remote,
    // Keep local content if it was edited more recently
    content:
      local.updatedAt > remote.updatedAt ? local.content : remote.content,
    syncStatus: "synced",
  };
}
```

---

### Task 7: Base UI Components ⏳

**Objective:** Create reusable UI components with Base UI + Tailwind

**Files to create:**

- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Checkbox.tsx`
- `src/components/ui/Dialog.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/index.ts`

**Example Button:**

```tsx
import { Button as BaseButton } from "@base-ui-components/react/button";

export function Button({ variant = "primary", ...props }) {
  return (
    <BaseButton
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "bg-gray-200 text-gray-900 hover:bg-gray-300"
      )}
      {...props}
    />
  );
}
```

---

### Task 8: Auth Screens ⏳

**Objective:** Registration and login screens with passkey UI

**Files to create:**

- `src/pages/AuthPage.tsx`
- `src/components/auth/PasskeyPrompt.tsx`

**Features:**

- "Create account with Passkey" button
- "Sign in with Passkey" button
- Biometric confirmation dialog
- Fallback for unsupported browsers
- Loading states during WebAuthn ceremonies

---

### Task 9: Todo List UI ⏳

**Objective:** Main todo interface with CRUD operations

**Files to create:**

- `src/pages/TodosPage.tsx`
- `src/components/todos/TodoItem.tsx`
- `src/components/todos/TodoInput.tsx`

**Features:**

- Add new todo with encryption
- Toggle completion
- Delete todo (soft delete)
- Filter by all/active/completed
- Sync status badge per item

---

### Task 10: Offline Indicator + Sync Status ⏳

**Objective:** Visual feedback for network and sync state

**Files to create:**

- `src/components/NetworkStatus.tsx`
- `src/components/SyncIndicator.tsx`

**Features:**

- Online/offline banner
- Sync progress indicator
- Pending changes count
- Last sync timestamp

---

### Task 11: Export/Import Functionality ⏳

**Objective:** Backup and restore encrypted data

**Files to create:**

- `src/services/backup/backup.service.ts`
- `src/components/BackupDialog.tsx`

**Export format:**

```typescript
interface BackupFile {
  version: 1;
  exportedAt: number;
  todos: EncryptedTodo[]; // Still encrypted
  operations: Operation[];
  // Note: User must re-authenticate on import to decrypt
}
```

---

### Task 12: PWA Setup ⏳

**Objective:** Configure vite-plugin-pwa for offline support

**Files to create:**

- `src/sw.ts` (custom service worker)
- `public/offline.html`
- PWA icons in `public/`

**vite.config.ts additions:**

```typescript
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
    navigateFallback: "/offline.html",
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/jsonplaceholder\.typicode\.com\/.*/,
        handler: "NetworkFirst",
        options: { cacheName: "api-cache" },
      },
    ],
  },
  manifest: {
    name: "Secure Todo",
    short_name: "Todo",
    theme_color: "#3b82f6",
    display: "standalone",
  },
});
```

---

### Task 13: Integration Tests ⏳

**Objective:** End-to-end tests for critical flows

**Files to create:**

- `src/__tests__/auth.integration.test.ts`
- `src/__tests__/todos.integration.test.ts`
- `src/__tests__/sync.integration.test.ts`
- `src/__tests__/crypto.integration.test.ts`
- `src/__tests__/backup.integration.test.ts`

**Test scenarios:**

- Register → Login → Create todo → Verify encrypted
- Offline create → Come online → Verify synced
- Export → Import on new session → Verify data
- Conflict scenario → Verify merge

---

## Risk Assessment

| Risk                         | Impact | Mitigation                            |
| ---------------------------- | ------ | ------------------------------------- |
| PRF extension not supported  | High   | Fallback to wrapped DEK with password |
| IndexedDB cleared by browser | High   | Export/import, warn users             |
| jsonplaceholder resets data  | Medium | IndexedDB is source of truth          |
| Passkey sync across devices  | Medium | PRF gives same key if passkey synced  |

## Non-Goals

- Server-side storage (beyond jsonplaceholder mock)
- Multi-user collaboration
- Real-time sync (no WebSocket)
- Password-based auth (passkey only, with degraded fallback)

## Success Criteria

- [ ] App works fully offline after first load
- [ ] Todo content is encrypted at rest
- [ ] Passkey authentication works on Chrome 116+
- [ ] Sync handles network interruptions gracefully
- [ ] Export/import preserves encrypted data
- [ ] Lighthouse PWA score > 90
