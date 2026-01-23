# React Best Practices

**Vercel Engineering — Performance Optimization Guide**

40+ rules across 8 categories. Use for React/Next.js code generation, review, and refactoring.

---

## 1. Eliminating Waterfalls — CRITICAL

Waterfalls = #1 performance killer. Each sequential await = full network latency.

### 1.1 Defer Await Until Needed

```typescript
// ❌ Blocks both branches
async function handleRequest(userId: string, skip: boolean) {
  const data = await fetchUserData(userId);
  if (skip) return { skipped: true };
  return processUserData(data);
}

// ✅ Only blocks when needed
async function handleRequest(userId: string, skip: boolean) {
  if (skip) return { skipped: true };
  const data = await fetchUserData(userId);
  return processUserData(data);
}
```

### 1.2 Promise.all() for Independent Ops

```typescript
// ❌ Sequential: 3 round trips
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();

// ✅ Parallel: 1 round trip
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
]);
```

### 1.3 Dependency-Based Parallelization

```typescript
// ❌ Profile waits for config unnecessarily
const [user, config] = await Promise.all([fetchUser(), fetchConfig()]);
const profile = await fetchProfile(user.id);

// ✅ Config and profile run in parallel (better-all)
import { all } from "better-all";

const { user, config, profile } = await all({
  async user() { return fetchUser(); },
  async config() { return fetchConfig(); },
  async profile() { return fetchProfile((await this.$.user).id); }
});
```

### 1.4 Strategic Suspense Boundaries

```tsx
// ❌ Wrapper blocked by data
async function Page() {
  const data = await fetchData();
  return (
    <div>
      <Sidebar />
      <DataDisplay data={data} />
    </div>
  );
}

// ✅ Wrapper shows immediately
function Page() {
  return (
    <div>
      <Sidebar />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
    </div>
  );
}

async function DataDisplay() {
  const data = await fetchData();
  return <div>{data.content}</div>;
}
```

---

## 2. Bundle Size Optimization — CRITICAL

### 2.1 Avoid Barrel File Imports

```tsx
// ❌ Imports entire library (1,583 modules)
import { Check, X, Menu } from "lucide-react";

// ✅ Direct imports (3 modules)
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import Menu from "lucide-react/dist/esm/icons/menu";

// ✅ Or use Next.js optimization
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@mui/material"]
  }
};
```

### 2.2 Dynamic Imports for Heavy Components

```tsx
// ❌ Monaco bundles with main chunk (~300KB)
import { MonacoEditor } from "./monaco-editor";

// ✅ Monaco loads on demand
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(
  () => import("./monaco-editor").then(m => m.MonacoEditor),
  { ssr: false }
);
```

### 2.3 Preload on User Intent

```tsx
function EditorButton({ onClick }) {
  const preload = () => {
    if (typeof window !== "undefined") void import("./monaco-editor");
  };

  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  );
}
```

### 2.4 Defer Non-Critical Libraries

```tsx
// ❌ Blocks initial bundle
import { Analytics } from "@vercel/analytics/react";

// ✅ Loads after hydration
import dynamic from "next/dynamic";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then(m => m.Analytics),
  { ssr: false }
);
```

---

## 3. Server-Side Performance — HIGH

### 3.1 React.cache() for Request Deduplication

```typescript
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return await db.user.findUnique({ where: { id: session.user.id } });
});
```

### 3.2 Cross-Request LRU Caching

```typescript
import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, any>({ max: 1000, ttl: 5 * 60 * 1000 });

export async function getUser(id: string) {
  const cached = cache.get(id);
  if (cached) return cached;
  const user = await db.user.findUnique({ where: { id } });
  cache.set(id, user);
  return user;
}
```

### 3.3 Minimize Serialization at RSC Boundaries

```tsx
// ❌ Serializes all 50 fields
async function Page() {
  const user = await fetchUser();
  return <Profile user={user} />;
}

// ✅ Serializes only 1 field
async function Page() {
  const user = await fetchUser();
  return <Profile name={user.name} />;
}
```

### 3.4 after() for Non-Blocking Ops

```tsx
import { after } from "next/server";

export async function POST(request: Request) {
  await updateDatabase(request);
  after(() => sendAnalytics(request)); // Runs after response
  return Response.json({ status: "success" });
}
```

---

## 4. Client-Side Data Fetching — MEDIUM-HIGH

### 4.1 SWR for Automatic Deduplication

```tsx
// ❌ No deduplication, each instance fetches
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setUsers);
  }, []);
}

// ✅ Multiple instances share one request
import useSWR from "swr";

function UserList() {
  const { data: users } = useSWR("/api/users", fetcher);
}
```

### 4.2 Passive Event Listeners

```typescript
// ❌ Blocks scrolling
document.addEventListener("touchstart", handleTouch);

// ✅ Enables immediate scrolling
document.addEventListener("touchstart", handleTouch, { passive: true });
document.addEventListener("wheel", handleWheel, { passive: true });
```

### 4.3 Version localStorage Data

```typescript
const VERSION = "v2";

function saveConfig(config) {
  try {
    localStorage.setItem(`userConfig:${VERSION}`, JSON.stringify(config));
  } catch {}
}
```

---

## 5. Re-render Optimization — MEDIUM

### 5.1 Functional setState

```tsx
// ❌ Requires state as dependency, risk of stale closure
const addItems = useCallback((newItems) => {
  setItems([...items, ...newItems]);
}, [items]);

// ✅ Stable callback, no stale closures
const addItems = useCallback((newItems) => {
  setItems(curr => [...curr, ...newItems]);
}, []);
```

### 5.2 Extract to Memoized Components

```tsx
// ❌ Computes avatar even when loading
function Profile({ user, loading }) {
  const avatar = useMemo(() => computeAvatarId(user), [user]);
  if (loading) return <Skeleton />;
  return <Avatar id={avatar} />;
}

// ✅ Skips computation when loading
const UserAvatar = memo(function UserAvatar({ user }) {
  const id = useMemo(() => computeAvatarId(user), [user]);
  return <Avatar id={id} />;
});

function Profile({ user, loading }) {
  if (loading) return <Skeleton />;
  return <UserAvatar user={user} />;
}
```

### 5.3 Lazy State Initialization

```tsx
// ❌ Runs on every render
const [index, setIndex] = useState(buildSearchIndex(items));

// ✅ Runs only once
const [index, setIndex] = useState(() => buildSearchIndex(items));
```

### 5.4 Narrow Effect Dependencies

```tsx
// ❌ Re-runs on any user change
useEffect(() => console.log(user.id), [user]);

// ✅ Re-runs only when id changes
useEffect(() => console.log(user.id), [user.id]);
```

### 5.5 startTransition for Non-Urgent Updates

```tsx
import { startTransition } from "react";

useEffect(() => {
  const handler = () => startTransition(() => setScrollY(window.scrollY));
  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
}, []);
```

---

## 6. Rendering Performance — MEDIUM

### 6.1 CSS content-visibility for Long Lists

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### 6.2 Hoist Static JSX

```tsx
// ❌ Recreates element every render
function Container() {
  return loading && <div className="skeleton" />;
}

// ✅ Reuses same element
const skeleton = <div className="skeleton" />;

function Container() {
  return loading && skeleton;
}
```

### 6.3 Prevent Hydration Mismatch

```tsx
// ✅ No flicker, no hydration mismatch
function ThemeWrapper({ children }) {
  return (
    <>
      <div id="theme-wrapper">{children}</div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme') || 'light';
                document.getElementById('theme-wrapper').className = theme;
              } catch (e) {}
            })();
          `,
        }}
      />
    </>
  );
}
```

### 6.4 Explicit Conditional Rendering

```tsx
// ❌ Renders "0" when count is 0
{count && <Badge>{count}</Badge>}

// ✅ Renders nothing when count is 0
{count > 0 ? <Badge>{count}</Badge> : null}
```

---

## 7. JavaScript Performance — LOW-MEDIUM

### 7.1 Build Index Maps

```typescript
// ❌ O(n) per lookup
orders.map(order => ({
  ...order,
  user: users.find(u => u.id === order.userId)
}));

// ✅ O(1) per lookup
const userById = new Map(users.map(u => [u.id, u]));
orders.map(order => ({ ...order, user: userById.get(order.userId) }));
```

### 7.2 Set/Map for Lookups

```typescript
// ❌ O(n) per check
items.filter(item => allowedIds.includes(item.id));

// ✅ O(1) per check
const allowedIds = new Set(["a", "b", "c"]);
items.filter(item => allowedIds.has(item.id));
```

### 7.3 toSorted() for Immutability

```typescript
// ❌ Mutates original array
const sorted = users.sort((a, b) => a.name.localeCompare(b.name));

// ✅ Creates new array
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name));
```

### 7.4 Early Return

```typescript
// ❌ Processes all items after finding error
function validate(users) {
  let error = "";
  for (const user of users) {
    if (!user.email) error = "Email required";
  }
  return error ? { error } : { valid: true };
}

// ✅ Returns immediately on first error
function validate(users) {
  for (const user of users) {
    if (!user.email) return { error: "Email required" };
  }
  return { valid: true };
}
```

### 7.5 Combine Array Iterations

```typescript
// ❌ 3 iterations
const admins = users.filter(u => u.isAdmin);
const testers = users.filter(u => u.isTester);
const inactive = users.filter(u => !u.isActive);

// ✅ 1 iteration
const admins = [], testers = [], inactive = [];
for (const user of users) {
  if (user.isAdmin) admins.push(user);
  if (user.isTester) testers.push(user);
  if (!user.isActive) inactive.push(user);
}
```

### 7.6 Cache Storage API Calls

```typescript
const storageCache = new Map<string, string | null>();

function getLocalStorage(key: string) {
  if (!storageCache.has(key)) {
    storageCache.set(key, localStorage.getItem(key));
  }
  return storageCache.get(key);
}
```

### 7.7 Hoist RegExp

```tsx
// ❌ New RegExp every render
function Highlighter({ text, query }) {
  const regex = new RegExp(`(${query})`, "gi");
  return <>{text.split(regex).map(...)}</>;
}

// ✅ Memoized
function Highlighter({ text, query }) {
  const regex = useMemo(() => new RegExp(`(${query})`, "gi"), [query]);
  return <>{text.split(regex).map(...)}</>;
}
```

---

## 8. Advanced Patterns — LOW

### 8.1 useLatest for Stable Callback Refs

```typescript
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

// Usage: stable effect, fresh callback
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState("");
  const onSearchRef = useLatest(onSearch);

  useEffect(() => {
    const timeout = setTimeout(() => onSearchRef.current(query), 300);
    return () => clearTimeout(timeout);
  }, [query]); // No onSearch dependency
}
```

### 8.2 useEffectEvent for Stable Subscriptions

```tsx
import { useEffectEvent } from "react";

function useWindowEvent(event: string, handler: () => void) {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    window.addEventListener(event, onEvent);
    return () => window.removeEventListener(event, onEvent);
  }, [event]); // No handler dependency
}
```

---

## References

- [react.dev](https://react.dev)
- [nextjs.org](https://nextjs.org)
- [swr.vercel.app](https://swr.vercel.app)
- [github.com/shuding/better-all](https://github.com/shuding/better-all)
- [github.com/isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache)
