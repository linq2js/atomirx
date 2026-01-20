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
├── features/
│   ├── ui/                      # Shared generic components (cross-feature)
│   │   ├── README.md
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Dialog/
│   │   └── index.ts
│   │
│   ├── {domain}/                # Feature module (e.g., auth, todos, settings)
│   │   ├── README.md            # Feature overview + business rules summary
│   │   ├── ui/                  # Private generic components (this feature only)
│   │   ├── comps/               # Components WITH business rules
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
└── shared/                      # Cross-cutting concerns
    ├── hooks/                   # Shared hooks
    ├── utils/                   # Shared utilities
    └── types/                   # Shared types
```

## Critical Rules

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

## Path-Based Detection Rules

| Path Pattern                   | Contains          | Business Rules | AI Action                      |
| ------------------------------ | ----------------- | -------------- | ------------------------------ |
| `features/ui/*`                | Shared generic    | **NO**         | Implement without domain logic |
| `features/{domain}/ui/*`       | Private generic   | **NO**         | Implement without domain logic |
| `features/{domain}/comps/*`    | Domain components | **YES**        | Check JSDoc `@businessRules`   |
| `features/{domain}/services/*` | Business logic    | **YES**        | Check JSDoc for rules          |
| `features/{domain}/stores/*`   | State + rules     | **YES**        | Check JSDoc for rules          |
| `features/{domain}/pages/*`    | Compositions      | **MAYBE**      | Check if complex logic exists  |
| `features/{domain}/utils/*`    | Utilities         | **NO**         | Pure functions only            |
| `routes/*`                     | Route definitions | **NO**         | Composition only               |
| `shared/*`                     | Cross-cutting     | **NO**         | Generic utilities              |

## Component Classification

### Generic Components (NO business rules)

Located in: `features/ui/` or `features/{domain}/ui/`

Characteristics:

- Purely presentational
- Behavior driven by props only
- No domain knowledge
- Could work in any application
- No conditional logic based on business state

```typescript
// features/ui/Button/Button.tsx
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
// features/todos/comps/TodoItem/TodoItem.tsx
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

## Generic UI Component Splitting Rules (MANDATORY)

**Principle: Generic (dumb) components should be as small and composable as possible.**

This section applies to components in `features/ui/` and `features/{domain}/ui/`.

AI MUST split generic components following **Atomic Design** principles.

### Atomic Design Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  ATOMS (smallest, single element wrapper)                   │
│  ├── Button, Input, Label, Icon, Badge, Checkbox, Spinner   │
│  └── Max: 15 JSX lines, 5 props, 0-1 internal state         │
├─────────────────────────────────────────────────────────────┤
│  MOLECULES (2-4 atoms combined)                             │
│  ├── InputField (Label + Input + ErrorText)                 │
│  ├── SearchBox (Input + Button + Icon)                      │
│  ├── MenuItem (Icon + Label + Badge)                        │
│  └── Max: 30 JSX lines, 7 props, 0-1 internal state         │
├─────────────────────────────────────────────────────────────┤
│  ORGANISMS (multiple molecules/atoms, uses compound pattern)│
│  ├── Card, Dialog, Dropdown, Menu, Toast                    │
│  └── Max: 50 JSX lines total, 10 props, 0-2 internal state  │
└─────────────────────────────────────────────────────────────┘
```

### Split Indicators for Generic Components

| Indicator                     | Threshold                                     | Action                             |
| ----------------------------- | --------------------------------------------- | ---------------------------------- |
| **JSX lines**                 | > 15 (atom), > 30 (molecule), > 50 (organism) | MUST split                         |
| **Props count**               | > 5 (atom), > 7 (molecule), > 10 (organism)   | MUST split or use composition      |
| **Multiple HTML sections**    | > 1 visual area                               | Split into sub-components          |
| **Optional sections**         | Any                                           | Use slot props or compound pattern |
| **Wrapper + Content pattern** | Any                                           | Split wrapper from content         |
| **Repeated elements**         | Any                                           | Extract to smaller atom            |
| **Internal state**            | > 1 useState                                  | Extract to hook or split           |

### Core Splitting Patterns

#### Pattern 1: Compound Components (REQUIRED for Organisms)

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
// Each sub-component is an ATOM (< 15 lines)

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

#### Pattern 2: Extract Atoms from Molecules

**When molecule has distinct pieces → Extract each as atom**

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

// ✅ GOOD: Separate atoms, compose into molecule

// ATOM: Input (pure input element)
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("input", className)} {...props} />
  )
);

// ATOM: Label
const Label = ({ children, htmlFor, className }: LabelProps) => (
  <label htmlFor={htmlFor} className={cn("label", className)}>{children}</label>
);

// ATOM: FormMessage (for errors/helpers)
const FormMessage = ({ children, variant = "default", className }: FormMessageProps) => (
  <span className={cn("form-message", `form-message-${variant}`, className)}>{children}</span>
);

// MOLECULE: InputField (composes atoms)
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

#### Pattern 4: Variants via Props (Atoms Only)

**Atoms can use variant props - keep simple**

```typescript
// ✅ GOOD: Simple variants via props for atoms
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
features/ui/
├── atoms/
│   ├── Button/
│   │   ├── index.ts
│   │   └── Button.tsx           # ≤ 15 lines JSX
│   ├── Input/
│   │   ├── index.ts
│   │   └── Input.tsx
│   ├── Label/
│   ├── Badge/
│   ├── Icon/
│   ├── Spinner/
│   └── index.ts                  # Re-export all atoms
│
├── molecules/
│   ├── InputField/
│   │   ├── index.ts
│   │   └── InputField.tsx       # ≤ 30 lines, composes atoms
│   ├── SearchBox/
│   ├── MenuItem/
│   └── index.ts
│
├── organisms/
│   ├── Card/
│   │   ├── index.ts              # Export all compound parts
│   │   ├── Card.tsx              # Root (≤ 10 lines)
│   │   ├── CardHeader.tsx        # ≤ 10 lines
│   │   ├── CardTitle.tsx         # ≤ 10 lines
│   │   ├── CardDescription.tsx   # ≤ 10 lines
│   │   ├── CardContent.tsx       # ≤ 10 lines
│   │   └── CardFooter.tsx        # ≤ 10 lines
│   ├── Dialog/
│   ├── Dropdown/
│   └── index.ts
│
└── index.ts                      # Re-export all
```

### Generic Component Size Limits (STRICT)

| Level    | Max JSX Lines | Max Props | Max useState | Sub-components      |
| -------- | ------------- | --------- | ------------ | ------------------- |
| Atom     | 15            | 5         | 1            | 0 (leaf)            |
| Molecule | 30            | 7         | 1            | 2-4 atoms           |
| Organism | 50 total      | 10        | 2            | 3-6 atoms/molecules |

**Note:** Organism "50 total" means the root + all compound parts combined.

### Decision Tree: Split Generic Component?

```
Creating a generic (dumb) component?
│
├── Is it wrapping a single HTML element?
│   └── YES → ATOM
│       └── Keep ≤ 15 JSX lines, ≤ 5 props
│       └── Examples: Button, Input, Label, Badge, Icon
│
├── Does it combine 2-4 atoms into one unit?
│   └── YES → MOLECULE
│       └── Keep ≤ 30 JSX lines, ≤ 7 props
│       └── Examples: InputField, SearchBox, MenuItem
│
├── Does it have multiple distinct visual sections?
│   └── YES → ORGANISM with COMPOUND pattern
│       └── Split each section into atom-sized sub-component
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

| Type           | Pattern                      | Examples                                    |
| -------------- | ---------------------------- | ------------------------------------------- |
| Atom           | `{Name}`                     | `Button`, `Input`, `Badge`                  |
| Molecule       | `{Purpose}` or `{Atom}Field` | `SearchBox`, `InputField`                   |
| Organism root  | `{Name}`                     | `Card`, `Dialog`, `Menu`                    |
| Organism parts | `{Parent}{Part}`             | `CardHeader`, `CardContent`, `DialogFooter` |
| Loading state  | `{Name}Skeleton`             | `CardSkeleton`, `InputSkeleton`             |

### Checklist: Before Writing Generic Component

- [ ] Identified level: Atom / Molecule / Organism?
- [ ] JSX within limit for its level?
- [ ] Props within limit for its level?
- [ ] No more than 1 useState (2 for organisms)?
- [ ] Using compound pattern for multi-section organisms?
- [ ] No business logic (pure presentation)?
- [ ] Accepts `className` prop for style extension?
- [ ] Uses `forwardRef` where appropriate?
- [ ] Each sub-component is independently usable?

**If ANY check FAILS → Split first, then implement.**

## Before Implementing

### For Generic Components (`ui/`)

1. Check if component already exists in `features/ui/`
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

- `ui/` - Private presentational components (no business logic)
- `comps/` - Components with business rules (see JSDoc)
- `services/` - Business logic and API calls
- `stores/` - State management with atomirx
- `pages/` - Full page compositions
- `utils/` - Feature-specific utilities

## Key Files

- `comps/ComponentName.tsx` - [brief description]
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
│   │   └── NO
│   │       ├── Used by multiple features?
│   │       │   ├── YES → features/ui/
│   │       │   └── NO → features/{domain}/ui/
│   │       └── Is it a full page?
│   │           └── YES → features/{domain}/pages/
│   └── Is it a layout component?
│       └── YES → routes/layouts/
└── NO
    ├── Is it state management?
    │   └── YES → features/{domain}/stores/
    ├── Is it business logic / API?
    │   └── YES → features/{domain}/services/
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

- Any feature can import from `features/ui/`
- Any feature can import from `shared/`
- Routes can import from any feature's `pages/`
- Routes can import from any feature's public `index.ts`

### Not Allowed

- Feature A should NOT import from Feature B's internal folders
- Use feature's `index.ts` for cross-feature imports

```typescript
// GOOD - import from public API
import { TodoItem } from "@/features/todos";

// BAD - import from internal path
import { TodoItem } from "@/features/todos/comps/TodoItem";
```

## Checklist Before Implementation

### 1. Location Check

- [ ] Identified correct folder based on decision tree
- [ ] Checked for existing similar components

### 2. Business Rules Check (for domain components)

- [ ] Read `@businessRules` in JSDoc
- [ ] Checked for `.spec.md` companion file
- [ ] Read feature README for rules summary

### 3. Generic Component Splitting Check (for `ui/` components)

- [ ] Identified level: Atom / Molecule / Organism?
- [ ] JSX within limit? (15 atom / 30 molecule / 50 organism)
- [ ] Props within limit? (5 atom / 7 molecule / 10 organism)
- [ ] useState ≤ 1? (≤ 2 for organisms)
- [ ] Multi-section organism → using compound pattern?
- [ ] No business logic (pure presentation)?
- [ ] Accepts `className` prop?
- [ ] Uses `forwardRef` where appropriate?

**If ANY check FAILS → Split first, then implement.**

### 4. After Implementation

- [ ] Each sub-component is at atom-level size (≤ 15 JSX lines)
- [ ] Compound parts are independently usable
- [ ] File organization follows atoms/molecules/organisms structure
- [ ] All parts exported from index.ts
