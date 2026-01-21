/**
 * @fileoverview Main application entry point
 *
 * Re-exports ShowcaseScreen as the root component.
 */

import { ShowcaseScreen } from "./features/showcase/screens/showcaseScreen";

/**
 * Root application component.
 *
 * @description
 * Renders the showcase screen which demonstrates atomirx features.
 * All application logic is delegated to the ShowcaseScreen component.
 */
function App() {
  return <ShowcaseScreen />;
}

export default App;
