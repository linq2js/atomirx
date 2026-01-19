import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "robots.txt",
        "apple-touch-icon.svg",
        "pwa-192x192.svg",
        "pwa-512x512.svg",
        "offline.html",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        // Cache offline.html for offline fallback
        additionalManifestEntries: [{ url: "/offline.html", revision: "1" }],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/jsonplaceholder\.typicode\.com\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: "Secure Todo",
        short_name: "Todo",
        description:
          "Offline-first encrypted todo app with passkey authentication",
        theme_color: "#3b82f6",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      atomirx: path.resolve(__dirname, "../atomirx/src"),
      "atomirx/react": path.resolve(__dirname, "../atomirx/src/react"),
    },
  },
  build: {
    sourcemap: true,
  },
});
