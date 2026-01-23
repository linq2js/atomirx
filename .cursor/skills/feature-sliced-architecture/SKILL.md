# Feature-Sliced Architecture (FSA)

## Trigger

Use for project structure, folder layout, component organization, file naming.

## Core Structure

```
src/
├── ui/              # Generic components (Button, Input, Modal)
├── features/        # Business features with state
├── routes/          # URL-mapped screens
└── shared/          # Utilities, types, constants
```

## Directory Rules

### ui/

Generic, reusable components. NO business logic.

```
ui/
├── button/
│   ├── button.tsx
│   └── index.ts
├── input/
│   ├── input.tsx
│   └── index.ts
└── modal/
    ├── modal.tsx
    └── index.ts
```

### features/

Business features with state. Can have sub-features.

```
features/
├── auth/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   ├── screens/
│   │   └── authScreen/
│   │       ├── authScreen.tsx
│   │       └── index.ts
│   └── index.ts        # Feature barrel
└── dashboard/
    └── ...
```

### routes/

URL-mapped screens. Minimal logic — delegate to features.

```
routes/
├── home/
│   └── homeScreen.tsx
├── profile/
│   └── profileScreen.tsx
└── settings/
    └── settingsScreen.tsx
```

### shared/

Utilities, types, constants. NO business logic.

```
shared/
├── utils/
├── types/
├── constants/
└── hooks/          # Generic hooks (useDebounce, useLocalStorage)
```

## Naming Conventions

| Item            | Rule                  | Example                    |
| --------------- | --------------------- | -------------------------- |
| Files           | camelCase             | `authScreen.tsx`           |
| Directories     | camelCase             | `authScreen/`              |
| Screen files    | `[name]Screen.tsx`    | `authScreen.tsx`           |
| Screen dirs     | `[name]Screen/`       | `authScreen/`              |
| Logic hooks     | `use[Name]Logic.ts`   | `useAuthLogic.ts`          |
| Stores          | `[name].store.ts`     | `auth.store.ts`            |
| Services        | `[name].service.ts`   | `auth.service.ts`          |

## index.ts Rules (CRITICAL)

**index.ts = barrel exports ONLY. NO code.**

```typescript
// ✅ CORRECT
export { AuthScreen } from "./authScreen";
export { authStore } from "./stores/auth.store";
export type { AuthState } from "./types";

// ❌ FORBIDDEN
export const authStore = define(() => { ... }); // No code in index.ts
```

**Required index.ts:**
- `features/[feature]/index.ts` — feature barrel
- `ui/[component]/index.ts` — component barrel

**NO index.ts:**
- `screens/[screen]/index.ts` — export from screen file directly
- Internal directories (hooks/, stores/, services/)

## Component Rules

### One Component Per File

```typescript
// ❌ FORBIDDEN
// authScreen.tsx
export const AuthScreen = () => ...
export const AuthHeader = () => ... // NO

// ✅ CORRECT
// authScreen.tsx
export const AuthScreen = () => ...

// authHeader.tsx (if needed)
export const AuthHeader = () => ...
```

### JSX Limit: 50 Lines

Split when JSX exceeds 50 lines:

```tsx
// ❌ FORBIDDEN — too long
function Dashboard() {
  return (
    <div>
      {/* 60+ lines of JSX */}
    </div>
  );
}

// ✅ CORRECT — split into components
function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <DashboardContent />
      <DashboardFooter />
    </div>
  );
}
```

### Total Lines Limit: 200

Split when component file exceeds 200 lines.

### Splitting Strategies

**1. Compound Components**

```tsx
// ❌ Before
<Card>
  <div className="header">...</div>
  <div className="body">...</div>
  <div className="footer">...</div>
</Card>

// ✅ After
<Card>
  <Card.Header>...</Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

**2. Slot Props**

```tsx
// ❌ Before
function Modal({ title, content, actions }) {
  return (
    <div>
      <h1>{title}</h1>
      <div>{content}</div>
      <div>{actions}</div>
    </div>
  );
}

// ✅ After
function Modal({ header, children, footer }) {
  return (
    <div>
      {header}
      {children}
      {footer}
    </div>
  );
}

<Modal
  header={<ModalHeader title="Confirm" />}
  footer={<ModalActions onConfirm={...} />}
>
  <ModalContent />
</Modal>
```

## Component Classification

### Generic (ui/)

- NO business logic
- Configurable via props
- Examples: Button, Input, Modal, Card

### Domain (features/)

- Contains business logic
- Feature-specific
- Examples: AuthForm, UserProfile, OrderSummary

### Screen (routes/ or features/screens/)

- URL-mapped
- Composes other components
- Minimal logic — delegate to hooks/stores

## Hook Organization

### Logic Hooks (REQUIRED for complex screens)

```tsx
// features/auth/hooks/useAuthScreenLogic.ts

/**
 * Auth screen business logic
 * @businessRules
 * - Validates username before register
 * - Shows error on failed auth
 * @stateFlow checking → register/login → authenticated
 * @returns {Object} State and handlers
 */
export function useAuthScreenLogic() {
  const auth = authStore();
  const [view, setView] = useState<"checking" | "register" | "login">("checking");
  const [username, setUsername] = useState("");

  const stable = useStable({
    onRegister: async () => {
      if (!username.trim()) return;
      await auth.register(username.trim());
    },
    onLogin: () => auth.login(),
    onSwitchToRegister: () => {
      auth.clearError();
      setView("register");
    },
  });

  return { view, username, setUsername, ...stable };
}
```

### JSDoc for Logic Hooks (REQUIRED)

| Tag             | Required | Description                  |
| --------------- | -------- | ---------------------------- |
| `@businessRules`| ✅       | Business rules enforced      |
| `@stateFlow`    | ✅       | State transitions            |
| `@returns`      | ✅       | Return shape                 |
| `@example`      | Optional | Usage example                |

## Service Rules (CRITICAL)

**Services = stateless. NO atoms. Pure functions.**

```typescript
// ❌ FORBIDDEN
export const authService = define(() => {
  const token$ = atom<string | null>(null); // NO atoms in service
  return { ... };
});

// ✅ CORRECT
export const authService = define((): AuthService => ({
  login: async (creds) => api.post("/login", creds),
  logout: async () => api.post("/logout"),
  checkSupport: async () => typeof PublicKeyCredential !== "undefined",
}));
```

## Cross-Feature Communication

### NEVER Import Stores Directly

```typescript
// ❌ FORBIDDEN
import { userStore } from "@/features/user/stores/user.store";

export const orderStore = define(() => {
  const user = userStore(); // Direct import
  return { ... };
});

// ✅ CORRECT — Use callbacks
export const orderStore = define(() => {
  const createOrder = async (data: OrderData, getCurrentUser: () => User) => {
    const user = getCurrentUser();
    return api.createOrder({ ...data, userId: user.id });
  };
  return { createOrder };
});

// Usage in screen
function OrderScreen() {
  const order = orderStore();
  const user = userStore();
  
  const stable = useStable({
    onCreate: (data) => order.createOrder(data, () => user.current$.get()),
  });
}
```

### Allowed Cross-Feature

| Allowed                    | Not Allowed              |
| -------------------------- | ------------------------ |
| Types/interfaces           | Direct store imports     |
| Shared utilities           | Circular dependencies    |
| Event-based communication  | Tight coupling           |

## Import Order

```typescript
// 1. External
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Internal absolute (@/)
import { Button } from "@/ui/button";
import { authStore } from "@/features/auth";

// 3. Relative
import { useAuthLogic } from "./hooks/useAuthLogic";
import type { AuthProps } from "./types";
```

## File Structure Examples

### Feature with Sub-feature

```
features/
└── orders/
    ├── features/           # Sub-features
    │   └── orderDetails/
    │       ├── screens/
    │       │   └── orderDetailsScreen/
    │       │       └── orderDetailsScreen.tsx
    │       ├── hooks/
    │       └── index.ts
    ├── screens/
    │   └── ordersScreen/
    │       └── ordersScreen.tsx
    ├── stores/
    │   └── orders.store.ts
    ├── services/
    │   └── orders.service.ts
    └── index.ts
```

### Simple Feature

```
features/
└── settings/
    ├── screens/
    │   └── settingsScreen/
    │       └── settingsScreen.tsx
    ├── hooks/
    │   └── useSettingsLogic.ts
    └── index.ts
```
