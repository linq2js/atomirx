# Shared UI Feature

## Purpose

Provides reusable generic UI components with no business logic. These components are purely presentational and can be used across all features.

## Components

| Component | Type | Description |
|-----------|------|-------------|
| Button | Atom | Primary action button with variants |
| Input | Atom | Text input with icons and error states |
| Checkbox | Atom | Checkbox with label support |
| Badge | Atom | Status indicator badges |
| Skeleton | Atom | Loading placeholders |
| Dialog | Organism | Modal dialog with compound pattern |
| Toast | Organism | Notification toasts with context |

## Usage

```tsx
import { Button, Input, Dialog, Badge } from "@/features/ui";

<Button variant="primary" onClick={handleClick}>
  Save
</Button>

<Input
  placeholder="Search..."
  leftIcon={<Search />}
/>

<Badge variant="success" dot>
  Synced
</Badge>
```

## Dependencies

- Depends on: `@/shared/utils` (cn utility)
- Depends on: `@base-ui-components/react` (Base UI primitives)
- Depends on: `lucide-react` (icons)
- Used by: All features
