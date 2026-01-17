# Project Context

## Purpose

**atomirx** is a lightweight, reactive state management library for TypeScript/JavaScript applications with first-class React integration.

### Goals
- Provide simple, intuitive APIs for reactive state (`atom`, `derived`, `effect`)
- Support async values with Suspense-like behavior (loading/error states)
- Enable fine-grained reactivity with conditional dependency tracking
- Offer React hooks (`useSelector`, `useAction`, `useStable`, `rx`) for seamless integration
- Maintain small bundle size with zero/minimal dependencies
- Support both ESM and CommonJS builds

### Non-Goals
- Not a full application framework (no routing, no data fetching layer)
- Not trying to replace Redux for complex state machines
- Not focused on server-side state synchronization

## Tech Stack

### Core
- **TypeScript** - Primary language, strict type safety
- **Vite** - Build tool and dev server
- **Vitest** - Testing framework
- **pnpm** - Package manager with workspace support

### Packages
- `atomirx` - Core library (atoms, derived, effect, batch, emitter, define)
- `atomirx/react` - React bindings (useSelector, useAction, useStable, rx)
- `showcase` - Demo application (React + Tailwind CSS)

### Runtime Dependencies
- `lodash` - Deep equality comparisons (considering removal for bundle size)

### Peer Dependencies (Optional)
- `react` ^18.0.0
- `react-dom` ^18.0.0

## Project Conventions

### Code Style

#### Naming
- **Files**: `camelCase.ts` for modules, `camelCase.test.ts` for tests
- **Functions/Variables**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for config objects

#### Exports
- Named exports preferred over default exports
- Re-export public API from `index.ts` files
- Types exported separately with `export type`

#### Documentation
- JSDoc comments for all public APIs
- Include `@example` blocks with runnable code
- Document edge cases and gotchas

### Architecture Patterns

#### Core Primitives
1. **atom** - Mutable reactive container with sync/async support
2. **derived** - Computed values from atoms (read-only, lazy, cached)
3. **effect** - Side effects that run when atoms change
4. **batch** - Group multiple updates into single notification
5. **emitter** - Pub/sub event system
6. **define** - Lazy singleton factory with DI support

#### Key Design Decisions
- **Lazy initialization**: Atoms and derived values compute on first access
- **Suspense-like getters**: Getters throw promises when loading, throw errors on failure
- **Conditional dependency tracking**: Only subscribe to atoms actually accessed
- **Equality-based notifications**: Subscribers only notified when value actually changes
- **Fallback support**: Atoms can provide fallback values during loading/error states

#### React Integration
- `useSelector` - Subscribe to atom values with automatic re-render
- `useAction` - Async action management with loading/error states
- `useStable` - Create stable atom instances scoped to component lifecycle
- `rx` - JSX helper for inline atom subscriptions

### Testing Strategy

#### Framework
- **Vitest** with jsdom environment for React tests
- Use `it` instead of `test` (per user preference)
- Write tests first (TDD), then implementation

#### Test Organization
- Co-located test files: `module.ts` → `module.test.ts`
- Describe blocks mirror module structure
- Each public API function has dedicated describe block

#### Coverage Requirements
- All public APIs must have tests
- Edge cases: null, undefined, empty arrays, async race conditions
- Error scenarios: rejected promises, thrown errors
- Cleanup: subscriptions, dispose functions, memory leaks

### Git Workflow

#### Commit Messages
- Conventional commit format: `type: subject`
- Keep subject under 100 characters
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

#### Branching
- `main` - Production-ready code
- Feature branches for new work

## Domain Context

### Reactive Programming Concepts
- **Atom**: A container that holds a value and notifies subscribers when it changes
- **Derived/Computed**: A value computed from other atoms, automatically updated
- **Effect**: A side effect that runs in response to atom changes
- **Subscription**: A listener registered to receive change notifications
- **Batching**: Grouping multiple updates to fire notifications once

### Async State Model
Atoms can be in one of three states:
1. **Loading**: `{ loading: true, value: fallback, error: undefined }`
2. **Success**: `{ loading: false, value: T, error: undefined }`
3. **Error**: `{ loading: false, value: fallback, error: unknown }`

### Thenable Pattern
All atoms implement `PromiseLike<T>`, allowing:
```typescript
const value = await atom;  // Wait for async atom to resolve
```

## Important Constraints

### Bundle Size
- Keep core library minimal (target < 5KB gzipped)
- Tree-shakeable exports
- Optional React integration (don't bundle if not used)

### Browser Support
- Modern browsers (ES2020+)
- No IE11 support

### React Compatibility
- React 18+ (concurrent features)
- Strict Mode compatible
- SSR considerations (no global state pollution)

### Type Safety
- Strict TypeScript configuration
- No `any` in public APIs
- Inference-friendly generics

## External Dependencies

### Build Tools
- **Vite** - Bundling and dev server
- **vite-plugin-dts** - TypeScript declaration generation
- **TypeScript** ^5.3.0

### Testing
- **Vitest** ^1.0.0
- **@testing-library/react** ^14.0.0
- **jsdom** ^24.0.0

### Runtime
- **lodash** ^4.17.21 (deep equality - considering alternatives)

### Showcase App
- **React** ^18.2.0
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
