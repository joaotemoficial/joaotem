import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registers the service worker on the client. With `registerType: "autoUpdate"`
 * configured in vite.config.ts, new versions are applied silently in the
 * background — no UI is required. This component renders nothing and is a
 * no-op during SSR (useRegisterSW only runs in the browser).
 */
export function RegisterPWA() {
  useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.info("[PWA] SW registered:", swUrl, registration);
    },
    onRegisterError(error) {
      console.error("[PWA] SW registration FAILED:", error);
    },
  });
  return null;
}
