import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Serve the dev server over HTTPS (self-signed) so the PWA can be tested on
  // a LAN IP from a phone. host: true exposes it on the network.
  server: {
    host: true,
  },
  plugins: [
    basicSsl(),
    tailwindcss(),
    reactRouter(),
    VitePWA({
      registerType: "autoUpdate",
      // React Router framework mode has no index.html to inject into,
      // so we register the service worker manually from a client component.
      injectRegister: null,
      manifest: {
        name: "João Tem",
        short_name: "João Tem",
        description: "João Tem — seu marketplace local.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshots/wide.png",
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "João Tem no desktop",
          },
          {
            src: "screenshots/narrow.png",
            sizes: "720x1280",
            type: "image/png",
            // no form_factor => used for mobile rich install UI
            label: "João Tem no celular",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // SSR app: never serve a cached SPA shell for document navigations,
        // let the server render them. Precache static assets only.
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        // SW is generateSW (default) — serve it as a classic worker in dev.
        type: "classic",
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
