import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      atomirx: path.resolve(__dirname, "../atomirx/src"),
      "atomirx/react": path.resolve(__dirname, "../atomirx/src/react"),
    },
  },
});
