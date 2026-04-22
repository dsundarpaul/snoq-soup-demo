"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { purgeLegacyAuthStorage } from "@/lib/auth-tokens";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/contexts/language-context";
import { HunterApiSessionSync } from "@/providers/hunter-api-session-sync";
import { ObservabilityClientInit } from "@/providers/observability-client-init";
import { AppErrorBoundary } from "@/providers/app-error-boundary";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    purgeLegacyAuthStorage();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ObservabilityClientInit />
        <QueryClientProvider client={queryClient}>
          <HunterApiSessionSync />
          <TooltipProvider>
            <AppErrorBoundary>{children}</AppErrorBoundary>
            <Toaster />
            <PWAInstallPrompt />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
