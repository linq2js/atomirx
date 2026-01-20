/**
 * @fileoverview Main application entry point
 *
 * Re-exports ShowcasePage as the root component.
 */

import { ShowcasePage } from "./features/showcase/pages";

/**
 * Root application component.
 *
 * @description
 * Renders the showcase page which demonstrates atomirx features.
 * All application logic is delegated to the ShowcasePage component.
 */
function App() {
  return <ShowcasePage />;
}

export default App;
