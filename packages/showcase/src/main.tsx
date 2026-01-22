import "./index.css";

// Setup devtools FIRST using top-level await
const { setupDevtools } = await import("atomirx/devtools");
setupDevtools();

// THEN import React and App (which contains atoms)
const React = await import("react");
const ReactDOM = await import("react-dom/client");
const { default: App } = await import("./App");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
