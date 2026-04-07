"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/contexts/language-context";
import { HunterApiSessionSync } from "@/providers/hunter-api-session-sync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <HunterApiSessionSync />
          <TooltipProvider>
            {children}
            <Toaster />
            <PWAInstallPrompt />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
