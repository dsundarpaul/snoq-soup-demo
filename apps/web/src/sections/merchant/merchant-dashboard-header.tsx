"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/language-context";
import { useTheme } from "@/hooks/use-theme";
import { Home, LogOut, Moon, Settings2, Sun, User } from "lucide-react";
import type { Merchant } from "@shared/schema";
import { APP_NAME, appLogo } from "@/lib/app-brand";

export interface MerchantDashboardHeaderProps {
  merchant: Merchant | undefined;
  onLogout: () => void;
}

export function MerchantDashboardHeader({
  merchant,
  onLogout,
}: MerchantDashboardHeaderProps) {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            router.push("/merchant/dashboard");
          }}
          className="flex items-center gap-2 sm:gap-3 min-w-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <img
            src={merchant?.logoUrl || appLogo.src}
            alt={merchant?.businessName || APP_NAME}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 ${
              merchant?.logoUrl ? "object-cover" : "object-contain"
            }`}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                data-testid="button-merchant-display-menu"
                title={`${t("home.theme")}, ${t("common.language")}`}
              >
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">
                  {t("home.theme")}, {t("common.language")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun className="mr-2 h-4 w-4" />
                  {t("home.theme")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(v) => setTheme(v as "light" | "dark")}
                  >
                    <DropdownMenuRadioItem value="light">
                      <Sun className="mr-2 h-4 w-4" />
                      {t("home.light")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="mr-2 h-4 w-4" />
                      {t("home.dark")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("common.language")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={language}
                    onValueChange={(v) => setLanguage(v as "en" | "ar")}
                  >
                    <DropdownMenuRadioItem value="en">
                      {t("common.english")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ar">
                      {t("common.arabic")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
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
