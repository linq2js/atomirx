# Feature-Sliced Architecture Skill

Guide for working with feature-sliced architecture in this project. Use when implementing components, pages, services, or stores within the `features/` directory structure.

## Trigger Conditions

Use this skill when:

- Working in `src/features/` directory
- Creating new components, services, stores, or pages
- Asking which folder to place new code
- Implementing UI components (need to determine if generic or domain)
- Reviewing code organization

## Directory Structure

```
src/
├── ui/                          # Shared generic components (ONLY place for UI)
│   ├── primitives/              # Smallest UI (Button, Input, Label, Icon, Badge)
│   ├── composed/                # Composed from primitives (InputField, Card, Dialog)
│   └── index.ts
│
├── features/
│   ├── {domain}/                # Feature module (e.g., auth, todos, settings)
│   │   ├── README.md            # Feature overview + business rules summary
│   │   ├── comps/               # Business components (compose from ui/)
│   │   ├── services/            # Business logic, API calls
│   │   ├── stores/              # State management (atomirx)
│   │   ├── pages/               # Full page compositions
│   │   ├── utils/               # Feature-specific utilities
│   │   ├── types/               # Feature-specific types
│   │   └── index.ts             # Public API exports
│   │
│   └── {another-domain}/
│       └── ...
│
├── routes/
│   ├── README.md                # "Composition only"
│   ├── index.tsx                # Route definitions
│   └── layouts/                 # Layout components
│
└── shared/                      # Cross-cutting concerns (NO ui/ or comps/)
    ├── hooks/                   # Shared hooks
    ├── utils/                   # Shared utilities
    └── types/                   # Shared types
```

## Critical Rules

### Feature Changes: README First (STRICT)

**When changing/refactoring a feature, AI MUST update README.md first and get user confirmation before implementing.**

**Workflow:**

1. **Read** existing `features/{domain}/README.md`
2. **Update** README.md with proposed changes:
   - New/modified components
   - New/modified business rules
   - Changed folder structure
   - Updated dependencies
3. **Present** changes to user for confirmation
4. **Wait** for user approval
5. **Implement** only after confirmation

```
❌ FORBIDDEN:
   1. Start coding immediately
   2. Update README.md after implementation

✅ REQUIRED:
   1. Update README.md with plan
   2. User confirms: "looks good" / "proceed"
   3. Start implementation
```

**Example README.md update:**

```markdown
## Proposed Changes <!-- Add this section -->

- [ ] Add `resetPasswordPage.tsx` to pages/
- [ ] Extract `authLayout.tsx` to comps/ (now reusable)
- [ ] Add new business rule: "Password reset expires after 24h"

## Business Rules Summary

- [existing rules...]
- **NEW:** Password reset link expires after 24 hours
```

**Why:**

- Ensures AI understands the feature before changing it
- User can catch misunderstandings early
- Creates documentation as a side effect
- Reduces wasted implementation effort

### No Barrel Exports for Top-Level Feature Dirs (STRICT)

**AI MUST NOT create `index.ts` in feature directories.**

Barrel exports are ONLY allowed for complex component/page folders:

- `features/{domain}/comps/loginForm/index.ts` ✅ OK
- `features/{domain}/pages/authPage/index.ts` ✅ OK

```
features/auth/
├── index.ts                      # ❌ FORBIDDEN - no feature root barrel
├── comps/
│   ├── index.ts                  # ❌ FORBIDDEN - no barrel for comps/
│   ├── avatar.tsx                # Simple → file
│   └── loginForm/                # Complex → folder
│       └── index.ts              # ✅ OK - barrel for complex component
│
├── pages/
│   ├── index.ts                  # ❌ FORBIDDEN - no barrel for pages/
│   ├── settingsPage.tsx          # Simple → file
│   └── authPage/                 # Complex → folder
│       └── index.ts              # ✅ OK - barrel for complex page
│
├── services/
│   ├── index.ts                  # ❌ FORBIDDEN - no barrel for services/
│   └── auth.service.ts
│
└── stores/
    ├── index.ts                  # ❌ FORBIDDEN - no barrel for stores/
    └── auth.store.ts
```

**How to import:**

```typescript
// Direct import (always use explicit paths)
import { LoginForm } from "@/features/auth/comps/loginForm";
import { AuthPage } from "@/features/auth/pages/authPage";
import { authService } from "@/features/auth/services/auth.service";
import { authStore } from "@/features/auth/stores/auth.store";
```

**Why — Avoid side effects on import:**

```typescript
// ❌ BAD: comps/index.ts barrel exports everything
// When you import ONE component, ALL components are loaded/executed
import { LoginForm } from "../comps"; // Loads: LoginForm, RegisterForm, Avatar, etc.

// ✅ GOOD: Direct import loads only what you need
import { LoginForm } from "../comps/loginForm"; // Loads: only LoginForm

// ✅ OK: Single component folder barrel is fine (minimal scope)
// loginForm/index.ts only exports loginForm.tsx, loginForm.logic.ts
import { LoginForm } from "../comps/loginForm"; // Loads: only LoginForm + its logic
```

**Impact comparison:**

| Import style                             | What gets loaded | Side effects                |
| ---------------------------------------- | ---------------- | --------------------------- |
| `from "../comps"` (barrel)               | ALL comps        | High - unused code executed |
| `from "@/features/auth"` (barrel)        | ALL feature code | High - unused code executed |
| `from "@/features/auth/comps/loginForm"` | Only LoginForm   | Low - single component      |

**Single component folder barrel is OK** because:

- Scope is limited to one component
- Only loads that component's files (`.tsx`, `.logic.ts`, `.styles.css`)
- No risk of loading unrelated components

### File Naming: camelCase (STRICT)

**AI MUST use camelCase for all code file names.**

```
✅ CORRECT (camelCase):
   authPage.tsx
   authPage.logic.ts
   registerForm.tsx
   loginForm.tsx
   todoItem.styles.css
   auth.service.ts
   auth.store.ts

❌ FORBIDDEN (PascalCase):
   AuthPage.tsx
   RegisterForm.tsx
   TodoItem.styles.css
```

**Exceptions:**

- `index.ts` / `index.tsx` — barrel exports only
- `README.md` — documentation
- Config files (`tsconfig.json`, `vite.config.ts`, etc.)

**Why:**

- Consistent with common JS/TS conventions
- Avoids case-sensitivity issues across OS
- Distinguishes files from exported components/classes

### Index Files (STRICT)

**AI MUST NOT write code in `index.ts` or `index.tsx` files.**

Index files are **ONLY** for barrel exporting:

```typescript
// ✅ CORRECT - index.ts for barrel exports only
export { Button } from "./Button";
export { Input } from "./Input";
export type { ButtonProps, InputProps } from "./types";

// ❌ FORBIDDEN - No logic, no components, no hooks in index files
export const useAuth = () => { ... };  // WRONG - move to separate file
export function Button() { ... }        // WRONG - move to Button.tsx
```

**Why:**

- Keeps imports clean and predictable
- Avoids circular dependency issues
- Makes code easier to find and maintain

### One Component Per File (STRICT)

**AI MUST NOT define multiple components in one file.**

Each React component MUST have its own file:

```
✅ CORRECT:
   features/auth/pages/
   ├── authPage.tsx          # Only AuthPage
   ├── registerForm.tsx      # Only RegisterForm
   ├── loginForm.tsx         # Only LoginForm
   └── index.ts              # Barrel export

❌ FORBIDDEN:
   features/auth/pages/
   └── authPage.tsx          # Contains AuthPage + RegisterForm + LoginForm
```

```typescript
// ❌ FORBIDDEN - Multiple components in one file
// authPage.tsx
export function AuthPage() { ... }
function RegisterForm() { ... }  // WRONG - extract to registerForm.tsx
function LoginForm() { ... }     // WRONG - extract to loginForm.tsx

// ✅ CORRECT - One component per file
// authPage.tsx
import { RegisterForm } from "./registerForm";
import { LoginForm } from "./loginForm";
export function AuthPage() { ... }

// registerForm.tsx
export function RegisterForm() { ... }

// loginForm.tsx
export function LoginForm() { ... }
```

**Exceptions (allowed in same file):**

- Compound component parts (e.g., `Card`, `CardHeader`, `CardContent` in `Card.tsx`)
- Tiny internal helpers (< 5 lines, not exported, used only once)

**Why:**

- Easier to find components (file name = component name)
- Better code splitting and lazy loading
- Clearer ownership and responsibility
- Simpler imports and refactoring

### UI Component Location (STRICT)

**All generic UI components MUST be in `ui/` (top-level).**

```
✅ ALLOWED:
   ui/primitives/button/
   ui/primitives/input/
   ui/composed/inputField/
   ui/composed/card/

❌ FORBIDDEN:
   features/{domain}/ui/          # NO ui/ folder in features
   shared/ui/                     # NO ui/ folder in shared
   shared/comps/                  # NO comps/ folder in shared
```

**Rules:**

1. `ui/` — Generic components only, NO business logic
2. `features/{domain}/comps/` — Business components that **compose** from `ui/`
3. `features/{domain}/` — **MUST NOT** have `ui/` folder
4. `shared/` — **MUST NOT** have `ui/` or `comps/` (only hooks, utils, types)

**Why:**

- Forces reuse — no duplicate UI components per feature
- Single source of truth — one place for all generic UI
- Clear mental model — `ui/` = generic, `comps/` = business

## Path-Based Detection Rules

| Path Pattern                   | Contains          | Business Rules | AI Action                      |
| ------------------------------ | ----------------- | -------------- | ------------------------------ |
| `ui/*`                         | Generic UI        | **NO**         | Implement without domain logic |
| `features/{domain}/comps/*`    | Domain components | **YES**        | Check JSDoc `@businessRules`   |
| `features/{domain}/services/*` | Business logic    | **YES**        | Check JSDoc for rules          |
| `features/{domain}/stores/*`   | State + rules     | **YES**        | Check JSDoc for rules          |
| `features/{domain}/pages/*`    | Compositions      | **MAYBE**      | Check if complex logic exists  |
| `features/{domain}/utils/*`    | Utilities         | **NO**         | Pure functions only            |
| `routes/*`                     | Route definitions | **NO**         | Composition only               |
| `shared/*`                     | Cross-cutting     | **NO**         | Hooks, utils, types only       |

## Component Classification

### Generic Components (NO business rules)

Located in: `ui/` (top-level only)

Characteristics:

- Purely presentational
- Behavior driven by props only
- No domain knowledge
- Could work in any application
- No conditional logic based on business state

```typescript
// ui/primitives/button/button.tsx
// NO @businessRules tag needed
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ variant = "primary", ...props }: ButtonProps) => {
  // Pure presentation logic only
};
```

### Domain Components (HAS business rules)

Located in: `features/{domain}/comps/`

Characteristics:

- Contains business logic
- Behavior changes based on domain state
- Has permissions/role-based rendering
- Validates against business constraints
- Handles domain-specific edge cases

```typescript
// features/todos/comps/todoItem/todoItem.tsx
/**
 * Displays a single todo item with completion toggle and actions.
 *
 * @businessRules
 * - Completed todos show strikethrough style
 * - Overdue todos (dueDate < now) show red border
 * - Can't delete shared todos unless you're the owner
 * - Priority badge only displays for high/urgent priorities
 *
 * @permissions
 * - Owner: view, toggle, edit, delete, share
 * - Collaborator: view, toggle only
 * - Viewer: view only (read-only mode)
 *
 * @edgeCases
 * - No due date: hide date section entirely
 * - Title > 80 chars: truncate with tooltip
 * - Empty title (shouldn't happen): show "[Untitled]"
 */
export const TodoItem = ({ todo, currentUser }: TodoItemProps) => {
  // Domain logic with business rules
};
```

## Domain Component Splitting Rules (MANDATORY)

**Principle: Pages and domain components should be thin orchestrators, not UI factories.**

This section applies to components in `features/{domain}/pages/` and `features/{domain}/comps/`.

### Size Limits for Domain Components (STRICT)

| Type | Max JSX Lines | Max Total Lines | Action if exceeded       |
| ---- | ------------- | --------------- | ------------------------ |
| Page | 30            | 100             | Extract to comps/        |
| Comp | 50            | 150             | Split into smaller comps |

### Split Indicators for Domain Components

| Indicator                                   | Example                     | Action                                   |
| ------------------------------------------- | --------------------------- | ---------------------------------------- |
| **Conditional render block > 10 JSX lines** | `if (loading) return <...>` | Extract to `loadingState.tsx`            |
| **Error/empty state > 5 JSX lines**         | `if (error) return <...>`   | Extract to `errorState.tsx` or use `ui/` |
| **Form section > 20 JSX lines**             | Large form in page          | Extract to `{name}Form.tsx` in comps/    |
| **Repeated UI pattern**                     | Alert box used 2+ times     | Extract to `ui/` or local component      |
| **View-specific JSX**                       | Register vs Login views     | Extract each view to separate component  |

### Example: Splitting a Large Page

```typescript
// ❌ BAD: Page with too much inline UI (AuthPage.tsx - 377 lines)
export function AuthPage() {
  // ... state and hooks ...

  if (view === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />      // 10+ lines of JSX
        <p>Checking...</p>
      </div>
    );
  }

  if (view === "unsupported") {
    return (
      <div className="...">                       // 25+ lines of JSX
        <AlertCircle />
        <h1>Browser Not Supported</h1>
        <p>...</p>
        <ul>...</ul>
      </div>
    );
  }

  return (
    <div>
      {view === "register" ? (
        <form>...</form>                          // 80+ lines inline
      ) : (
        <div>...</div>                            // 50+ lines inline
      )}
    </div>
  );
}

// ✅ GOOD: Page as thin orchestrator
// AuthPage.tsx (< 50 lines)
export function AuthPage() {
  const { view, ... } = useAuthPage();  // Extract logic to hook

  if (view === "checking") return <AuthLoadingState />;
  if (view === "unsupported") return <AuthUnsupportedState />;

  return (
    <AuthLayout>
      {view === "register" ? <RegisterForm {...} /> : <LoginForm {...} />}
    </AuthLayout>
  );
}
```

### Page File Structure: Simple vs Complex

**Simple page (no hook, minimal parts) → Single file**

```
pages/
├── settingsPage.tsx              # Simple page, single file
├── profilePage.tsx               # Simple page, single file
└── index.ts
```

**Complex page (has hook, multiple parts) → Folder**

```
pages/
├── authPage/
│   ├── index.ts                  # export { AuthPage } from "./authPage"
│   ├── authPage.tsx              # Main page component
│   ├── authPage.logic.ts         # useAuthPageLogic hook
│   ├── authLoadingState.tsx      # Page-private view state
│   ├── authUnsupportedState.tsx  # Page-private view state
│   └── authLayout.tsx            # Page-private layout
│
├── settingsPage.tsx              # Simple page stays as file
└── index.ts                      # export * from "./authPage"; export * from "./settingsPage"
```

**Rules:**

1. **Simple page** → `pages/myPage.tsx` (single file, < 100 lines, no hook)
2. **Complex page** → `pages/myPage/` folder when:
   - Page has a logic hook (`MyPage.logic.ts`)
   - Page has multiple private parts (loading states, layouts, sub-views)
   - Page would exceed 100 lines as single file
3. **Page parts are PRIVATE** — only used by that page, not exported from `pages/index.ts`
4. **If page part becomes reusable** → Move to `comps/`

### Decision Tree: Where to Put Extracted Code?

```
Is the extracted component...
│
├── Generic UI (no business logic)?
│   └── YES → ui/primitives/ or ui/composed/
│       └── Examples: LoadingSpinner, ErrorAlert, EmptyState
│
├── Page-private (only used by one page)?
│   └── YES → Same folder as page (pages/myPage/)
│       └── Examples: authLoadingState, authLayout (if auth-specific)
│       └── MUST NOT be exported from pages/index.ts
│
├── Reusable within this feature (used by multiple pages/comps)?
│   └── YES → features/{domain}/comps/
│       └── Examples: RegisterForm, LoginForm, UserAvatar
│
└── Reusable across features?
    └── YES → Consider if it's generic (ui/) or business (shared feature)
```

### Example: Feature Structure

```
features/auth/
├── pages/
│   ├── authPage/                     # Complex page (has parts + hook)
│   │   ├── index.ts                  # ✅ OK - complex folder barrel
│   │   ├── authPage.tsx
│   │   ├── authPage.logic.ts
│   │   ├── authLoadingState.tsx      # Private to AuthPage
│   │   └── authUnsupportedState.tsx  # Private to AuthPage
│   │
│   └── resetPasswordPage.tsx         # Simple page (single file)
│
├── comps/
│   ├── registerForm.tsx              # Simple comp (single file)
│   ├── loginForm/                    # Complex comp (has hook)
│   │   ├── index.ts                  # ✅ OK - complex folder barrel
│   │   ├── loginForm.tsx
│   │   └── loginForm.logic.ts
│   └── passkeyPrompt.tsx
│
├── services/
│   └── auth.service.ts
│
└── stores/
    └── auth.store.ts
```

### Component File Structure: Simple vs Complex (Universal Rule)

**This rule applies to ALL components: pages, comps, and ui.**

**Simple component → Single file**

```
comps/
├── avatar.tsx                    # Simple, no hook, no styles
├── statusBadge.tsx               # Simple, just props → UI
└── index.ts

ui/primitives/
├── button.tsx                    # Simple primitive
├── label.tsx                     # Simple primitive
└── index.ts
```

**Complex component → Folder**

```
comps/
├── articleList/                  # Complex: has hook + styles
│   ├── index.ts                  # export { ArticleList } from "./articleList"
│   ├── articleList.tsx           # UI only (renders from hook data)
│   ├── articleList.logic.ts      # useArticleListLogic hook
│   └── articleList.styles.css    # Optional: styles
│
├── avatar.tsx                    # Simple stays as file
└── index.ts

ui/composed/
├── card/                         # Complex: has compound parts
│   ├── index.ts
│   ├── card.tsx
│   ├── cardHeader.tsx
│   ├── cardContent.tsx
│   └── cardFooter.tsx
│
├── inputField.tsx                # Simple composed stays as file
└── index.ts
```

**When to use folder vs file:**

| Condition                              | Structure               |
| -------------------------------------- | ----------------------- |
| Single file, no hook, no custom styles | `componentName.tsx`     |
| Has logic hook (`.logic.ts`)           | `componentName/` folder |
| Has custom styles (`.styles.css`)      | `componentName/` folder |
| Has compound parts (Card + CardHeader) | `componentName/` folder |
| Has private sub-components             | `componentName/` folder |

**Naming convention (inside folder):**

| File             | Contains                                  | Naming           |
| ---------------- | ----------------------------------------- | ---------------- |
| `xxx.tsx`        | React component (UI only)                 | `function Xxx()` |
| `xxx.logic.ts`   | Component hook (state, handlers, effects) | `useXxxLogic()`  |
| `xxx.styles.css` | CSS/SCSS styles (optional)                | -                |
| `xxx.styles.ts`  | CSS-in-JS styles (optional)               | -                |
| `xxxSubPart.tsx` | Private sub-component                     | Not exported     |

**Rules (STRICT):**

1. Component file MUST only call **ONE hook**: `useXxxLogic()`
2. **ALL logic** goes in `.logic.ts` — useState, useEffect, useStable, useMemo, handlers
3. Component file is **pure rendering** — just JSX based on hook return values
4. `useXxxLogic` hook is **ONLY** for its component — MUST NOT be reused elsewhere
5. If logic is reusable → move to `features/{domain}/hooks/` or `shared/hooks/`

**Why this pattern (testability):**

```typescript
// Testing LOGIC - no rendering needed, just call the hook
import { renderHook } from "@testing-library/react";
import { useAuthPageLogic } from "./authPage.logic";

it("should switch to login view when credentials exist", async () => {
  const { result } = renderHook(() => useAuthPageLogic());
  // Test logic directly without rendering UI
  expect(result.current.view).toBe("login");
});

// Testing UI - mock the hook, test rendering with fake data
jest.mock("./authPage.logic", () => ({
  useAuthPageLogic: () => ({
    view: "register",
    isLoading: false,
    onRegister: jest.fn(),
  }),
}));

it("should render register form when view is register", () => {
  render(<AuthPage />);
  expect(screen.getByText("Create Account")).toBeInTheDocument();
});
```

**Component structure:**

```typescript
// ❌ BAD: Logic mixed in component (hard to test)
// authPage.tsx
export function AuthPage() {
  const auth = authStore();
  const { authSupport, authError, isLoading } = useSelector(({ read }) => ({
    authSupport: read(auth.authSupport$),
    authError: read(auth.authError$),
    isLoading: read(auth.isLoading$),
  }));

  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");

  // ❌ BAD: useCallback scattered throughout
  const handleRegister = useCallback(async () => { /* logic */ }, []);
  const handleLogin = useCallback(async () => { /* logic */ }, []);

  useEffect(() => {
    async function initialize() { /* logic */ }
    initialize();
  }, [auth]);

  return <div>...</div>;
}

// ✅ GOOD: Component calls single hook, pure rendering
// authPage.logic.ts
export function useAuthPageLogic() {
  const auth = authStore();
  const { authSupport, authError, isLoading } = useSelector(({ read }) => ({
    authSupport: read(auth.authSupport$),
    authError: read(auth.authError$),
    isLoading: read(auth.isLoading$),
  }));

  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);

  // ✅ GOOD: All callbacks grouped with useStable
  const callbacks = useStable({
    onRegister: async () => { /* logic */ },
    onLogin: async () => { /* logic */ },
    onSwitchToRegister: () => { /* logic */ },
    onSwitchToLogin: () => { /* logic */ },
  });

  // Effects ALWAYS last
  useEffect(() => {
    async function initialize() { /* logic */ }
    initialize();
  }, [auth]);

  return {
    // State
    view,
    username,
    isLoading,
    authError,
    authSupport,
    showPasskeyPrompt,
    // Setters
    setUsername,
    // Handlers (spread from useStable)
    ...callbacks,
  };
}

// authPage.tsx - PURE RENDERING ONLY
import { useAuthPageLogic } from "./authPage.logic";

export function AuthPage() {
  const {
    view, username, isLoading, authError, authSupport, showPasskeyPrompt,
    setUsername, onRegister, onLogin, onSwitchToRegister, onSwitchToLogin,
  } = useAuthPageLogic();

  if (view === "checking") return <AuthLoadingState />;
  if (view === "unsupported") return <AuthUnsupportedState />;

  return (
    <AuthLayout>
      {view === "register" ? (
        <RegisterForm
          username={username}
          onUsernameChange={setUsername}
          onSubmit={onRegister}
          isLoading={isLoading}
          error={authError}
        />
      ) : (
        <LoginForm onSubmit={onLogin} isLoading={isLoading} error={authError} />
      )}
      {showPasskeyPrompt && <PasskeyPrompt />}
    </AuthLayout>
  );
}
```

**When to create `.logic.ts` (MUST if ANY of these):**

| Indicator             | Action                      |
| --------------------- | --------------------------- |
| ANY useState          | MUST extract to `.logic.ts` |
| ANY useEffect         | MUST extract to `.logic.ts` |
| ANY useStable/useMemo | MUST extract to `.logic.ts` |
| ANY event handler     | MUST extract to `.logic.ts` |
| Uses store/selector   | MUST extract to `.logic.ts` |

**Allowed in component file (without `.logic.ts`):**

- `useRef` for DOM references
- Third-party UI hooks (e.g., `useFormContext` from react-hook-form)
- Simple props-only rendering (no state)

### Checklist: Before Writing Page/Domain Component

- [ ] Component calls ONLY `useXxxLogic()` — no other state/effect hooks?
- [ ] ALL useState/useEffect/useStable/useMemo in `.logic.ts`?
- [ ] Component file is PURE RENDERING — just JSX from hook data?
- [ ] Total lines < 100 (page) or < 150 (comp)?
- [ ] JSX lines < 30 (page) or < 50 (comp)?
- [ ] No conditional render blocks > 10 JSX lines?
- [ ] No inline forms > 20 JSX lines?
- [ ] Repeated patterns extracted?

**If ANY check FAILS → Extract to `.logic.ts` first, then implement.**

### Hook Code Organization (STRICT)

**AI MUST follow this ordering in `.logic.ts` files:**

```typescript
export function useXxxLogic() {
  // 1. External stores/context
  const auth = authStore();
  const theme = useTheme();

  // 2. Selectors (read from stores)
  const { data, isLoading } = useSelector(/* ... */);

  // 3. Local state (useState)
  const [view, setView] = useState("initial");
  const [username, setUsername] = useState("");

  // 4. Refs (useRef)
  const inputRef = useRef<HTMLInputElement>(null);

  // 5. Computed values (useMemo)
  const filteredItems = useMemo(() => /* ... */, [items, filter]);

  // 6. Callbacks/handlers (useStable — NOT useCallback)
  const callbacks = useStable({
    onSubmit: () => { /* ... */ },
    onChange: () => { /* ... */ },
  });

  // 7. Effects (useEffect, useLayoutEffect) — ALWAYS LAST
  useEffect(() => {
    // Side effects after all setup is done
  }, [dependency]);

  useLayoutEffect(() => {
    // DOM measurements/mutations
  }, []);

  // 8. Return object
  return {
    // State
    view,
    username,
    isLoading,
    // Refs
    inputRef,
    // Computed
    filteredItems,
    // Handlers (spread from useStable)
    ...callbacks,
  };
}
```

**Why effects MUST be last:**

1. Effects depend on state/callbacks — define dependencies first
2. Effects are side effects — setup logic should come before side effects
3. Consistent ordering — easier to read and review
4. Matches React mental model — render → commit → effects

**Return object ordering:**

| Order | Category     | Prefix | Example                            |
| ----- | ------------ | ------ | ---------------------------------- |
| 1     | State values | none   | `view`, `username`, `isLoading`    |
| 2     | Refs         | none   | `inputRef`, `formRef`              |
| 3     | Computed     | none   | `filteredItems`, `totalCount`      |
| 4     | Setters      | `set`  | `setUsername`, `setValue`          |
| 5     | Handlers     | `on`   | `onSubmit`, `onChange`, `onDelete` |

### JSDoc Requirements for Logic Hooks

**Every `.logic.ts` file MUST have comprehensive JSDoc.**

````typescript
// ❌ BAD: No documentation
export function useAuthPageLogic() {
  const [view, setView] = useState<AuthView>("checking");
  // ... rest of logic
}

// ✅ GOOD: Comprehensive JSDoc
/**
 * Logic hook for AuthPage.
 *
 * @description
 * Manages authentication page state including view transitions,
 * passkey registration/login flow, and error handling.
 *
 * @businessRules
 * - Shows "checking" view while detecting WebAuthn support
 * - Shows "unsupported" if browser lacks WebAuthn/platform authenticator
 * - Shows "login" if user has existing credentials, otherwise "register"
 * - Passkey prompt appears during registration/login operations
 *
 * @stateFlow
 * checking → (no support) → unsupported
 * checking → (has credentials) → login
 * checking → (no credentials) → register
 * register ↔ login (user can switch)
 *
 * @returns {UseAuthPageLogicReturn} State and handlers for AuthPage
 *
 * @example
 * ```tsx
 * function AuthPage() {
 *   const { view, onLogin, onRegister } = useAuthPageLogic();
 *   // ...
 * }
 * ```
 */
export function useAuthPageLogic(): UseAuthPageLogicReturn {
  // ...
}
````

**Required JSDoc sections for `.logic.ts`:**

| Section          | Required   | Description                               |
| ---------------- | ---------- | ----------------------------------------- |
| `@description`   | YES        | What the hook does, 1-2 sentences         |
| `@businessRules` | If any     | Business logic rules this hook implements |
| `@stateFlow`     | If complex | State transitions (use arrows: → ↔)       |
| `@returns`       | YES        | Return type and brief description         |
| `@example`       | YES        | Usage example in component                |

**Document return type interface:**

```typescript
/**
 * Return type for useAuthPageLogic hook.
 */
interface UseAuthPageLogicReturn {
  /** Current view state: checking, register, login, unsupported */
  view: AuthView;
  /** Username input value for registration */
  username: string;
  /** Whether user has existing passkey credentials */
  hasCredentials: boolean;
  /** Whether passkey prompt overlay is visible */
  showPasskeyPrompt: boolean;
  /** Loading state from auth store */
  isLoading: boolean;
  /** Error from auth operations */
  authError: AuthError | null;
  /** WebAuthn support info */
  authSupport: AuthSupport | null;

  /** Update username input */
  setUsername: (value: string) => void;
  /** Initiate passkey registration */
  onRegister: () => Promise<void>;
  /** Initiate passkey login */
  onLogin: () => Promise<void>;
  /** Switch to register view */
  onSwitchToRegister: () => void;
  /** Switch to login view */
  onSwitchToLogin: () => void;
}
```

**Inline comments for complex logic:**

```typescript
export function useAuthPageLogic(): UseAuthPageLogicReturn {
  // ... state declarations ...

  // Callbacks with useStable (before effects)
  const callbacks = useStable({
    onRegister: async () => {
      if (!username.trim()) return;

      // Show passkey prompt overlay while browser handles WebAuthn ceremony
      setShowPasskeyPrompt(true);
      await auth.register(username.trim());
      setShowPasskeyPrompt(false);
      // Note: success/error handling is done via authStore state
    },
    // ... other callbacks
  });

  // Effects ALWAYS last
  useEffect(() => {
    async function initialize() {
      const support = await auth.checkSupport();

      // Browser must support WebAuthn AND have platform authenticator (Touch ID, Face ID, etc.)
      if (!support.webauthn || !support.platformAuthenticator) {
        setView("unsupported");
        return;
      }

      // Check if user already registered a passkey on this device
      const hasExisting = await auth.hasStoredCredentials();
      setHasCredentials(hasExisting);

      // Show login if returning user, register if new user
      setView(hasExisting ? "login" : "register");
    }
    initialize();
  }, [auth]);

  return { /* ... */, ...callbacks };
}
```

## Generic UI Component Splitting Rules (MANDATORY)

**Principle: Generic (dumb) components should be as small and composable as possible.**

This section applies to components in `ui/` (top-level).

AI MUST classify generic components into **two categories**:

### Two-Level Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMITIVES (smallest, cannot be broken down)               │
│  ├── Button, Input, Label, Icon, Badge, Checkbox, Spinner   │
│  ├── Single HTML element wrapper or minimal composition     │
│  └── Max: 20 JSX lines, 5 props, 0-1 internal state         │
├─────────────────────────────────────────────────────────────┤
│  COMPOSED (built from primitives)                           │
│  ├── InputField (Label + Input + FormMessage)               │
│  ├── Card (Card + CardHeader + CardContent + CardFooter)    │
│  ├── Dialog, Dropdown, Menu, Toast, SearchBox               │
│  └── Max: 50 JSX lines total, 10 props, 0-2 internal state  │
└─────────────────────────────────────────────────────────────┘
```

**Simple rule:** If it uses other `ui/` components → `composed/`, otherwise → `primitives/`

### Split Indicators for Generic Components

| Indicator                     | Threshold                         | Action                             |
| ----------------------------- | --------------------------------- | ---------------------------------- |
| **JSX lines**                 | > 20 (primitive), > 50 (composed) | MUST split                         |
| **Props count**               | > 5 (primitive), > 10 (composed)  | MUST split or use composition      |
| **Multiple HTML sections**    | > 1 visual area                   | Use compound pattern (composed/)   |
| **Optional sections**         | Any                               | Use slot props or compound pattern |
| **Wrapper + Content pattern** | Any                               | Split wrapper from content         |
| **Repeated elements**         | Any                               | Extract to primitive               |
| **Internal state**            | > 1 useState                      | Extract to hook or split           |

### Core Splitting Patterns

#### Pattern 1: Compound Components (for multi-section composed components)

**When component has multiple distinct sections → Use compound pattern**

```typescript
// ❌ BAD: Monolithic Card with too many props
interface CardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  headerRight?: ReactNode;
  onClose?: () => void;
}

const Card = ({ title, subtitle, icon, children, footer, actions, headerRight, onClose }: CardProps) => {
  return (
    <div className="card">
      <div className="card-header">
        {icon && <span className="card-icon">{icon}</span>}
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {headerRight}
        {onClose && <button onClick={onClose}>×</button>}
      </div>
      <div className="card-content">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
      {actions && <div className="card-actions">{actions}</div>}
    </div>
  );
};

// ✅ GOOD: Compound components - maximum flexibility, minimal props each
// Each sub-component is primitive-sized (< 20 lines)

const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("card", className)}>{children}</div>
);

const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("card-header", className)}>{children}</div>
);

const CardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={cn("card-title", className)}>{children}</h3>
);

const CardDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("card-description", className)}>{children}</p>
);

const CardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("card-content", className)}>{children}</div>
);

const CardFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("card-footer", className)}>{children}</div>
);

// Usage - consumer composes exactly what they need
<Card>
  <CardHeader>
    <Icon name="user" />
    <div>
      <CardTitle>Profile</CardTitle>
      <CardDescription>Manage your account</CardDescription>
    </div>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

#### Pattern 2: Extract Primitives from Composed

**When composed component has distinct pieces → Extract each as primitive**

```typescript
// ❌ BAD: Input with built-in label and error (doing too much)
interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  // ...many more props
}

const Input = ({ label, error, helperText, leftIcon, rightIcon, ...props }: InputProps) => (
  <div className="input-wrapper">
    {label && <label className="input-label">{label}</label>}
    <div className="input-container">
      {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
      <input className="input" {...props} />
      {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
    </div>
    {error && <span className="input-error">{error}</span>}
    {helperText && !error && <span className="input-helper">{helperText}</span>}
  </div>
);

// ✅ GOOD: Separate primitives, compose into composed component

// PRIMITIVE: Input (pure input element)
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("input", className)} {...props} />
  )
);

// PRIMITIVE: Label
const Label = ({ children, htmlFor, className }: LabelProps) => (
  <label htmlFor={htmlFor} className={cn("label", className)}>{children}</label>
);

// PRIMITIVE: FormMessage (for errors/helpers)
const FormMessage = ({ children, variant = "default", className }: FormMessageProps) => (
  <span className={cn("form-message", `form-message-${variant}`, className)}>{children}</span>
);

// COMPOSED: InputField (composes primitives)
const InputField = ({ label, error, helperText, id, ...inputProps }: InputFieldProps) => (
  <div className="input-field">
    {label && <Label htmlFor={id}>{label}</Label>}
    <Input id={id} aria-invalid={!!error} {...inputProps} />
    {error && <FormMessage variant="error">{error}</FormMessage>}
    {helperText && !error && <FormMessage>{helperText}</FormMessage>}
  </div>
);
```

#### Pattern 3: Slot-based Composition for Optional Sections

**When component has optional areas → Use slot props**

```typescript
// ❌ BAD: Boolean props for visibility
interface DialogProps {
  showHeader: boolean;
  showFooter: boolean;
  showCloseButton: boolean;
  title?: string;
  children: ReactNode;
}

// ✅ GOOD: Slots for optional sections
interface DialogProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

const Dialog = ({ children, header, footer }: DialogProps) => (
  <div className="dialog" role="dialog">
    {header}
    <div className="dialog-content">{children}</div>
    {footer}
  </div>
);

// Can also combine with compound pattern
const DialogHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("dialog-header", className)}>{children}</div>
);

const DialogFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("dialog-footer", className)}>{children}</div>
);
```

#### Pattern 4: Variants via Props (Primitives Only)

**Primitives can use variant props - keep simple**

```typescript
// ✅ GOOD: Simple variants via props for primitives
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("btn", `btn-${variant}`, `btn-${size}`, className)}
      {...props}
    >
      {children}
    </button>
  )
);
```

### File Organization for Generic UI

```
ui/
├── primitives/
│   ├── button.tsx                # Simple → file
│   ├── input.tsx                 # Simple → file
│   ├── label.tsx                 # Simple → file
│   ├── badge.tsx                 # Simple → file
│   ├── icon.tsx                  # Simple → file
│   ├── spinner.tsx               # Simple → file
│   ├── formMessage.tsx           # Simple → file
│   └── index.ts                  # Re-export all primitives
│
├── composed/
│   ├── inputField.tsx            # Simple composed → file
│   ├── searchBox.tsx             # Simple composed → file
│   ├── card/                     # Complex (compound parts) → folder
│   │   ├── index.ts              # Export all compound parts
│   │   ├── card.tsx              # Root
│   │   ├── cardHeader.tsx
│   │   ├── cardTitle.tsx
│   │   ├── cardContent.tsx
│   │   └── cardFooter.tsx
│   ├── dialog/                   # Complex → folder
│   │   ├── index.ts
│   │   ├── dialog.tsx
│   │   ├── dialogHeader.tsx
│   │   └── dialogFooter.tsx
│   ├── dropdown/                 # Complex → folder
│   └── index.ts
│
└── index.ts                      # Re-export all
```

### Generic Component Size Limits (STRICT)

| Level     | Max JSX Lines | Max Props | Max useState | Description                     |
| --------- | ------------- | --------- | ------------ | ------------------------------- |
| Primitive | 20            | 5         | 1            | Cannot use other ui/ components |
| Composed  | 50 total      | 10        | 2            | Built from primitives           |

**Note:** Composed "50 total" means the root + all compound parts combined.

### Decision Tree: Split Generic Component?

```
Creating a generic (dumb) component?
│
├── Does it use other ui/ components?
│   ├── NO → PRIMITIVE (ui/primitives/)
│   │   └── Keep ≤ 20 JSX lines, ≤ 5 props
│   │   └── Examples: Button, Input, Label, Badge, Icon
│   │
│   └── YES → COMPOSED (ui/composed/)
│       └── Keep ≤ 50 JSX lines total, ≤ 10 props
│       └── Examples: InputField, Card, Dialog, SearchBox
│
├── Does it have multiple distinct visual sections?
│   └── YES → Use COMPOUND pattern
│       └── Split each section into primitive-sized sub-component
│       └── Examples: Card → Card+Header+Content+Footer
│
├── Does it have optional sections (header?, footer?)?
│   └── YES → Use SLOT pattern or compound components
│
├── Are props > limit for its level?
│   └── YES → Split or use composition
│
├── Is JSX > limit for its level?
│   └── YES → MUST split
│
└── Does it have > 1 useState?
    └── YES → Extract to hook OR split component
```

### Naming Conventions

| Type           | Pattern          | Examples                                    |
| -------------- | ---------------- | ------------------------------------------- |
| Primitive      | `{Name}`         | `Button`, `Input`, `Badge`, `Label`         |
| Composed       | `{Purpose}`      | `InputField`, `SearchBox`, `Card`, `Dialog` |
| Compound parts | `{Parent}{Part}` | `CardHeader`, `CardContent`, `DialogFooter` |
| Loading state  | `{Name}Skeleton` | `CardSkeleton`, `InputSkeleton`             |

### Checklist: Before Writing Generic Component

- [ ] Identified level: Primitive or Composed?
- [ ] Primitive: Does NOT use other `ui/` components?
- [ ] Composed: ONLY uses `ui/primitives/` components?
- [ ] JSX within limit? (20 primitive / 50 composed)
- [ ] Props within limit? (5 primitive / 10 composed)
- [ ] No more than 1 useState (2 for composed)?
- [ ] Using compound pattern for multi-section components?
- [ ] No business logic (pure presentation)?
- [ ] Accepts `className` prop for style extension?
- [ ] Uses `forwardRef` where appropriate?

**If ANY check FAILS → Split first, then implement.**

## Before Implementing

### For Generic Components (`ui/`)

1. Check if component already exists in `ui/`
2. If creating new, ensure NO domain logic
3. Document props with JSDoc (no `@businessRules` needed)

### For Domain Components (`comps/`)

1. **READ existing JSDoc** for `@businessRules` tag
2. **CHECK for companion file** `ComponentName.spec.md`
3. **READ feature README** for business rules summary
4. **ASK if unclear**: "What should happen when X?"

## JSDoc Requirements

### Generic Components

```typescript
/**
 * Reusable button component with multiple variants.
 *
 * @param variant - Visual style: primary, secondary, danger
 * @param size - Button size: sm, md, lg
 * @param disabled - Disable interactions
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 */
```

### Domain Components

```typescript
/**
 * [Description of what component does]
 *
 * @businessRules
 * - [Rule 1: condition → behavior]
 * - [Rule 2: condition → behavior]
 *
 * @permissions
 * - [Role]: [allowed actions]
 *
 * @edgeCases
 * - [Edge case]: [how to handle]
 *
 * @example
 * <ComponentName prop={value} />
 */
```

## Feature README Template

Each feature should have a README.md:

```markdown
# {Feature Name}

## Purpose

[What this feature does and why it exists]

## Business Rules Summary

- [Key rule 1]
- [Key rule 2]
- [Key rule 3]

## Folder Structure

- `comps/` - Business components (compose from `ui/`, see JSDoc for rules)
- `services/` - Business logic and API calls
- `stores/` - State management with atomirx
- `pages/` - Full page compositions
- `utils/` - Feature-specific utilities
- `types/` - Feature-specific types

**Note:** Features MUST NOT have `ui/` folder. Use shared `ui/` components.

## Key Files

- `comps/componentName.tsx` - [brief description]
- `services/feature.service.ts` - [brief description]
- `stores/feature.store.ts` - [brief description]

## Dependencies

- Depends on: [other features if any]
- Used by: [features that depend on this]
```

## Decision Tree: Where to Put New Code?

```
Is it a React component?
├── YES
│   ├── Does it have business logic / domain rules?
│   │   ├── YES → features/{domain}/comps/
│   │   └── NO (generic/dumb component)
│   │       └── ALWAYS → ui/ (top-level)
│   ├── Is it a full page?
│   │   └── YES → features/{domain}/pages/
│   └── Is it a layout component?
│       └── YES → routes/layouts/
└── NO
    ├── Is it state management?
    │   └── YES → features/{domain}/stores/
    ├── Is it business logic / API?
    │   └── YES → features/{domain}/services/
    ├── Is it a hook?
    │   ├── Feature-specific?
    │   │   ├── YES → features/{domain}/hooks/ or inline
    │   │   └── NO → shared/hooks/
    ├── Is it a utility function?
    │   ├── Feature-specific?
    │   │   ├── YES → features/{domain}/utils/
    │   │   └── NO → shared/utils/
    └── Is it a type definition?
        ├── Feature-specific?
        │   ├── YES → features/{domain}/types/
        │   └── NO → shared/types/
```

## Cross-Feature Dependencies

### Allowed

- Any feature can import from `ui/`
- Any feature can import from `shared/`
- Routes can import from any feature's `pages/` (direct path)
- Cross-feature imports use explicit paths

### Not Allowed

- Features MUST NOT have their own `ui/` folder
- MUST NOT use barrel imports for cross-feature (no `index.ts` at feature root)

```typescript
// ✅ GOOD - explicit path imports
import { TodoItem } from "@/features/todos/comps/todoItem";
import { TodosPage } from "@/features/todos/pages/todosPage";
import { todoStore } from "@/features/todos/stores/todo.store";

// ❌ BAD - barrel import (feature index.ts is forbidden)
import { TodoItem } from "@/features/todos";
```

## Checklist Before Implementation

### 1. Location Check

- [ ] Identified correct folder based on decision tree
- [ ] Checked for existing similar components

### 2. Business Rules Check (for domain components)

- [ ] Read `@businessRules` in JSDoc
- [ ] Checked for `.spec.md` companion file
- [ ] Read feature README for rules summary

### 3. Generic Component Splitting Check (for `ui/` components only)

- [ ] Identified level: Primitive or Composed?
- [ ] JSX within limit? (20 primitive / 50 composed)
- [ ] Props within limit? (5 primitive / 10 composed)
- [ ] useState ≤ 1? (≤ 2 for composed)
- [ ] Multi-section component → using compound pattern?
- [ ] No business logic (pure presentation)?
- [ ] Accepts `className` prop?
- [ ] Uses `forwardRef` where appropriate?

**If ANY check FAILS → Split first, then implement.**

### 4. After Implementation

- [ ] Each sub-component is at primitive-level size (≤ 20 JSX lines)
- [ ] Compound parts are independently usable
- [ ] File organization follows primitives/composed structure
- [ ] All parts exported from index.ts
