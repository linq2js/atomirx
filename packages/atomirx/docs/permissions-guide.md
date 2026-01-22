# Permissions Management with Atoms

This guide covers best practices for implementing permissions, authorization, and role-based access control (RBAC) using atomirx.

## Table of Contents

- [Basic Permission Structure](#basic-permission-structure)
- [Permission Combinators](#permission-combinators)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Feature Flags Integration](#feature-flags-integration)
- [Async Permission Loading](#async-permission-loading)
- [Resource-Level Permissions](#resource-level-permissions)
- [UI Patterns](#ui-patterns)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Basic Permission Structure

Start by creating a session atom that fetches authentication and permission data:

```ts
import { atom, derived } from "atomirx";

// Types
interface Session {
  user: User;
  permissions: Permissions;
  roles: Role[];
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface Permissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canAdmin: boolean;
}

type Role = "viewer" | "editor" | "admin" | "superadmin";

// Session atom - single source of truth
const session$ = atom(() => fetchSession());

// Derived atoms for specific data
const currentUser$ = derived(({ read }) => read(session$).user);
const permissions$ = derived(({ read }) => read(session$).permissions);
const roles$ = derived(({ read }) => read(session$).roles);
```

### Individual Permission Atoms

Extract individual permissions for fine-grained reactivity:

```ts
// Individual permission atoms
const canRead$ = derived(({ read }) => read(permissions$).canRead);
const canWrite$ = derived(({ read }) => read(permissions$).canWrite);
const canDelete$ = derived(({ read }) => read(permissions$).canDelete);
const canAdmin$ = derived(({ read }) => read(permissions$).canAdmin);
```

> **Why extract individual permissions?**
>
> - Components only re-render when their specific permission changes
> - Better memoization and performance
> - Clearer dependency tracking

---

## Permission Combinators

Use `and()` and `or()` for combining permission checks with short-circuit evaluation:

### Basic Combinators

```ts
// Can modify = can write OR can delete
const canModify$ = derived(({ or }) => or([canWrite$, canDelete$]));

// Full access = can read AND can write AND can delete
const hasFullAccess$ = derived(({ and }) =>
  and([canRead$, canWrite$, canDelete$])
);

// Can submit form = must have write permission AND form is valid
const canSubmit$ = derived(({ and }) => and([canWrite$, isFormValid$]));

// Can schedule post = must have write permission AND scheduling feature enabled
const canSchedulePost$ = derived(({ and }) =>
  and([canWrite$, hasSchedulingFeature$])
);
```

### Nested Combinators

Combine `and()` and `or()` for complex permission logic:

```ts
// Can publish = (editor AND can write) OR admin
const canPublish$ = derived(({ read, and, or }) => {
  const isEditor = read(roles$).includes("editor");
  const isAdmin = read(roles$).includes("admin");

  return or([and([isEditor, canWrite$]), isAdmin]);
});

// Can delete resource = (owner AND can delete) OR admin OR superadmin
const canDeleteResource$ = derived(({ read, and, or }) => {
  const roles = read(roles$);

  return or([
    and([isOwner$, canDelete$]),
    roles.includes("admin"),
    roles.includes("superadmin"),
  ]);
});
```

### Lazy Evaluation with Functions

Use function conditions for expensive permission checks that should only run if needed:

```ts
// Only check team permission if user has base permission
const canAccessTeamResource$ = derived(({ read, and }) =>
  and([
    canRead$, // Check this first
    () => {
      // Only fetch team data for checking if canRead is true
      const team = read(currentTeam$);
      return team.members.includes(read(currentUser$).id);
    },
  ])
);
```

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

Define role hierarchies for cascading permissions:

```ts
const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

// Check if user has at least the required role level
const hasRole$ = (requiredRole: Role) =>
  derived(({ read }) => {
    const userRoles = read(roles$);
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    return userRoles.some((role) => ROLE_HIERARCHY[role] >= requiredLevel);
  });

// Usage
const isAtLeastEditor$ = hasRole$("editor");
const isAtLeastAdmin$ = hasRole$("admin");
```

### Role-Based Permission Factory

Create a factory for role-specific permission atoms:

```ts
// Permission factory based on role
const createRolePermissions = (role: Role) => ({
  canView$: derived(({ read }) => {
    const roles = read(roles$);
    return (
      roles.includes(role) ||
      roles.includes("admin") ||
      roles.includes("superadmin")
    );
  }),

  canEdit$: derived(({ read, and }) => {
    const roles = read(roles$);
    return and([roles.includes(role) || roles.includes("admin"), canWrite$]);
  }),
});

// Create permissions for specific roles
const editorPermissions = createRolePermissions("editor");
const adminPermissions = createRolePermissions("admin");
```

### Permission Matrix

For complex RBAC systems, define a permission matrix:

```ts
type Resource = "posts" | "users" | "settings" | "billing";
type Action = "create" | "read" | "update" | "delete";

const PERMISSION_MATRIX: Record<Role, Record<Resource, Action[]>> = {
  viewer: {
    posts: ["read"],
    users: ["read"],
    settings: [],
    billing: [],
  },
  editor: {
    posts: ["create", "read", "update"],
    users: ["read"],
    settings: ["read"],
    billing: [],
  },
  admin: {
    posts: ["create", "read", "update", "delete"],
    users: ["create", "read", "update"],
    settings: ["read", "update"],
    billing: ["read"],
  },
  superadmin: {
    posts: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    settings: ["create", "read", "update", "delete"],
    billing: ["create", "read", "update", "delete"],
  },
};

// Check permission for resource and action
const canPerform$ = (resource: Resource, action: Action) =>
  derived(({ read }) => {
    const userRoles = read(roles$);

    return userRoles.some(
      (role) => PERMISSION_MATRIX[role]?.[resource]?.includes(action) ?? false
    );
  });

// Usage
const canCreatePost$ = canPerform$("posts", "create");
const canDeleteUser$ = canPerform$("users", "delete");
const canUpdateSettings$ = canPerform$("settings", "update");
```

---

## Feature Flags Integration

Combine permissions with feature flags:

```ts
// Feature flags atom
const featureFlags$ = atom(() => fetchFeatureFlags());

// Individual feature flags
const isNewEditorEnabled$ = derived(
  ({ read }) => read(featureFlags$).newEditor ?? false
);

const isBetaEnabled$ = derived(
  ({ read }) => read(featureFlags$).betaFeatures ?? false
);

// Permission + feature flag combination
const canUseNewEditor$ = derived(({ and }) =>
  and([
    canWrite$, // Must have write permission
    isNewEditorEnabled$, // Feature must be enabled
  ])
);

// Beta features only for admins
const canAccessBetaFeatures$ = derived(({ and }) =>
  and([isBetaEnabled$, canAdmin$])
);

// Gradual rollout: feature enabled AND (beta user OR admin)
const canUseExperimentalFeature$ = derived(({ read, and, or }) => {
  const user = read(currentUser$);
  const isBetaUser = user.email.endsWith("@beta.company.com");

  return and([isNewEditorEnabled$, or([isBetaUser, canAdmin$])]);
});
```

---

## Async Permission Loading

### Handling Loading States

```ts
// Permission state with loading awareness
const permissionState$ = derived(({ state }) => {
  const sessionState = state(session$);

  if (sessionState.status === "loading") {
    return { loading: true, permissions: null };
  }

  if (sessionState.status === "error") {
    return { loading: false, permissions: null, error: sessionState.error };
  }

  return {
    loading: false,
    permissions: sessionState.value.permissions,
  };
});
```

### Optimistic Permission Checks

For better UX, provide fallback values during loading:

```ts
// Optimistic: assume no permissions while loading
const canWriteOptimistic$ = derived(({ read }) => read(permissions$).canWrite, {
  fallback: false,
});

// Or with explicit state handling
const canWriteSafe$ = derived(({ state }) => {
  const permsState = state(canWrite$);

  // Default to false while loading or on error
  return permsState.status === "ready" ? permsState.value : false;
});
```

### Permission Refresh

```ts
// Create a refreshable session
const sessionTrigger$ = atom(0);

const session$ = derived(({ read }) => {
  read(sessionTrigger$); // Dependency for refresh
  return fetchSession();
});

// Refresh permissions
const refreshPermissions = () => {
  sessionTrigger$.set((n) => n + 1);
};

// Auto-refresh on focus (for web apps)
if (typeof window !== "undefined") {
  window.addEventListener("focus", refreshPermissions);
}
```

---

## Resource-Level Permissions

### Using Pools for Resource Permissions

For per-resource permission checks, use pools:

```ts
import { pool } from "atomirx";

interface ResourcePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
}

// Pool of resource-specific permissions
const resourcePermissions$ = pool(
  (resourceId: string) => fetchResourcePermissions(resourceId),
  { gcTime: 5 * 60 * 1000 } // Cache for 5 minutes
);

// Check permission for specific resource
const canEditResource$ = (resourceId: string) =>
  derived(({ read, from }) => {
    const resource$ = from(resourcePermissions$, resourceId);
    return read(resource$).canEdit;
  });

// Combine with global permissions
const canDeleteResource$ = (resourceId: string) =>
  derived(({ read, from, or }) => {
    const resource$ = from(resourcePermissions$, resourceId);
    const resourcePerms = read(resource$);

    return or([
      resourcePerms.isOwner, // Owner can always delete
      canAdmin$, // Admin can delete anything
    ]);
  });
```

### Document-Level Access Control

```ts
interface Document {
  id: string;
  ownerId: string;
  visibility: "private" | "team" | "public";
  teamId?: string;
}

const documentPool$ = pool((docId: string) => fetchDocument(docId), {
  gcTime: 60_000,
});

const canViewDocument$ = (docId: string) =>
  derived(({ read, from, or }) => {
    const doc$ = from(documentPool$, docId);
    const doc = read(doc$);
    const user = read(currentUser$);

    // Public documents are viewable by anyone
    if (doc.visibility === "public") return true;

    // Owner can always view
    if (doc.ownerId === user.id) return true;

    return or([
      // Team visibility + user is in team
      () => {
        if (doc.visibility !== "team") return false;
        const team = read(teamMembers$(doc.teamId!));
        return team.includes(user.id);
      },
      // Admin override
      canAdmin$,
    ]);
  });
```

---

## UI Patterns

### Permission-Based Component Rendering

```tsx
// React example with useAtom
import { useAtom } from "atomirx/react";

// Permission gate component
function PermissionGate({
  permission$,
  children,
  fallback = null,
}: {
  permission$: DerivedAtom<boolean>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = useAtom(permission$);

  return hasPermission ? children : fallback;
}

// Usage
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <PermissionGate permission$={canRead$}>
        <DataTable />
      </PermissionGate>

      <PermissionGate permission$={canWrite$} fallback={<ReadOnlyView />}>
        <EditableForm />
      </PermissionGate>

      <PermissionGate permission$={canAdmin$}>
        <AdminPanel />
      </PermissionGate>
    </div>
  );
}
```

### Action Button with Permission Check

```tsx
function ActionButton({
  permission$,
  onClick,
  children,
}: {
  permission$: DerivedAtom<boolean>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const state = useAtomState(permission$);

  if (state.status === "loading") {
    return <button disabled>Loading...</button>;
  }

  if (!state.value) {
    return null; // Or return disabled button with tooltip
  }

  return <button onClick={onClick}>{children}</button>;
}
```

### Loading States for Permissions

```tsx
function ProtectedContent({ permission$, children }: Props) {
  const state = useAtomState(permission$);

  switch (state.status) {
    case "loading":
      return <Skeleton />;
    case "error":
      return <ErrorBoundary error={state.error} />;
    case "ready":
      return state.value ? children : <AccessDenied />;
  }
}
```

---

## Best Practices

### 1. Single Source of Truth

Keep all permission data in a single session atom:

```ts
// ✅ Good - single source
const session$ = atom(() => fetchSession());
const canWrite$ = derived(({ read }) => read(session$).permissions.canWrite);

// ❌ Bad - multiple sources
const sessionA$ = atom(() => fetchSession());
const sessionB$ = atom(() => fetchSession()); // Duplicate!
```

### 2. Prefer Derived Atoms Over Functions

```ts
// ✅ Good - reactive and cached
const canModify$ = derived(({ or }) => or([canWrite$, canDelete$]));

// ❌ Bad - recomputes on every call
const canModify = () => canWrite$.get() || canDelete$.get();
```

### 3. Use Short-Circuit Evaluation

```ts
// ✅ Good - expensive check only runs if first condition passes
const canAccess$ = derived(({ and }) =>
  and([
    isAuthenticated$, // Cheap check first
    () => hasTeamAccess$, // Expensive check only if authenticated
  ])
);
```

### 4. Handle Errors Gracefully

```ts
// ✅ Good - explicit error handling
const safePermission$ = derived(({ state }) => {
  const result = state(permission$);

  if (result.status === "error") {
    console.error("Permission check failed:", result.error);
    return false; // Safe default
  }

  return result.value ?? false;
});
```

### 5. Cache Resource Permissions

```ts
// ✅ Good - cached with automatic cleanup
const resourcePerms$ = pool((id: string) => fetchResourcePermissions(id), {
  gcTime: 5 * 60 * 1000,
});

// ❌ Bad - creates new atom every time
const getResourcePerms = (id: string) =>
  atom(() => fetchResourcePermissions(id));
```

### 6. Use Explicit Types

```ts
// ✅ Good - type-safe permissions
type Permission = "canRead" | "canWrite" | "canDelete" | "canAdmin";

const hasPermission$ = (permission: Permission) =>
  derived(({ read }) => read(permissions$)[permission]);

// ❌ Bad - stringly-typed
const hasPermission$ = (
  permission: string // No type safety
) => derived(({ read }) => (read(permissions$) as any)[permission]);
```

---

## Anti-Patterns

### ❌ Don't Check Permissions in Effects

```ts
// ❌ Bad - side effect with permission check
effect(({ read }) => {
  if (read(canWrite$)) {
    saveData(); // This runs every time canWrite$ or data changes
  }
});

// ✅ Good - derive the action availability
const canSave$ = derived(({ and }) => and([canWrite$, hasChanges$]));
// Then check canSave$ in the UI before allowing save action
```

### ❌ Don't Store Permissions in Local Variables

```ts
// ❌ Bad - loses reactivity
function Component() {
  const canWrite = canWrite$.get(); // Not reactive!
  // ...
}

// ✅ Good - stays reactive
function Component() {
  const canWrite = useAtom(canWrite$); // Reactive
  // ...
}
```

### ❌ Don't Mutate Permission Objects

```ts
// ❌ Bad - mutating permission object
const permissions = read(permissions$);
permissions.canWrite = true; // Mutation!

// ✅ Good - treat as immutable, update at source
session$.set((session) => ({
  ...session,
  permissions: { ...session.permissions, canWrite: true },
}));
```

### ❌ Don't Duplicate Permission Logic

```ts
// ❌ Bad - duplicated logic
const canEditPost$ = derived(({ read }) => {
  const roles = read(roles$);
  return roles.includes("editor") || roles.includes("admin");
});

const canEditComment$ = derived(({ read }) => {
  const roles = read(roles$);
  return roles.includes("editor") || roles.includes("admin"); // Same logic!
});

// ✅ Good - reusable permission atom
const hasEditRole$ = derived(({ read }) => {
  const roles = read(roles$);
  return roles.includes("editor") || roles.includes("admin");
});

const canEditPost$ = derived(({ and }) => and([hasEditRole$, canWrite$]));
const canEditComment$ = derived(({ and }) => and([hasEditRole$, canWrite$]));
```

---

## Complete Example

Here's a complete permissions module:

```ts
// permissions.ts
import { atom, derived, pool } from "atomirx";

// ============================================================================
// Types
// ============================================================================

export type Role = "viewer" | "editor" | "admin" | "superadmin";

export interface Session {
  user: User;
  permissions: Permissions;
  roles: Role[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Permissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canAdmin: boolean;
}

// ============================================================================
// Session
// ============================================================================

const sessionRefresh$ = atom(0);

export const session$ = derived(({ read }) => {
  read(sessionRefresh$);
  return fetchSession();
});

export const refreshSession = () => sessionRefresh$.set((n) => n + 1);

// ============================================================================
// Core Atoms
// ============================================================================

export const currentUser$ = derived(({ read }) => read(session$).user);
export const permissions$ = derived(({ read }) => read(session$).permissions);
export const roles$ = derived(({ read }) => read(session$).roles);

// ============================================================================
// Individual Permissions
// ============================================================================

export const canRead$ = derived(({ read }) => read(permissions$).canRead);
export const canWrite$ = derived(({ read }) => read(permissions$).canWrite);
export const canDelete$ = derived(({ read }) => read(permissions$).canDelete);
export const canAdmin$ = derived(({ read }) => read(permissions$).canAdmin);

// ============================================================================
// Combined Permissions
// ============================================================================

export const canModify$ = derived(({ or }) => or([canWrite$, canDelete$]));

export const hasFullAccess$ = derived(({ and }) =>
  and([canRead$, canWrite$, canDelete$])
);

// ============================================================================
// Role Checks
// ============================================================================

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

export const hasRole = (requiredRole: Role) =>
  derived(({ read }) => {
    const userRoles = read(roles$);
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    return userRoles.some((role) => ROLE_HIERARCHY[role] >= requiredLevel);
  });

export const isViewer$ = hasRole("viewer");
export const isEditor$ = hasRole("editor");
export const isAdmin$ = hasRole("admin");
export const isSuperAdmin$ = hasRole("superadmin");

// ============================================================================
// Resource Permissions (Pool-based)
// ============================================================================

export const resourcePermissions$ = pool(
  (resourceId: string) => fetchResourcePermissions(resourceId),
  { gcTime: 5 * 60 * 1000 }
);

export const canEditResource = (resourceId: string) =>
  derived(({ read, from, or }) => {
    const perms$ = from(resourcePermissions$, resourceId);
    const resourcePerms = read(perms$);
    return or([resourcePerms.canEdit, isAdmin$]);
  });

export const canDeleteResource = (resourceId: string) =>
  derived(({ read, from, or }) => {
    const perms$ = from(resourcePermissions$, resourceId);
    const resourcePerms = read(perms$);
    return or([resourcePerms.isOwner, isSuperAdmin$]);
  });

// ============================================================================
// Feature-Gated Permissions
// ============================================================================

export const featureFlags$ = atom(() => fetchFeatureFlags());

export const canUseFeature = (feature: string) =>
  derived(({ read, and }) => {
    const flags = read(featureFlags$);
    return and([flags[feature] ?? false, canRead$]);
  });
```

---

## Summary

| Pattern                     | Use Case                             |
| --------------------------- | ------------------------------------ |
| `derived` with `read`       | Single permission extraction         |
| `and()`                     | All conditions must be true          |
| `or()`                      | Any condition can be true            |
| `() => atom` in combinators | Lazy evaluation for expensive checks |
| `pool`                      | Resource-level permissions           |
| `state()`                   | Loading/error handling               |
| `hasRole('role')` factory   | Role hierarchy checks                |

For more information on the underlying APIs, see:

- [Core Concepts](./core-concepts.md)
- [Async Patterns](./async-patterns.md)
- [API Reference](./api-reference.md)
