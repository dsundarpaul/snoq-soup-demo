"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Merchant } from "@shared/schema";

const appLogoSrc = "/images/clean_trophy_logo_no_text.png";

export interface MerchantDashboardHeaderProps {
  merchant: Merchant | undefined;
  onLogout: () => void;
}

export function MerchantDashboardHeader({
  merchant,
  onLogout,
}: MerchantDashboardHeaderProps) {
  const router = useRouter();

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          className="flex items-center gap-2 sm:gap-3 min-w-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <img
            src={merchant?.logoUrl || appLogoSrc}
            alt={merchant?.businessName || "Souq-Snap"}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 object-cover"
          />
          <div className="min-w-0">
            <h1 className="font-bold text-foreground text-sm sm:text-base truncate">
              {merchant?.businessName || "Merchant Dashboard"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Merchant Dashboard
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/")}
            className="sm:hidden"
            data-testid="button-go-home-mobile"
          >
            <Home className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2 hidden sm:flex"
            data-testid="button-go-home"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/merchant/profile")}
            data-testid="button-account"
            title="Profile"
          >
            {merchant?.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
