# Showcase Feature

The showcase feature is the main demo application for the atomirx state management library. It provides interactive demonstrations of all atomirx features.

## Structure

```
showcase/
├── README.md              # Feature documentation (required)
├── stores/                # State management stores
│   └── eventLogStore.ts   # Central event log for demo interactions
├── comps/                 # Feature-specific components
│   ├── showcaseHeader/    # Application header with branding
│   ├── showcaseNav/       # Demo navigation tabs
│   ├── eventLogPanel/     # Event log display panel
│   ├── basicAtomDemo/     # Demo: basic atom usage
│   ├── derivedAtomDemo/   # Demo: derived atoms
│   ├── batchDemo/         # Demo: batch updates
│   ├── todoListDemo/      # Demo: todo list state
│   ├── asyncUtilitiesDemo/# Demo: async utilities
│   ├── useActionDemo/     # Demo: useAction hook
│   └── useSelectorDemo/   # Demo: useSelector hook
└── screens/               # Screen compositions (mobile-first terminology)
    └── showcaseScreen/    # Main showcase screen
```

## Architecture

This feature follows Feature-Sliced Architecture (FSA) principles:

- **stores/**: Contains atomirx stores using the `define()` pattern
- **comps/**: Feature-specific components with `.pure.tsx` pattern for testability
- **screens/**: Orchestrating screen components that compose comps (mobile-first terminology)

**Note:** FSA uses `screens/` instead of `pages/` for mobile-first compatibility.

## Usage

The showcase screen is the main entry point:

```tsx
import { ShowcaseScreen } from "@/features/showcase/screens/showcaseScreen";

function App() {
  return <ShowcaseScreen />;
}
```

## Event Logging

All demos use the `eventLogStore` to log state changes, making the atomirx behavior visible to users:

```tsx
import { eventLogStore } from "@/features/showcase/stores/eventLogStore";

const { log, clear } = eventLogStore();

// Log an event
log("Counter incremented", "success");

// Clear logs
clear();
```
