# Vercel React Best Practices

## Trigger

Use when writing, reviewing, or optimizing React/Next.js code. Focus on performance, bundle size, and rendering efficiency.

## Overview

Performance rules from Vercel Engineering. Organized by impact.

## Quick Reference

| Priority  | Category                  | Key Techniques                        |
| --------- | ------------------------- | ------------------------------------- |
| Critical  | Eliminating Waterfalls    | `Promise.all`, parallel fetches       |
| High      | Bundle Size               | Dynamic imports, tree shaking         |
| High      | Server Performance        | `React.cache`, `after()`, no blocking |
| Medium    | Client Data Fetching      | SWR, passive listeners                |
| Medium    | Re-render Optimization    | `memo`, `useMemo`, stable refs        |
| Low       | Rendering Performance     | `startTransition`, lazy init          |
| Low       | JavaScript Performance    | Early returns, cached calls           |

## Rules

Read `AGENTS.md` for complete rules with code examples.

## Key Patterns

### Parallel Fetching

```typescript
// ❌ SLOW
const user = await fetchUser(id);
const posts = await fetchPosts(id);

// ✅ FAST
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);
```

### Dynamic Imports

```typescript
// ❌ Bloated bundle
import { Chart } from "chart.js";

// ✅ Code split
const Chart = dynamic(() => import("./Chart"), { loading: () => <Skeleton /> });
```

### Memoization

```tsx
// ❌ Re-renders on every parent render
function List({ items }) { return items.map(...); }

// ✅ Skips re-render if items unchanged
const List = memo(function List({ items }) { return items.map(...); });
```

### Stable References

```tsx
// ❌ New function every render
<Button onClick={() => handleClick(id)} />

// ✅ Stable reference (atomirx)
const stable = useStable({ onClick: () => handleClick(id) });
<Button onClick={stable.onClick} />
```

### Non-blocking Operations

```typescript
// ❌ Blocks response
export async function POST(req) {
  const data = await req.json();
  await saveToDb(data);
  await sendAnalytics(data); // Blocks!
  return Response.json({ ok: true });
}

// ✅ Non-blocking
import { after } from "next/server";

export async function POST(req) {
  const data = await req.json();
  await saveToDb(data);
  after(() => sendAnalytics(data)); // Runs after response
  return Response.json({ ok: true });
}
```

## Categories

### Critical Impact

- Parallel data fetching
- Avoid request waterfalls
- `Promise.all` / `Promise.allSettled`

### High Impact

- Dynamic imports for large components
- Tree shaking (named exports)
- `React.cache` for request deduplication
- `after()` for non-blocking operations

### Medium Impact

- SWR for client-side data
- Passive event listeners
- `memo()` for expensive components
- `useMemo` for expensive computations
- Functional `setState`

### Low Impact

- `startTransition` for non-urgent updates
- Lazy state initialization
- Early returns
- Cached storage calls
- Index maps for O(1) lookup
