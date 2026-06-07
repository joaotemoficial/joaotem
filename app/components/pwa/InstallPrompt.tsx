import { useEffect, useState } from "react";
import { Download, Share, X, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "jt-pwa-install-dismissed";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

/**
 * Custom install callout. On Android/Chrome it captures the native
 * `beforeinstallprompt` event and shows an "Instalar app" banner. On iOS Safari
 * (which never fires that event) it shows manual "Adicionar à Tela de Início"
 * instructions. Dismissals are remembered in localStorage.
 *
 * Note: only appears in a secure context (HTTPS or localhost) with the service
 * worker active — it will not show over a plain-HTTP LAN address.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    console.info("[PWA] InstallPrompt mounted", {
      secureContext: window.isSecureContext,
      standalone: isInStandaloneMode(),
      ios: isIos(),
      dismissed: !!localStorage.getItem(DISMISS_KEY),
      hasSW: "serviceWorker" in navigator,
    });

    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    const handler = (e: Event) => {
      console.info("[PWA] beforeinstallprompt fired ✅");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferredPrompt(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
    setDeferredPrompt(null);
  };

  const visible = deferredPrompt || showIosHint;
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
        <img
          src="/pwa-192x192.png"
          alt="João Tem"
          className="size-11 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            Instale o app João Tem
          </p>
          {showIosHint ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              Toque em <Share className="inline size-3.5" /> e em "Adicionar à
              Tela de Início" <Plus className="inline size-3.5" />
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acesso rápido, direto da sua tela inicial.
            </p>
          )}
        </div>
        {!showIosHint && (
          <Button size="sm" onClick={install} className="shrink-0">
            <Download className="size-4" />
            Instalar
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
