import "./index.css";

// Render devtools in separate React root FIRST
const { renderDevtools } = await import("atomirx/react-devtools");
await renderDevtools();

// THEN import React and App (which contains atoms)
const React = await import("react");
const ReactDOM = await import("react-dom/client");
const { default: App } = await import("./App");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
