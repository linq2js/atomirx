/**
 * @fileoverview Main application entry point
 *
 * Re-exports ShowcaseScreen as the root component.
 * DevTools is rendered in a separate React root (see main.tsx).
 */

import { ShowcaseScreen } from "./features/showcase/screens/showcaseScreen";

/**
 * Root application component.
 *
 * @description
 * Renders the showcase screen which demonstrates atomirx features.
 * All application logic is delegated to the ShowcaseScreen component.
 *
 * Note: DevTools is rendered separately in main.tsx using renderDevtools()
 * to isolate it from the app's React tree and avoid concurrent update issues.
 */
function App() {
  return <ShowcaseScreen />;
}

export default App;
