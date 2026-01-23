/**
 * @fileoverview Main application entry point
 *
 * Re-exports ShowcaseScreen as the root component with DevTools integration.
 */

import { ShowcaseScreen } from "./features/showcase/screens/showcaseScreen";
import { DevToolsPanel } from "atomirx/react-devtools";

/**
 * Root application component.
 *
 * @description
 * Renders the showcase screen which demonstrates atomirx features.
 * All application logic is delegated to the ShowcaseScreen component.
 * DevTools panel is included for debugging and inspection.
 */
function App() {
  return (
    <>
      <ShowcaseScreen />
      <DevToolsPanel autoSetup={false} />
    </>
  );
}

export default App;
