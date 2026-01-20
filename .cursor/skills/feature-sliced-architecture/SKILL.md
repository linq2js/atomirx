# Feature-Sliced Architecture Skill

Guide for working with feature-sliced architecture in this project. Use when implementing components, pages, services, or stores within the `features/` directory structure.

## Table of Contents

- [Trigger Conditions](#trigger-conditions)
- [Directory Structure](#directory-structure)
- [Critical Rules](#critical-rules)
  - [Feature Changes: README First](#feature-changes-readme-first-strict)
  - [No Barrel Exports for Top-Level Feature Dirs](#no-barrel-exports-for-top-level-feature-dirs-strict)
  - [File Naming: camelCase](#file-naming-camelcase-strict)
  - [Index Files](#index-files-strict)
  - [One Component Per File](#one-component-per-file-strict)
  - [UI Component Location](#ui-component-location-strict)
- [Path-Based Detection Rules](#path-based-detection-rules)
- [Component Classification](#component-classification)
- [Component Splitting Rules by Type](#component-splitting-rules-by-type)
  - [Domain Components](#domain-component-splitting-rules-mandatory)
  - [Generic UI Components](#generic-ui-component-splitting-rules-mandatory)
  - [Exceptions: When .pure.tsx is NOT Required](#exceptions-when-puretsx-is-not-required)
- [Component Pattern](#component-pattern-mandatory)
- [Hook Code Organization](#hook-code-organization-strict)
- [Cross-Feature Dependencies](#cross-feature-dependencies)
  - [Dependency Rules](#allowed)
  - [Cross-Feature Communication](#cross-feature-communication-patterns)
- [Feature Boundaries](#feature-boundary-guidelines)
- [Troubleshooting](#troubleshooting)
- [Migration Guide](#migration-from-legacy-code)
- [Checklists](#checklist-before-implementation)

## Trigger Conditions

Use this skill when:

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
│   │   └── types/               # Feature-specific types
│   │   # NOTE: NO index.ts at feature root — see "No Barrel Exports" rule
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
│   ├── avatar/                   # ALL comps use folder structure
│   │   └── index.ts              # ✅ OK - barrel for component
│   └── loginForm/
│       └── index.ts              # ✅ OK - barrel for component
│
├── pages/
│   ├── index.ts                  # ❌ FORBIDDEN - no barrel for pages/
│   ├── settingsPage/             # ALL pages use folder structure
│   │   └── index.ts              # ✅ OK - barrel for page
│   └── authPage/
│       └── index.ts              # ✅ OK - barrel for page
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
// loginForm/index.ts only exports loginForm.tsx, loginForm.pure.tsx
import { LoginForm } from "../comps/loginForm"; // Loads: only LoginForm + its Pure
```

**Impact comparison:**

| Import style                             | What gets loaded | Side effects                |
| ---------------------------------------- | ---------------- | --------------------------- |
| `from "../comps"` (barrel)               | ALL comps        | High - unused code executed |
| `from "@/features/auth"` (barrel)        | ALL feature code | High - unused code executed |
| `from "@/features/auth/comps/loginForm"` | Only LoginForm   | Low - single component      |

**Single component folder barrel is OK** because:

- Scope is limited to one component
- Only loads that component's files (`.tsx`, `.pure.tsx`, `.styles.css`)
- No risk of loading unrelated components

### File Naming: camelCase (STRICT)

**AI MUST use camelCase for all code file names.**

```
✅ CORRECT (camelCase):
   authPage.tsx
   authPage.pure.tsx
   registerForm.tsx
   loginForm.pure.tsx
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

### Page File Structure (MANDATORY — Always Use Folder)

**ALL pages MUST use folder structure:**

```
pages/
├── authPage/
│   ├── index.ts                  # export { AuthPage } from "./authPage"
│   ├── authPage.tsx              # useAuthPageLogic hook + AuthPage container
│   ├── authPage.pure.tsx         # AuthPagePure presentation (Storybook-ready)
│   ├── authLoadingState.tsx      # Page-private view state (simple, no .pure)
│   ├── authUnsupportedState.tsx  # Page-private view state (simple, no .pure)
│   └── authLayout.tsx            # Page-private layout
│
├── settingsPage/                 # Even simple pages use folder
│   ├── index.ts
│   ├── settingsPage.tsx
│   └── settingsPage.pure.tsx
│
└── profilePage/
    ├── index.ts
    ├── profilePage.tsx
    └── profilePage.pure.tsx
```

**Rules:**

1. **ALL pages** → `pages/myPage/` folder structure (no single file pages)
2. **Every page folder MUST have:**
   - `index.ts` — barrel export
   - `myPage.tsx` — logic hook + container
   - `myPage.pure.tsx` — presentation component
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
│   ├── authPage/                     # Complex page (has hook + Pure)
│   │   ├── index.ts                  # ✅ OK - complex folder barrel
│   │   ├── authPage.tsx              # useAuthPageLogic + AuthPage container
│   │   ├── authPage.pure.tsx         # AuthPagePure presentation
│   │   ├── authLoadingState.tsx      # Private to AuthPage (simple)
│   │   └── authUnsupportedState.tsx  # Private to AuthPage (simple)
│   │
│   └── resetPasswordPage/            # ALL pages use folder structure
│       ├── index.ts
│       ├── resetPasswordPage.tsx
│       └── resetPasswordPage.pure.tsx
│
├── comps/
│   ├── registerForm/                 # ALL comps use folder structure
│   │   ├── index.ts
│   │   ├── registerForm.tsx          # useRegisterFormLogic + container
│   │   └── registerForm.pure.tsx     # RegisterFormPure presentation
│   ├── loginForm/
│   │   ├── index.ts
│   │   ├── loginForm.tsx
│   │   └── loginForm.pure.tsx
│   └── passkeyPrompt/                # Even simple comps use folder
│       ├── index.ts
│       ├── passkeyPrompt.tsx
│       └── passkeyPrompt.pure.tsx
│
├── services/
│   └── auth.service.ts
│
└── stores/
    └── auth.store.ts
```

### Component File Structure (MANDATORY — Always Use Folder)

**This rule applies to ALL components: pages, comps, and ui.**

**ALL components MUST use folder structure:**

```
comps/
├── avatar/                       # ALL comps use folder
│   ├── index.ts
│   ├── avatar.tsx
│   └── avatar.pure.tsx
├── statusBadge/
│   ├── index.ts
│   ├── statusBadge.tsx
│   └── statusBadge.pure.tsx
└── articleList/
    ├── index.ts
    ├── articleList.tsx           # useArticleListLogic hook + container
    ├── articleList.pure.tsx      # ArticleListPure presentation (Storybook-ready)
    └── articleList.styles.css    # Optional: styles

ui/primitives/
├── button/                       # ALL primitives use folder
│   ├── index.ts
│   ├── button.tsx
│   └── button.pure.tsx
├── label/
│   ├── index.ts
│   ├── label.tsx
│   └── label.pure.tsx
└── index.ts

ui/composed/
├── card/                         # Compound parts in same folder
│   ├── index.ts
│   ├── card.tsx
│   ├── card.pure.tsx
│   ├── cardHeader.tsx            # Compound part (simple, no .pure)
│   ├── cardContent.tsx
│   └── cardFooter.tsx
├── inputField/
│   ├── index.ts
│   ├── inputField.tsx
│   └── inputField.pure.tsx
└── index.ts
```

**❌ FORBIDDEN:**

- Single file components (`avatar.tsx` at comps/ level)
- Components without `index.ts` barrel export

**✅ REQUIRED for every component:**

| File             | Required | Contains                       |
| ---------------- | -------- | ------------------------------ |
| `index.ts`       | YES      | Barrel exports                 |
| `xxx.tsx`        | YES      | Logic hook + Container         |
| `xxx.pure.tsx`   | YES      | Presentation (Storybook-ready) |
| `xxx.styles.css` | Optional | Styles                         |

### Exceptions: When `.pure.tsx` is NOT Required

The `.pure.tsx` requirement has specific exceptions for simplicity:

**1. Compound Component Parts (simple sub-components)**

```
ui/composed/card/
├── card.tsx
├── card.pure.tsx          # ✅ Main component needs .pure
├── cardHeader.tsx         # ✅ OK - simple compound part, no .pure needed
├── cardContent.tsx        # ✅ OK - simple compound part
└── cardFooter.tsx         # ✅ OK - simple compound part
```

Compound parts are exempt when:

- They are < 15 JSX lines
- They have no hooks or state
- They are only used within their parent compound component

**2. Page-Private View States (simple conditional renders)**

```
pages/authPage/
├── authPage.tsx
├── authPage.pure.tsx      # ✅ Main page needs .pure
├── authLoadingState.tsx   # ✅ OK - simple view state, no .pure needed
└── authUnsupportedState.tsx  # ✅ OK - simple view state
```

Page-private view states are exempt when:

- They are < 20 JSX lines
- They have no props or only 1-2 simple props
- They are only used by their parent page
- They are NOT exported from the page's index.ts

**3. UI Primitives (optional simplified pattern)**

Primitives in `ui/primitives/` MAY use a simplified single-file pattern when:

- They have no state (0 useState)
- They have ≤ 5 props
- They are ≤ 20 JSX lines
- They only wrap a single HTML element

```
ui/primitives/label/
├── index.ts
└── label.tsx              # ✅ OK - single file for stateless primitive
```

However, if a primitive has any logic or state, full pattern is required:

```
ui/primitives/checkbox/
├── index.ts
├── checkbox.tsx           # Has controlled/uncontrolled logic
└── checkbox.pure.tsx      # Required when logic exists
```

**Rule of thumb:** If you can test all states by just passing different props (no mocking needed), `.pure.tsx` is optional.

**File structure inside folder (STRICT):**

```
componentName/
├── index.ts              # Barrel export all public APIs
├── componentName.tsx     # Logic hook + Container component
├── componentName.pure.tsx  # Presentation component (Storybook-ready)
├── componentName.styles.css  # Optional: styles
└── componentName.test.tsx    # Optional: tests
```

| File             | Contains                          | Exports                               |
| ---------------- | --------------------------------- | ------------------------------------- |
| `xxx.tsx`        | Logic hook + Container component  | `useXxxLogic`, `Xxx`                  |
| `xxx.pure.tsx`   | Presentation component (no state) | `XxxPure`, `XxxPureProps`             |
| `xxx.styles.css` | Styles (optional)                 | -                                     |
| `index.ts`       | Barrel exports                    | Re-export from `.tsx` and `.pure.tsx` |

**Rules (STRICT):**

1. **Container** (`Xxx`) calls `useXxxLogic()` and renders `<XxxPure {...result} />`
2. **Presentation** (`XxxPure`) is pure — no hooks, no state, only props
3. **Logic hook** (`useXxxLogic`) returns exactly `XxxPureProps`
4. **Storybook** uses `XxxPure` directly with mock props
5. **Tests** can test hook and UI separately

### Component Pattern (MANDATORY)

**This pattern applies to domain components (pages, comps) and stateful generic UI.**

For exceptions (simple primitives, compound parts, page-private states), see [Exceptions: When .pure.tsx is NOT Required](#exceptions-when-puretsx-is-not-required).

```
componentName/
├── index.ts
├── componentName.tsx      # Hook + Container (or just component for simple cases)
└── componentName.pure.tsx   # Presentation (Storybook-ready) — see exceptions
```

**Pattern Requirements by Component Type:**

| Type               | Folder Required  | `.pure.tsx` Required | `useXxxLogic` Required |
| ------------------ | ---------------- | -------------------- | ---------------------- |
| Domain Page        | YES              | YES                  | YES                    |
| Domain Comp        | YES              | YES                  | YES                    |
| Composed UI        | YES              | YES                  | YES (if stateful)      |
| Primitive UI       | YES              | Optional\*           | Optional\*             |
| Compound Part      | In parent folder | NO                   | NO                     |
| Page-Private State | In parent folder | NO                   | NO                     |

\*Primitives with 0 state, ≤5 props, ≤20 JSX lines may use single-file pattern.

**File: `componentName.pure.tsx` — Presentation Component**

```typescript
// loginForm.pure.tsx
// Pure presentation, no state, no hooks — perfect for Storybook

export interface LoginFormPureProps {
  /** Current loading state */
  isLoading: boolean;
  /** Error message to display */
  error: string | null;
  /** Handler for form submission */
  onSubmit: () => void;
  /** Handler for switch to register */
  onSwitchToRegister: () => void;
}

/**
 * Presentation component for LoginForm.
 * Use this in Storybook to test all visual states.
 */
export function LoginFormPure({
  isLoading,
  error,
  onSubmit,
  onSwitchToRegister,
}: LoginFormPureProps) {
  return (
    <div className="space-y-6">
      <h2>Welcome Back</h2>

      {error && <ErrorAlert message={error} />}

      <Button onClick={onSubmit} isLoading={isLoading}>
        Sign in with Passkey
      </Button>

      <button onClick={onSwitchToRegister}>
        Create a new account
      </button>
    </div>
  );
}
```

**File: `componentName.tsx` — Logic Hook + Container**

```typescript
// loginForm.tsx
import { LoginFormPure, LoginFormPureProps } from "./loginForm.pure";

export interface LoginFormProps {
  /** Callback when login succeeds */
  onSuccess?: () => void;
}

/**
 * Logic hook for LoginForm.
 * Test this with renderHook() — no rendering needed.
 *
 * @param props - Component props
 * @returns Props for LoginFormPure
 */
export function useLoginFormLogic(props: LoginFormProps): LoginFormPureProps {
  const auth = authStore();
  const { authError, isLoading } = useSelector(({ read }) => ({
    authError: read(auth.authError$),
    isLoading: read(auth.isLoading$),
  }));

  const stable = useStable({
    onSubmit: async () => {
      const result = await auth.login();
      if (result.success) props.onSuccess?.();
    },
    onSwitchToRegister: () => {
      auth.clearError();
      // navigation logic
    },
  });

  return {
    isLoading,
    error: authError?.message ?? null,
    ...stable,
  };
}

/**
 * Container component — connects logic to UI.
 * Use this at runtime in the app.
 */
export function LoginForm(props: LoginFormProps) {
  const pureProps = useLoginFormLogic(props);
  return <LoginFormPure {...pureProps} />;
}
```

**File: `index.ts` — Barrel Export**

```typescript
// index.ts
export { LoginForm, useLoginFormLogic } from "./loginForm";
export type { LoginFormProps } from "./loginForm";
export { LoginFormPure } from "./loginForm.pure";
export type { LoginFormPureProps } from "./loginForm.pure";
```

### Why This Pattern (Testability + Storybook)

**1. Test Logic — No rendering needed:**

```typescript
import { renderHook } from "@testing-library/react";
import { useLoginFormLogic } from "./loginForm";

it("should show error from auth store", () => {
  // Mock the store to return error
  const { result } = renderHook(() => useLoginFormLogic({}));
  expect(result.current.error).toBe("Invalid credentials");
});
```

**2. Test UI — Pure component with props:**

```typescript
import { render, screen } from "@testing-library/react";
import { LoginFormPure } from "./loginForm.pure";

it("should show error message", () => {
  render(
    <LoginFormPure
      isLoading={false}
      error="Invalid credentials"
      onSubmit={jest.fn()}
      onSwitchToRegister={jest.fn()}
    />
  );
  expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
});
```

**3. Storybook — All visual states:**

```typescript
// loginForm.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { LoginFormPure } from "./loginForm.pure";

const meta: Meta<typeof LoginFormPure> = {
  component: LoginFormPure,
};
export default meta;

type Story = StoryObj<typeof LoginFormPure>;

export const Default: Story = {
  args: {
    isLoading: false,
    error: null,
    onSubmit: () => {},
    onSwitchToRegister: () => {},
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true,
  },
};

export const WithError: Story = {
  args: {
    ...Default.args,
    error: "Invalid credentials. Please try again.",
  },
};
```

### Complete Example: AuthPage

```
features/auth/pages/authPage/
├── index.ts
├── authPage.tsx           # useAuthPageLogic + AuthPage container
├── authPage.pure.tsx      # AuthPagePure presentation
├── authLoadingState.tsx   # Private sub-component (simple, no .pure)
└── authUnsupportedState.tsx
```

```typescript
// authPage.pure.tsx
export interface AuthPagePureProps {
  view: "checking" | "register" | "login" | "unsupported";
  username: string;
  isLoading: boolean;
  error: string | null;
  showPasskeyPrompt: boolean;
  setUsername: (value: string) => void;
  onRegister: () => void;
  onLogin: () => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
}

export function AuthPagePure(props: AuthPagePureProps) {
  const { view, ...rest } = props;

  if (view === "checking") return <AuthLoadingState />;
  if (view === "unsupported") return <AuthUnsupportedState />;

  return (
    <AuthLayout>
      {view === "register" ? (
        <RegisterForm {...rest} />
      ) : (
        <LoginForm {...rest} />
      )}
      {props.showPasskeyPrompt && <PasskeyPrompt />}
    </AuthLayout>
  );
}

// authPage.tsx
import { AuthPagePure, AuthPagePureProps } from "./authPage.pure";

export interface AuthPageProps {}

export function useAuthPageLogic(props: AuthPageProps): AuthPagePureProps {
  // ... all logic here, returns AuthPagePureProps
}

export function AuthPage(props: AuthPageProps) {
  const pureProps = useAuthPageLogic(props);
  return <AuthPagePure {...pureProps} />;
}
```

### Checklist: Before Writing Component/Page (MANDATORY)

**❌ FORBIDDEN:**

- Single file components (`avatar.tsx` at folder level)
- Writing component without folder structure
- Writing component without `componentName.pure.tsx` presentation file
- Putting hooks/state in `.pure.tsx` files
- Returning type different from `XxxPureProps` in `useXxxLogic`
- Creating `.logic.ts` files (use `.tsx` for logic + container)

**✅ REQUIRED (every component/page MUST have):**

- [ ] Folder structure: `componentName/` directory
- [ ] `index.ts` — barrel exports all public APIs
- [ ] `componentName.tsx` — logic hook + container
- [ ] `componentName.pure.tsx` — presentation component (Storybook-ready)
- [ ] `useXxxLogic` returns exactly `XxxPureProps`
- [ ] `XxxPure` has no hooks, no state — only props
- [ ] Total lines < 100 (page) or < 150 (comp)

**If ANY check FAILS → Fix structure first, then implement.**

### Hook Code Organization (STRICT)

**AI MUST follow this ordering in `useXxxLogic` hooks (inside `componentName.tsx`):**

```typescript
export function useXxxLogic(props: XxxProps): XxxPureProps {
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
  // NOTE: useStable is a custom hook that memoizes callbacks with stable references.
  // If unavailable, use useCallback with empty deps [] for stable refs,
  // or implement: const useStable = <T extends Record<string, Function>>(fns: T): T => {
  //   const ref = useRef(fns); ref.current = fns;
  //   return useMemo(() => Object.fromEntries(
  //     Object.keys(fns).map(k => [k, (...args) => ref.current[k](...args)])
  //   ) as T, []);
  // };
  const stable = useStable({
    onSubmit: () => { /* ... */ },
    onChange: () => { /* ... */ },
  });

  // 7. Effects (useEffect, useLayoutEffect) — ALWAYS LAST
  useEffect(() => {
    // Side effects after all setup is done
  }, [dependency]);

  // 8. Return XxxPureProps
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
    ...stable,
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

**Every `useXxxLogic` hook in `.tsx` files MUST have comprehensive JSDoc.**

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

**Required JSDoc sections for `useXxxLogic` hooks:**

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

**ALL UI components MUST use folder structure:**

```
ui/
├── primitives/
│   ├── button/                   # ALL primitives use folder
│   │   ├── index.ts
│   │   ├── button.tsx
│   │   └── button.pure.tsx
│   ├── input/
│   │   ├── index.ts
│   │   ├── input.tsx
│   │   └── input.pure.tsx
│   ├── label/
│   │   ├── index.ts
│   │   ├── label.tsx
│   │   └── label.pure.tsx
│   ├── badge/
│   │   ├── index.ts
│   │   ├── badge.tsx
│   │   └── badge.pure.tsx
│   ├── icon/
│   │   ├── index.ts
│   │   ├── icon.tsx
│   │   └── icon.pure.tsx
│   ├── spinner/
│   │   ├── index.ts
│   │   ├── spinner.tsx
│   │   └── spinner.pure.tsx
│   └── index.ts                  # Re-export all primitives
│
├── composed/
│   ├── inputField/               # ALL composed use folder
│   │   ├── index.ts
│   │   ├── inputField.tsx
│   │   └── inputField.pure.tsx
│   ├── searchBox/
│   │   ├── index.ts
│   │   ├── searchBox.tsx
│   │   └── searchBox.pure.tsx
│   ├── card/                     # Compound parts in same folder
│   │   ├── index.ts
│   │   ├── card.tsx
│   │   ├── card.pure.tsx
│   │   ├── cardHeader.tsx        # Compound part (simple, no .pure)
│   │   ├── cardTitle.tsx
│   │   ├── cardContent.tsx
│   │   └── cardFooter.tsx
│   ├── dialog/
│   │   ├── index.ts
│   │   ├── dialog.tsx
│   │   ├── dialog.pure.tsx
│   │   ├── dialogHeader.tsx      # Compound part
│   │   └── dialogFooter.tsx
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

**Structure (MANDATORY):**

- [ ] Using folder structure: `componentName/` directory
- [ ] Has `index.ts` — barrel exports
- [ ] Has `componentName.tsx` — logic hook + container
- [ ] Has `componentName.pure.tsx` — presentation component

**Design:**

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

**If ANY check FAILS → Fix first, then implement.**

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

### Cross-Feature Import Rules for Services/Stores (STRICT)

**Allowed cross-feature imports:**

| From Feature | Can Import From Other Features                  |
| ------------ | ----------------------------------------------- |
| `pages/`     | Other features' `comps/`, `stores/` (read-only) |
| `comps/`     | Other features' `stores/` (read-only)           |
| `stores/`    | ❌ FORBIDDEN — stores must be independent       |
| `services/`  | Other features' `services/` (carefully)         |

**Rules:**

1. **Stores are isolated** — A feature's store MUST NOT import another feature's store directly
2. **Services can compose** — Services may call other features' services for orchestration
3. **Components can read** — Components may read (not write) other features' stores
4. **Pages orchestrate** — Pages can import from multiple features to compose views

**When cross-feature dependency grows:**

```
Feature A imports many things from Feature B?
│
├── > 3 imports from Feature B
│   └── Consider: Are A and B actually one feature?
│       ├── YES → Merge into single feature
│       └── NO → Extract shared logic to `shared/`
│
└── Circular dependency detected?
    └── MUST extract shared logic to `shared/` or use events
```

### Cross-Feature Communication Patterns

When features need to communicate without direct imports, use these patterns:

**1. Event-Based Communication (loosely coupled)**

```typescript
// shared/events/featureEvents.ts
import { createEventBus } from "@/shared/utils/eventBus";

export const featureEvents = createEventBus<{
  "auth:logout": void;
  "auth:sessionExpired": { reason: string };
  "todos:created": { id: string; title: string };
  "sync:completed": { feature: string; count: number };
}>();

// Usage in features/auth/stores/auth.store.ts
import { featureEvents } from "@/shared/events/featureEvents";

// Emit event when logging out
featureEvents.emit("auth:logout");

// Usage in features/todos/stores/todo.store.ts
import { featureEvents } from "@/shared/events/featureEvents";

// Listen for auth events
featureEvents.on("auth:logout", () => {
  // Clear todos when user logs out
  clearLocalTodos();
});
```

**2. Shared State in `shared/` (common data)**

```typescript
// shared/stores/user.store.ts
// For data needed by multiple features (current user, preferences, etc.)
import { define, atom } from "atomirx";

export const userStore = define(() => {
  const currentUser$ = atom<User | null>(null);
  const preferences$ = atom<Preferences>(defaultPreferences);

  return { currentUser$, preferences$ };
});

// Any feature can import and use
import { userStore } from "@/shared/stores/user.store";
```

**3. Callback Props (parent orchestrates)**

```typescript
// features/auth/comps/loginForm/loginForm.tsx
interface LoginFormProps {
  onLoginSuccess: (user: User) => void;  // Parent handles cross-feature logic
}

// features/auth/pages/authPage/authPage.tsx
const AuthPage = () => {
  const navigate = useNavigate();

  return (
    <LoginForm
      onLoginSuccess={(user) => {
        // Orchestration happens at page level
        syncStore().startSync(user.id);
        navigate("/dashboard");
      }}
    />
  );
};
```

**When to use each pattern:**

| Pattern        | Use When                                               |
| -------------- | ------------------------------------------------------ |
| Events         | Fire-and-forget notifications, multiple listeners      |
| Shared State   | Data needed by 3+ features                             |
| Callback Props | Parent knows about both features, simple orchestration |

## Feature Boundary Guidelines

### When to Create a New Feature

Create a new feature folder when ALL of these apply:

- [ ] **Distinct business domain** — Has its own vocabulary (auth, payments, notifications)
- [ ] **Separate ownership** — Could be developed/maintained by a different team
- [ ] **Independent business rules** — Has its own invariants and constraints
- [ ] **Deployable scope** — Could theoretically be released independently

### When NOT to Create a New Feature

Keep code in existing feature when:

- It's just a sub-page of an existing feature (use `pages/subPage/` instead)
- It's a variation of existing business logic (extend existing service)
- It would create tight coupling back to the original feature
- It's purely for code organization (use folders within feature instead)

### Feature Size Limits

| Metric                 | Soft Limit | Hard Limit | Action if exceeded          |
| ---------------------- | ---------- | ---------- | --------------------------- |
| Components in `comps/` | 10         | 15         | Consider splitting feature  |
| Services               | 5          | 7          | Extract shared to `shared/` |
| Stores                 | 3          | 5          | Merge related stores        |
| Pages                  | 5          | 8          | Consider sub-features       |

### Splitting Large Features

When a feature grows too large:

```
features/ecommerce/          # TOO BIG
├── comps/                   # 20+ components
├── pages/                   # 10+ pages
└── stores/                  # 6+ stores

↓ Split into sub-features ↓

features/
├── cart/                    # Cart management
│   ├── comps/
│   ├── pages/
│   └── stores/
├── checkout/                # Checkout flow
│   ├── comps/
│   ├── pages/
│   └── stores/
├── products/                # Product catalog
│   ├── comps/
│   ├── pages/
│   └── stores/
└── orders/                  # Order history
    ├── comps/
    ├── pages/
    └── stores/
```

## Troubleshooting

### Issue: Circular Dependencies

**Symptoms:** Import errors, runtime failures, "Cannot access X before initialization"

**Common causes:**

- Feature A imports from Feature B, and B imports from A
- Service imports store that imports same service
- Component imports hook that imports same component

**Solutions:**

1. **Extract shared logic to `shared/`**

   ```
   // Before: auth.store.ts ↔ user.service.ts circular
   // After:
   shared/stores/currentUser.store.ts  # Shared state
   features/auth/stores/auth.store.ts  # Auth-specific
   features/auth/services/user.service.ts  # Uses shared store
   ```

2. **Use event-based communication**

   ```typescript
   // Instead of: featureA imports featureB.store
   // Use: featureA emits event, featureB listens
   featureEvents.emit("auth:logout");
   ```

3. **Dependency injection via props/callbacks**
   ```typescript
   // Instead of: component imports store directly
   // Pass data/callbacks from parent that orchestrates
   ```

### Issue: Component Too Large (>150 lines)

**Symptoms:** Hard to read, test, or modify; multiple responsibilities

**Solutions:**

1. **Extract sub-components**

   ```typescript
   // Before: 200-line component with inline forms
   // After: Main component + FormSection + ResultsSection
   ```

2. **Extract logic to hook**

   ```typescript
   // Before: 50 lines of logic in component
   // After: useXxxLogic hook, component just renders
   ```

3. **Split into page + comps**
   ```typescript
   // Before: Page doing everything
   // After: Page orchestrates, comps handle sections
   ```

### Issue: Feature Coupling (Feature A heavily imports from Feature B)

**Symptoms:** > 5 imports from another feature, changes to B break A

**Solutions:**

1. **Merge features** — If tightly coupled, they might be one feature

   ```
   features/auth/ + features/profile/ → features/user/
   ```

2. **Extract shared logic** — Common code goes to `shared/`

   ```
   features/auth/utils/validation.ts → shared/utils/validation.ts
   ```

3. **Use events** — Replace direct imports with event communication

### Issue: Unclear Where Code Belongs

**Decision process:**

```
Is it a React component?
├── Generic (no business rules)? → ui/
├── Has business rules? → features/{domain}/comps/
└── Full page? → features/{domain}/pages/

Is it state management?
├── Used by one feature? → features/{domain}/stores/
└── Used by 3+ features? → shared/stores/

Is it a utility?
├── Pure function, generic? → shared/utils/
├── Feature-specific? → features/{domain}/utils/
└── Has side effects? → Probably a service
```

### Issue: Store Growing Too Large

**Symptoms:** Store file > 200 lines, hard to understand state shape

**Solutions:**

1. **Split by concern**

   ```typescript
   // Before: auth.store.ts (300 lines)
   // After:
   auth.store.ts        # Main auth state
   authUI.store.ts      # UI state (modals, forms)
   authCache.store.ts   # Cached data
   ```

2. **Extract derived state to selectors**
   ```typescript
   // Move complex computations out of store definition
   // features/auth/selectors/auth.selectors.ts
   ```

## Migration from Legacy Code

### Phase 1: Structure Migration (Non-Breaking)

**Goal:** Move files to FSA structure without changing behavior.

1. **Create feature folders**

   ```
   mkdir -p features/{domain}/{comps,pages,services,stores,utils,types}
   ```

2. **Move files following conventions**

   ```
   src/components/Auth/ → features/auth/comps/
   src/pages/AuthPage.tsx → features/auth/pages/authPage/
   src/services/authService.ts → features/auth/services/auth.service.ts
   ```

3. **Update imports to absolute paths**

   ```typescript
   // Before
   import { AuthForm } from "../../components/Auth/AuthForm";
   // After
   import { AuthForm } from "@/features/auth/comps/authForm";
   ```

4. **Add feature README.md**
   - Document current business rules
   - List key files and responsibilities

### Phase 2: Component Splitting (Incremental)

**Goal:** Split large components into FSA pattern.

1. **Identify candidates** — Components > 100 lines
2. **For each component:**

   ```
   a. Create folder: comps/myComponent/
   b. Extract presentation: myComponent.pure.tsx
   c. Extract logic: useMyComponentLogic in myComponent.tsx
   d. Add barrel: index.ts
   e. Update imports
   f. Run tests
   ```

3. **Prioritize by:**
   - Frequency of changes (volatile code benefits most)
   - Test coverage needs
   - Team pain points

### Phase 3: Business Rules Documentation

**Goal:** Make business rules explicit and testable.

1. **Add `@businessRules` JSDoc** to domain components
2. **Create feature README** with rules summary
3. **Add tests** covering documented rules
4. **Review with domain experts**

### Migration Checklist

For each legacy component/feature:

- [ ] Created folder structure
- [ ] Moved files with correct naming (camelCase)
- [ ] Updated all imports to absolute paths
- [ ] Split into .tsx + .pure.tsx (if needed)
- [ ] Added index.ts barrel exports
- [ ] Added JSDoc with @businessRules (if domain component)
- [ ] Updated/created feature README.md
- [ ] All tests pass
- [ ] No circular dependencies introduced

## Checklist Before Implementation

### 1. Structure Check (MANDATORY for ALL components)

- [ ] Using folder structure: `componentName/` directory
- [ ] Has `index.ts` — barrel exports
- [ ] Has `componentName.tsx` — logic hook + container
- [ ] Has `componentName.pure.tsx` — presentation component (Storybook-ready)

### 2. Location Check

- [ ] Identified correct folder based on decision tree
- [ ] Checked for existing similar components

### 3. Business Rules Check (for domain components)

- [ ] Read `@businessRules` in JSDoc
- [ ] Checked for `.spec.md` companion file
- [ ] Read feature README for rules summary

### 4. Generic Component Splitting Check (for `ui/` components only)

- [ ] Identified level: Primitive or Composed?
- [ ] JSX within limit? (20 primitive / 50 composed)
- [ ] Props within limit? (5 primitive / 10 composed)
- [ ] useState ≤ 1? (≤ 2 for composed)
- [ ] Multi-section component → using compound pattern?
- [ ] No business logic (pure presentation)?
- [ ] Accepts `className` prop?
- [ ] Uses `forwardRef` where appropriate?

**If ANY check FAILS → Fix first, then implement.**

### 5. After Implementation

- [ ] Each sub-component is at primitive-level size (≤ 20 JSX lines)
- [ ] Compound parts are independently usable
- [ ] File organization follows folder structure
- [ ] All parts exported from index.ts
