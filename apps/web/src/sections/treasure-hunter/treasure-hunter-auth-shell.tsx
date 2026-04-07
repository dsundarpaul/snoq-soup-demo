"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useDeviceId } from "@/hooks/use-device-id";

export interface TreasureHunterAuthShellProps {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}

export function TreasureHunterAuthShell({
  title,
  Icon,
  children,
}: TreasureHunterAuthShellProps) {
  const deviceId = useDeviceId();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto p-4">
        {!deviceId ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
