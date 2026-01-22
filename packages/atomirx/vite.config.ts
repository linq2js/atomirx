/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "react/index": resolve(__dirname, "src/react/index.ts"),
        "devtools/index": resolve(__dirname, "src/devtools/index.ts"),
        "react-devtools/index": resolve(__dirname, "src/react-devtools/index.ts"),
      },
      name: "Atomirx",
      fileName: (format, entryName) => {
        const ext = format === "es" ? "js" : "cjs";
        return `${entryName}.${ext}`;
      },
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Use regex to externalize all react-related imports including jsx-runtime
      external: [/^react($|\/)/, /^react-dom($|\/)/],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "React",
          "react/jsx-dev-runtime": "React",
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
