# Showcase Feature

The showcase feature is the main demo application for the atomirx state management library. It provides interactive demonstrations of all atomirx features.

## Structure

```
showcase/
├── stores/          # State management stores
│   └── eventLogStore.ts   # Central event log for demo interactions
├── comps/           # Feature-specific components
│   ├── showcaseHeader/    # Application header with branding
│   ├── showcaseNav/       # Demo navigation tabs
│   └── eventLogPanel/     # Event log display panel
├── pages/           # Page components
│   └── showcasePage/      # Main showcase page
└── demos/           # Individual demo components
    ├── basicAtomDemo/
    ├── todoListDemo/
    ├── derivedAtomDemo/
    ├── batchDemo/
    ├── useActionDemo/
    ├── useSelectorDemo/
    └── asyncUtilitiesDemo/
```

## Architecture

This feature follows Feature-Sliced Architecture (FSA) principles:

- **stores/**: Contains atomirx stores using the `define()` pattern
- **comps/**: Feature-specific components with `.pure.tsx` pattern for testability
- **pages/**: Orchestrating page components that compose comps and demos
- **demos/**: Self-contained demo components showcasing atomirx features

## Usage

The showcase page is the main entry point:

```tsx
import { ShowcasePage } from './features/showcase/pages/showcasePage';

function App() {
  return <ShowcasePage />;
}
```

## Event Logging

All demos use the `eventLogStore` to log state changes, making the atomirx behavior visible to users:

```tsx
import { eventLogStore } from '../stores/eventLogStore';

// Log an event
eventLogStore.actions.log({ type: 'action', message: 'Counter incremented' });

// Clear logs
eventLogStore.actions.clear();
```
