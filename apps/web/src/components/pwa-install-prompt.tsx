"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4 mx-4 mb-4 rounded-xl shadow-2xl border border-teal/30">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="button-dismiss-install"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-teal flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg className="w-8 h-8 text-teal-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3h14l-1.5 6H6.5L5 3zm2.5 8h9l-1 4H8.5l-1-4zm2 6h5l-.5 2h-4l-.5-2z"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg font-[Poppins]">
              Souq-Snap
            </h3>
            <p className="text-white/80 text-sm">
              {t("pwa.huntClaimReward")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-teal hover:bg-teal/90 text-teal-foreground font-semibold"
            data-testid="button-install-app"
          >
            <Download className="w-4 h-4 mr-2" />
            {t("pwa.addToHomeScreen")}
          </Button>
        </div>

        <p className="text-white/60 text-xs mt-2 text-center flex items-center justify-center gap-1">
          <Smartphone className="w-3 h-3" />
          {t("pwa.installForNative")}
        </p>
      </div>
    </div>
  );
}
