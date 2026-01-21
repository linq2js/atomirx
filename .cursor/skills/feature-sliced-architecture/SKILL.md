# Feature-Sliced Architecture Skill

Guide for working with feature-sliced architecture in this project. Use when implementing components, screens, services, or stores within the `features/` directory structure.

> **Mobile-First Terminology (STRICT)**: This project uses `screens` for full-view compositions. The term `page` is **FORBIDDEN**. This aligns with mobile development conventions (React Native, Flutter) and works for cross-platform projects. For web, `screens` maps to route-level components.

## Table of Contents

- [Trigger Conditions](#trigger-conditions)
- [Directory Structure](#directory-structure)
- [Sub-Features](#sub-features)
- [Critical Rules](#critical-rules)
  - [Feature Changes: README First](#feature-changes-readme-first-strict)
  - [No Barrel Exports for Top-Level Feature Dirs](#no-barrel-exports-for-top-level-feature-dirs-strict)
  - [File Naming: camelCase](#file-naming-camelcase-strict)
  - [Index Files](#index-files-strict)
  - [One Component Per File](#one-component-per-file-strict)
  - [UI Component Location](#ui-component-location-strict)
  - [Service Rules](#service-rules-strict)
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

- Creating new components, services, stores, or screens
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
│   │   ├── screens/             # Full screen compositions (mobile-first)
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

## Sub-Features

Features can have unlimited sub-features using **dash notation** (`-`). Sub-features follow the **same FSA rules** as regular features.

### When to Use Sub-Features

**Size Indicators:**

- Feature has > 10-15 components
- Feature has > 5-7 services/stores
- Feature spans multiple distinct business domains
- Team size working on feature > 3-4 people

**Business Indicators:**

- Feature has multiple user workflows
- Feature has distinct sub-domains with different business rules
- Feature could be deployed/maintained as separate modules

### Naming Convention: Dash Notation

**Use `-` (dash) to separate parent feature from sub-feature:**

```typescript
features/
├── todos-management/           # ✅ CORRECT: sub-feature of todos
│   ├── comps/
│   ├── services/
│   └── stores/
├── todos-filtering/           # ✅ CORRECT: sub-feature of todos
│   ├── comps/
│   ├── services/
│   └── stores/
├── user-profile/              # ✅ CORRECT: sub-feature of user
│   ├── comps/
│   ├── services/
│   └── stores/
└── user-settings/             # ✅ CORRECT: sub-feature of user
    ├── comps/
    ├── services/
    └── stores/
```

**❌ FORBIDDEN naming patterns:**

```typescript
features/
├── todos.management/          # ❌ Dots cause filesystem/URL issues
├── todos_management/          # ❌ Underscores less readable
├── todos/management/          # ❌ Nested dirs (use flat structure)
```

### Sub-Features Work Like Normal Features

**Same FSA structure and rules apply:**

- ✅ **Full FSA structure**: `comps/`, `services/`, `stores/`, `screens/`, etc.
- ✅ **No barrel exports** at sub-feature root
- ✅ **Direct explicit imports** only
- ✅ **README.md required** for each sub-feature
- ✅ **Can have their own sub-features** if needed (e.g., `user-profile-settings/`)

### Import Rules for Sub-Features

**Same rules as regular features:**

```typescript
// ✅ GOOD: Direct imports from sub-features
import { TodoItem } from "@/features/todos-management/comps/todoItem";
import { FilterBar } from "@/features/todos-filtering/comps/filterBar";
import { UserProfile } from "@/features/user-profile/comps/userProfile";

// ❌ BAD: No barrel exports at any level
import { TodoItem } from "@/features/todos-management";
```

### Cross-Feature Sub-Feature Imports (AVOID)

**Parent features should NOT import sub-features of other features:**

```typescript
// ❌ BAD: Cross-feature sub-feature import (tight coupling)
import { TodoFilters } from "@/features/todos-filtering/comps/filterBar";

// ✅ GOOD: Keep sub-features internal to their parent feature
// Or make them separate features: features/todoFilters/
```

### Example: Complex Feature with Sub-Features

```typescript
features/
├── todos-management/
│   ├── README.md           # Sub-feature overview
│   ├── comps/
│   │   ├── todoItem/       # CRUD components
│   │   ├── todoInput/
│   │   └── todoList/
│   ├── services/
│   │   └── storageService.ts
│   └── stores/
│       └── todosStore.ts
├── todos-filtering/
│   ├── README.md           # Filtering business rules
│   ├── comps/
│   │   ├── filterBar/
│   │   └── clearCompletedButton/
│   └── stores/
│       └── filterStore.ts
├── todos-display/
│   ├── README.md           # Display/presentation logic
│   ├── comps/
│   │   ├── todosHeader/
│   │   ├── todoStats/
│   │   └── statusBadge/
│   └── utils/
│       └── displayUtils.ts
└── todos-sync/
    ├── README.md           # Sync business rules
    ├── comps/
    │   └── syncButton/
    ├── services/
    │   └── syncService.ts
    └── stores/
        └── syncStore.ts
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

- [ ] Add `resetPasswordScreen.tsx` to screens/
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

Barrel exports are ONLY allowed for complex component/screen folders:

- `features/{domain}/comps/loginForm/index.ts` ✅ OK
- `features/{domain}/screens/authScreen/index.ts` ✅ OK

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
├── screens/
│   ├── index.ts                  # ❌ FORBIDDEN - no barrel for screens/
│   ├── settingsScreen/           # ALL screens use folder structure
│   │   └── index.ts              # ✅ OK - barrel for screen
│   └── authScreen/
│       └── index.ts              # ✅ OK - barrel for screen
│
├── services/
│   ├── index.ts                  # ❌ FORBIDDEN - no barrel for services/
│   └── authService.ts
│
└── stores/
    ├── index.ts                  # ❌ FORBIDDEN - no barrel for stores/
    └── authStore.ts
```

**How to import:**

```typescript
// Direct import (always use explicit paths)
import { LoginForm } from "@/features/auth/comps/loginForm";
import { AuthScreen } from "@/features/auth/screens/authScreen";
import { authService } from "@/features/auth/services/authService";
import { authStore } from "@/features/auth/stores/authStore";
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
   authScreen.tsx
   authScreen.pure.tsx
   registerForm.tsx
   loginForm.pure.tsx
   todoItem.styles.css
   authService.ts        # Service name in filename, NOT auth.service.ts
   authStore.ts          # Store name in filename, NOT auth.store.ts

❌ FORBIDDEN (PascalCase):
   AuthScreen.tsx
   RegisterForm.tsx
   TodoItem.styles.css

❌ FORBIDDEN (dot notation for stores/services):
   auth.store.ts         # Use authStore.ts instead
   auth.service.ts       # Use authService.ts instead
   todo.store.ts         # Use todoStore.ts instead
```

**Exceptions:**

- `index.ts` / `index.tsx` — barrel exports only
- `README.md` — documentation
- Config files (`tsconfig.json`, `vite.config.ts`, etc.)

### Screen Naming Convention (STRICT)

**Screen files and folders MUST use `Screen` suffix:**

```
features/{featureName}/screens/{screenName}Screen/
├── index.ts
├── {screenName}Screen.tsx
├── {screenName}Screen.pure.tsx
└── {screenName}Screen.{state}.tsx    # Optional state files
```

**Examples:**

```
✅ CORRECT:
   features/auth/screens/authScreen/
   ├── authScreen.tsx
   ├── authScreen.pure.tsx
   └── authScreen.loading.tsx

   features/todos/screens/todosScreen/
   ├── todosScreen.tsx
   └── todosScreen.pure.tsx

   features/userProfile/screens/profileScreen/
   ├── profileScreen.tsx
   └── profileScreen.pure.tsx

❌ FORBIDDEN (using "page" terminology):
   features/auth/pages/                    # ❌ NO "pages" folder
   features/auth/screens/authPage/         # ❌ NO "Page" in name
   authPage.tsx                            # ❌ NO "page" in filename
   AuthPagePure                            # ❌ NO "Page" in component name
```

**Import pattern:**

```typescript
// ✅ CORRECT
import { AuthScreen } from "@/features/auth/screens/authScreen";
import { TodosScreen } from "@/features/todos/screens/todosScreen";

// ❌ FORBIDDEN
import { AuthPage } from "@/features/auth/pages/authPage";
```

**Why:**

- Consistent with common JS/TS conventions
- Avoids case-sensitivity issues across OS
- Distinguishes files from exported components/classes
- **Stores/Services use camelCase (not dot notation)** because:
  - Consistent with component naming (`loginForm.tsx` not `login.form.tsx`)
  - Export name matches filename: `authStore` from `authStore.ts`
  - Dot notation (`.pure.tsx`, `.styles.css`) is reserved for file variations within a component folder

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
   features/auth/screens/
   ├── authScreen.tsx        # Only AuthScreen
   ├── registerForm.tsx      # Only RegisterForm
   ├── loginForm.tsx         # Only LoginForm
   └── index.ts              # Barrel export

❌ FORBIDDEN:
   features/auth/screens/
   └── authScreen.tsx        # Contains AuthScreen + RegisterForm + LoginForm
```

```typescript
// ❌ FORBIDDEN - Multiple components in one file
// authScreen.tsx
export function AuthScreen() { ... }
function RegisterForm() { ... }  // WRONG - extract to registerForm.tsx
function LoginForm() { ... }     // WRONG - extract to loginForm.tsx

// ✅ CORRECT - One component per file
// authScreen.tsx
import { RegisterForm } from "./registerForm";
import { LoginForm } from "./loginForm";
export function AuthScreen() { ... }

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

### Service Rules (STRICT)

**Services MUST NOT import or use reactive entities (stores, atoms, selectors).**

Services are pure business logic. If a service needs data from stores or needs to update stores, the **caller must pass callbacks**.

```typescript
// ❌ FORBIDDEN - Service importing store/reactive entity
// features/upload/services/uploadService.ts
import { uploadStore } from "../stores/uploadStore"; // ❌ FORBIDDEN
import { authStore } from "@/features/auth/stores/authStore"; // ❌ FORBIDDEN

export function uploadService() {
  const upload = uploadStore(); // ❌ FORBIDDEN - using store in service
  const auth = authStore(); // ❌ FORBIDDEN

  return {
    startUpload: async (file: File) => {
      const token = auth.token$(); // ❌ FORBIDDEN - reading from store
      upload.setProgress(0); // ❌ FORBIDDEN - writing to store
      // ... upload logic
    },
  };
}

// ✅ CORRECT - Service receives callbacks from caller (store)
// features/upload/services/uploadService.ts
export interface UploadCallbacks {
  getAuthToken: () => string;
  onProgress: (progress: number) => void;
  onComplete: (result: UploadResult) => void;
  onError: (error: Error) => void;
}

export function uploadService() {
  return {
    startUpload: async (file: File, callbacks: UploadCallbacks) => {
      const token = callbacks.getAuthToken(); // ✅ Data passed via callback
      callbacks.onProgress(0); // ✅ Updates via callback

      try {
        const result = await doUpload(file, token, (progress) => {
          callbacks.onProgress(progress); // ✅ Progress via callback
        });
        callbacks.onComplete(result); // ✅ Completion via callback
      } catch (error) {
        callbacks.onError(error); // ✅ Error via callback
      }
    },
  };
}

// ✅ CORRECT - Store orchestrates and passes callbacks to service
// features/upload/stores/uploadStore.ts
import { uploadService } from "../services/uploadService";
import { authStore } from "@/features/auth/stores/authStore";

export const uploadStore = define(() => {
  const progress$ = atom(0);
  const result$ = atom<UploadResult | null>(null);
  const error$ = atom<Error | null>(null);

  const upload = uploadService();
  const auth = authStore();

  return {
    progress$,
    result$,
    error$,

    startUpload: (file: File) => {
      // Store orchestrates by passing callbacks to service
      upload.startUpload(file, {
        getAuthToken: () => auth.token$(), // ✅ Store provides data
        onProgress: (p) => progress$(p), // ✅ Store handles updates
        onComplete: (r) => result$(r), // ✅ Store handles result
        onError: (e) => error$(e), // ✅ Store handles error
      });
    },
  };
});
```

**Why this pattern:**

| Concern        | Service              | Store                        |
| -------------- | -------------------- | ---------------------------- |
| Business logic | ✅ YES               | ❌ NO (delegates to service) |
| Reactive state | ❌ NO                | ✅ YES                       |
| Store imports  | ❌ FORBIDDEN         | ✅ OK                        |
| Testability    | Pure, easy to mock   | Needs reactive testing       |
| Reusability    | Can be used anywhere | Tied to reactive system      |

**Benefits:**

1. **Testable** — Services are pure functions, easy to unit test without mocking stores
2. **Reusable** — Services can be used in non-reactive contexts (CLI, workers, etc.)
3. **Clear boundaries** — Services = logic, Stores = state
4. **Dependency inversion** — Service doesn't know about reactive system
5. **No circular deps** — Service never imports store that imports same service

**Service file structure:**

```
features/{domain}/services/
├── myService.ts           # Service implementation
├── myService.test.ts      # Pure unit tests (no store mocking needed)
└── myService.types.ts     # Optional: callback interfaces, types
```

## Path-Based Detection Rules

| Path Pattern                   | Contains          | Business Rules | AI Action                      |
| ------------------------------ | ----------------- | -------------- | ------------------------------ |
| `ui/*`                         | Generic UI        | **NO**         | Implement without domain logic |
| `features/{domain}/comps/*`    | Domain components | **YES**        | Check JSDoc `@businessRules`   |
| `features/{domain}/services/*` | Business logic    | **YES**        | Check JSDoc for rules          |
| `features/{domain}/stores/*`   | State + rules     | **YES**        | Check JSDoc for rules          |
| `features/{domain}/screens/*`  | Compositions      | **MAYBE**      | Check if complex logic exists  |
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

**Principle: Screens and domain components should be thin orchestrators, not UI factories.**

This section applies to components in `features/{domain}/screens/` and `features/{domain}/comps/`.

### Size Limits for Domain Components (STRICT)

| Type   | Max JSX Lines | Max Total Lines | Action if exceeded       |
| ------ | ------------- | --------------- | ------------------------ |
| Screen | 30            | 100             | Extract to comps/        |
| Comp   | 50            | 150             | Split into smaller comps |

### Split Indicators for Domain Components

| Indicator                                   | Example                     | Action                                   |
| ------------------------------------------- | --------------------------- | ---------------------------------------- |
| **Conditional render block > 10 JSX lines** | `if (loading) return <...>` | Extract to `loadingState.tsx`            |
| **Error/empty state > 5 JSX lines**         | `if (error) return <...>`   | Extract to `errorState.tsx` or use `ui/` |
| **Form section > 20 JSX lines**             | Large form in screen        | Extract to `{name}Form.tsx` in comps/    |
| **Repeated UI pattern**                     | Alert box used 2+ times     | Extract to `ui/` or local component      |
| **View-specific JSX**                       | Register vs Login views     | Extract each view to separate component  |

### Example: Splitting a Large Screen

```typescript
// ❌ BAD: Screen with too much inline UI (authScreen.tsx - 377 lines)
export function AuthScreen() {
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

// ✅ GOOD: Screen as thin orchestrator
// authScreen.tsx (< 50 lines)
export function AuthScreen() {
  const { view, ... } = useAuthScreen();  // Extract logic to hook

  if (view === "checking") return <AuthScreenLoading />;
  if (view === "unsupported") return <AuthScreenUnsupported />;

  return (
    <AuthLayout>
      {view === "register" ? <RegisterForm {...} /> : <LoginForm {...} />}
    </AuthLayout>
  );
}
```

### Screen File Structure (MANDATORY — Always Use Folder)

**ALL screens MUST use folder structure:**

```
screens/
├── authScreen/
│   ├── index.ts                  # export { AuthScreen } from "./authScreen"
│   ├── authScreen.tsx            # useAuthScreenLogic hook + AuthScreen container
│   ├── authScreen.pure.tsx       # AuthScreenPure presentation (Storybook-ready)
│   ├── authScreen.loading.tsx    # Loading state (dot notation)
│   ├── authScreen.unsupported.tsx # Unsupported state (dot notation)
│   └── authLayout.tsx            # Screen-private layout
│
├── settingsScreen/               # Even simple screens use folder
│   ├── index.ts
│   ├── settingsScreen.tsx
│   └── settingsScreen.pure.tsx
│
└── profileScreen/
    ├── index.ts
    ├── profileScreen.tsx
    └── profileScreen.pure.tsx
```

**Rules:**

1. **ALL screens** → `screens/myScreen/` folder structure (no single file screens)
2. **Every screen folder MUST have:**
   - `index.ts` — barrel export
   - `myScreen.tsx` — logic hook + container
   - `myScreen.pure.tsx` — presentation component
3. **Screen parts are PRIVATE** — only used by that screen, not exported from `screens/index.ts`
4. **If screen part becomes reusable** → Move to `comps/`

### Decision Tree: Where to Put Extracted Code?

```
Is the extracted component...
│
├── Generic UI (no business logic)?
│   └── YES → ui/primitives/ or ui/composed/
│       └── Examples: LoadingSpinner, ErrorAlert, EmptyState
│
├── Screen-private (only used by one screen)?
│   └── YES → Same folder as screen (screens/myScreen/)
│       └── Examples: authScreen.loading, authScreen.unsupported, authLayout
│       └── MUST NOT be exported from screens/index.ts
│
├── Reusable within this feature (used by multiple screens/comps)?
│   └── YES → features/{domain}/comps/
│       └── Examples: RegisterForm, LoginForm, UserAvatar
│
└── Reusable across features?
    └── YES → Consider if it's generic (ui/) or business (shared feature)
```

### Example: Feature Structure

```
features/auth/
├── screens/
│   ├── authScreen/                   # Complex screen (has hook + Pure)
│   │   ├── index.ts                  # ✅ OK - complex folder barrel
│   │   ├── authScreen.tsx            # useAuthScreenLogic + AuthScreen container
│   │   ├── authScreen.pure.tsx       # AuthScreenPure presentation
│   │   ├── authScreen.loading.tsx    # Loading state (dot notation)
│   │   └── authScreen.unsupported.tsx # Unsupported state (dot notation)
│   │
│   └── resetPasswordScreen/          # ALL screens use folder structure
│       ├── index.ts
│       ├── resetPasswordScreen.tsx
│       └── resetPasswordScreen.pure.tsx
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
│   └── authService.ts
│
└── stores/
    └── authStore.ts
```

### Component File Structure (MANDATORY — Always Use Folder)

**This rule applies to ALL components: screens, comps, and ui.**

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

**2. Component/Screen State Files (dot notation for states)**

When a component has multiple view states (loading, error, empty, etc.), use dot notation:

```
screens/authScreen/
├── index.ts
├── authScreen.tsx
├── authScreen.pure.tsx         # Main presentation
├── authScreen.loading.tsx      # Loading state view
├── authScreen.error.tsx        # Error state view
├── authScreen.unsupported.tsx  # Custom state view
└── authScreen.empty.tsx        # Empty state view (if needed)

comps/userProfile/
├── index.ts
├── userProfile.tsx
├── userProfile.pure.tsx
├── userProfile.loading.tsx     # Skeleton/loading state
└── userProfile.error.tsx       # Error state
```

**Naming pattern:** `{componentName}.{stateName}.tsx`

Common state names:

- `.loading.tsx` — Loading/skeleton state
- `.error.tsx` — Error state
- `.empty.tsx` — Empty/no-data state
- `.offline.tsx` — Offline state
- `.unsupported.tsx` — Unsupported browser/feature state

State files are exempt from `.pure.tsx` requirement when:

- They are < 20 JSX lines
- They have no props or only 1-2 simple props
- They are only used by their parent component
- They are NOT exported from the component's index.ts

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

| File              | Contains                          | Exports                               |
| ----------------- | --------------------------------- | ------------------------------------- |
| `xxx.tsx`         | Logic hook + Container component  | `useXxxLogic`, `Xxx`                  |
| `xxx.pure.tsx`    | Presentation component (no state) | `XxxPure`, `XxxPureProps`             |
| `xxx.loading.tsx` | Loading state view (optional)     | Internal use only                     |
| `xxx.error.tsx`   | Error state view (optional)       | Internal use only                     |
| `xxx.{state}.tsx` | Custom state view (optional)      | Internal use only                     |
| `xxx.styles.css`  | Styles (optional)                 | -                                     |
| `index.ts`        | Barrel exports                    | Re-export from `.tsx` and `.pure.tsx` |

**Rules (STRICT):**

1. **Container** (`Xxx`) calls `useXxxLogic()` and renders `<XxxPure {...result} />`
2. **Presentation** (`XxxPure`) is pure — no hooks, no state, only props
3. **Logic hook** (`useXxxLogic`) returns exactly `XxxPureProps`
4. **Storybook** uses `XxxPure` directly with mock props
5. **Tests** can test hook and UI separately

### Component Pattern (MANDATORY)

**This pattern applies to domain components (screens, comps) and stateful generic UI.**

For exceptions (simple primitives, compound parts, screen-private states), see [Exceptions: When .pure.tsx is NOT Required](#exceptions-when-puretsx-is-not-required).

```
componentName/
├── index.ts
├── componentName.tsx      # Hook + Container (or just component for simple cases)
└── componentName.pure.tsx   # Presentation (Storybook-ready) — see exceptions
```

**Pattern Requirements by Component Type:**

| Type          | Folder Required  | `.pure.tsx` Required | `useXxxLogic` Required |
| ------------- | ---------------- | -------------------- | ---------------------- |
| Domain Screen | YES              | YES                  | YES                    |
| Domain Comp   | YES              | YES                  | YES                    |
| Composed UI   | YES              | YES                  | YES (if stateful)      |
| Primitive UI  | YES              | Optional\*           | Optional\*             |
| Compound Part | In parent folder | NO                   | NO                     |
| State File    | In parent folder | NO                   | NO                     |

\*Primitives with 0 state, ≤5 props, ≤20 JSX lines may use single-file pattern.

**State files** use dot notation: `componentName.loading.tsx`, `componentName.error.tsx`, etc.

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

### Complete Example: AuthScreen

```
features/auth/screens/authScreen/
├── index.ts
├── authScreen.tsx         # useAuthScreenLogic + AuthScreen container
├── authScreen.pure.tsx    # AuthScreenPure presentation
├── authScreen.loading.tsx # Loading state (dot notation)
└── authScreen.unsupported.tsx # Unsupported state (dot notation)
```

```typescript
// authScreen.pure.tsx
export interface AuthScreenPureProps {
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

export function AuthScreenPure(props: AuthScreenPureProps) {
  const { view, ...rest } = props;

  if (view === "checking") return <AuthScreenLoading />;
  if (view === "unsupported") return <AuthScreenUnsupported />;

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

// authScreen.tsx
import { AuthScreenPure, AuthScreenPureProps } from "./authScreen.pure";

export interface AuthScreenProps {}

export function useAuthScreenLogic(props: AuthScreenProps): AuthScreenPureProps {
  // ... all logic here, returns AuthScreenPureProps
}

export function AuthScreen(props: AuthScreenProps) {
  const pureProps = useAuthScreenLogic(props);
  return <AuthScreenPure {...pureProps} />;
}
```

### Checklist: Before Writing Component/Screen (MANDATORY)

**❌ FORBIDDEN:**

- Single file components (`avatar.tsx` at folder level)
- Writing component without folder structure
- Writing component without `componentName.pure.tsx` presentation file
- Putting hooks/state in `.pure.tsx` files
- Returning type different from `XxxPureProps` in `useXxxLogic`
- Creating `.logic.ts` files (use `.tsx` for logic + container)

**✅ REQUIRED (every component/screen MUST have):**

- [ ] Folder structure: `componentName/` directory
- [ ] `index.ts` — barrel exports all public APIs
- [ ] `componentName.tsx` — logic hook + container
- [ ] `componentName.pure.tsx` — presentation component (Storybook-ready)
- [ ] `useXxxLogic` returns exactly `XxxPureProps`
- [ ] `XxxPure` has no hooks, no state — only props
- [ ] Total lines < 100 (screen) or < 150 (comp)

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
export function useAuthScreenLogic() {
  const [view, setView] = useState<AuthView>("checking");
  // ... rest of logic
}

// ✅ GOOD: Comprehensive JSDoc
/**
 * Logic hook for AuthScreen.
 *
 * @description
 * Manages authentication screen state including view transitions,
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
 * @returns {UseAuthScreenLogicReturn} State and handlers for AuthScreen
 *
 * @example
 * ```tsx
 * function AuthScreen() {
 *   const { view, onLogin, onRegister } = useAuthScreenLogic();
 *   // ...
 * }
 * ```
 */
export function useAuthScreenLogic(): UseAuthScreenLogicReturn {
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
 * Return type for useAuthScreenLogic hook.
 */
interface UseAuthScreenLogicReturn {
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
export function useAuthScreenLogic(): UseAuthScreenLogicReturn {
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
- `screens/` - Full screen compositions (mobile-first)
- `utils/` - Feature-specific utilities
- `types/` - Feature-specific types

**Note:** Features MUST NOT have `ui/` folder. Use shared `ui/` components.

## Key Files

- `comps/componentName.tsx` - [brief description]
- `services/featureService.ts` - [brief description]
- `stores/featureStore.ts` - [brief description]

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
│   ├── Is it a full screen?
│   │   └── YES → features/{domain}/screens/
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
- Routes can import from any feature's `screens/` (direct path)
- Cross-feature imports use explicit paths

### Not Allowed

- Features MUST NOT have their own `ui/` folder
- MUST NOT use barrel imports for cross-feature (no `index.ts` at feature or sub-feature root)
- MUST NOT import sub-features from other features (maintains feature encapsulation)

```typescript
// ✅ GOOD - explicit path imports (features and sub-features)
import { TodoItem } from "@/features/todos/comps/todoItem";
import { TodosScreen } from "@/features/todos/screens/todosScreen";
import { todoStore } from "@/features/todos/stores/todoStore";
import { FilterBar } from "@/features/todos-filtering/comps/filterBar";

// ❌ BAD - barrel import (feature/sub-feature index.ts is forbidden)
import { TodoItem } from "@/features/todos";
import { FilterBar } from "@/features/todos-filtering";
```

### Cross-Feature Import Rules for Services/Stores (STRICT)

**Allowed cross-feature imports:**

| From        | Can Import                                      | Cannot Import             |
| ----------- | ----------------------------------------------- | ------------------------- |
| `routes/`   | ONLY features' `screens/`                       | comps, services, stores   |
| `screens/`  | Other features' `comps/`, `stores/` (read-only) | -                         |
| `comps/`    | Other features' `stores/` (read-only)           | -                         |
| `stores/`   | Other features' `services/` only                | ❌ Other stores FORBIDDEN |
| `services/` | Other features' `services/` (carefully)         | ❌ ANY stores FORBIDDEN   |

**Rules:**

1. **Routes are thin** — Routes ONLY import screens, never comps/services/stores directly
2. **Stores are isolated** — A feature's store MUST NOT import another feature's store directly
3. **Services are pure** — Services MUST NOT import ANY stores (use callbacks instead)
4. **Services can compose** — Services may call other features' services for orchestration
5. **Components can read** — Components may read (not write) other features' stores
6. **Screens orchestrate** — Screens can import from multiple features to compose views

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

// Usage in features/auth/stores/authStore.ts
import { featureEvents } from "@/shared/events/featureEvents";

// Emit event when logging out
featureEvents.emit("auth:logout");

// Usage in features/todos/stores/todoStore.ts
import { featureEvents } from "@/shared/events/featureEvents";

// Listen for auth events
featureEvents.on("auth:logout", () => {
  // Clear todos when user logs out
  clearLocalTodos();
});
```

**2. Shared State in `shared/` (common data)**

```typescript
// shared/stores/userStore.ts
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

// features/auth/screens/authScreen/authScreen.tsx
const AuthScreen = () => {
  const navigate = useNavigate();

  return (
    <LoginForm
      onLoginSuccess={(user) => {
        // Orchestration happens at screen level
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

- It's just a sub-screen of an existing feature (use `screens/subScreen/` instead)
- It's a variation of existing business logic (extend existing service)
- It would create tight coupling back to the original feature
- It's purely for code organization (use folders within feature instead)

### Feature Size Limits

| Metric                 | Soft Limit | Hard Limit | Action if exceeded          |
| ---------------------- | ---------- | ---------- | --------------------------- |
| Components in `comps/` | 10         | 15         | Consider splitting feature  |
| Services               | 5          | 7          | Extract shared to `shared/` |
| Stores                 | 3          | 5          | Merge related stores        |
| Screens                | 5          | 8          | Consider sub-features       |

### Splitting Large Features

When a feature grows too large:

```
features/ecommerce/          # TOO BIG
├── comps/                   # 20+ components
├── screens/                 # 10+ screens
└── stores/                  # 6+ stores

↓ Split into sub-features ↓

features/
├── cart/                    # Cart management
│   ├── comps/
│   ├── screens/
│   └── stores/
├── checkout/                # Checkout flow
│   ├── comps/
│   ├── screens/
│   └── stores/
├── products/                # Product catalog
│   ├── comps/
│   ├── screens/
│   └── stores/
└── orders/                  # Order history
    ├── comps/
    ├── screens/
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
   // Before: authStore.ts ↔ userService.ts circular
   // After:
   shared/stores/currentUserStore.ts      # Shared state
   features/auth/stores/authStore.ts      # Auth-specific
   features/auth/services/userService.ts  # Uses shared store
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

3. **Split into screen + comps**
   ```typescript
   // Before: Screen doing everything
   // After: Screen orchestrates, comps handle sections
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
└── Full screen? → features/{domain}/screens/

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
   // Before: authStore.ts (300 lines)
   // After:
   authStore.ts        # Main auth state
   authUIStore.ts      # UI state (modals, forms)
   authCacheStore.ts   # Cached data
   ```

2. **Extract derived state to selectors**
   ```typescript
   // Move complex computations out of store definition
   // features/auth/selectors/auth.selectors.ts
   ```

## Adopting FSA from Non-FSA Code

### Phase 1: Structure Setup

**Goal:** Move non-FSA files into FSA structure.

1. **Create feature folders**

   ```
   mkdir -p features/{domain}/{comps,screens,services,stores,utils,types}
   ```

2. **Move files following conventions**

   ```
   src/components/Auth/ → features/auth/comps/
   src/views/Auth.tsx → features/auth/screens/authScreen/authScreen.tsx
   src/services/authService.ts → features/auth/services/authService.ts
   ```

   > **Note:** Non-FSA code may use terms like "pages", "views", or "routes". When adopting FSA, always rename to `screens/` with `Screen` suffix.

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
