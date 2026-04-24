"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Store,
  LogOut,
  Moon,
  Sun,
  Loader2,
  MapPin,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeviceId } from "@/hooks/use-device-id";
import { useLanguage } from "@/contexts/language-context";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import {
  useTreasureHunterProfileQuery,
  useTreasureHunterLogoutMutation,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { clearSessionsExcept } from "@/lib/auth-session";
import { useRoleCredentialState } from "@/hooks/use-role-credentials";
import { APP_NAME, appLogo } from "@/lib/app-brand";

type GeoState = {
  loading: boolean;
  error: string | null;
};

export interface HomeHeaderProps {
  geo: GeoState;
}

export function HomeHeader({ geo }: HomeHeaderProps) {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const deviceId = useDeviceId();
  const { toast } = useToast();

  const { hasCredentials: hasMerchantSession } =
    useRoleCredentialState("merchant");
  const { data: profile } = useTreasureHunterProfileQuery();

  const logoutMutation = useTreasureHunterLogoutMutation({
    onSuccess: () => {
      toast({
        title: t("toast.signedOut"),
        description: t("toast.signedOutDesc"),
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: t("toast.logoutFailed"),
        description: t("toast.logoutFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const isSignedIn = Boolean(profile?.email);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={appLogo.src}
              alt={APP_NAME}
              width={appLogo.width}
              height={appLogo.height}
              className="w-9 h-9 rounded-lg shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-foreground">
                  {APP_NAME}
                </h1>
                {geo.loading ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[10px] px-1.5 py-0.5 shrink-0"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </Badge>
                ) : geo.error ? (
                  <Badge
                    variant="destructive"
                    className="gap-1 text-[10px] px-1.5 py-0.5 shrink-0"
                  >
                    <MapPin className="w-3 h-3" />
                  </Badge>
                ) : (
                  <Badge className="gap-1 text-[10px] px-1.5 py-0.5 shrink-0 bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20">
                    <Compass className="w-3 h-3" />
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t("home.subtitle")}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                data-testid="button-home-account-menu"
              >
                <User className="h-4 w-4" />
                <span className="sr-only">{t("home.accountMenu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {t("home.accountMenu")}
                  </p>
                  {isSignedIn && profile?.email && (
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={
                    isSignedIn
                      ? "/profile"
                      : `/login?next=${encodeURIComponent("/profile")}`
                  }
                  data-testid="menu-profile"
                  onClick={() => clearSessionsExcept("hunter")}
                >
                  <User className="mr-2 h-4 w-4" />
                  {t("nav.profile")}
                </Link>
              </DropdownMenuItem>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (hasMerchantSession) {
                    router.replace("/merchant/dashboard");
                  } else {
                    clearSessionsExcept("merchant");
                    router.push("/merchant");
                  }
                }}
                data-testid="menu-login-merchant"
              >
                <Store className="mr-2 h-4 w-4" />
                {t("nav.loginAsMerchant")}
              </DropdownMenuItem>
              {!isSignedIn && (
                <DropdownMenuItem
                  onClick={() => {
                    clearSessionsExcept("hunter");
                    router.push("/login");
                  }}
                  data-testid="menu-login-user"
                >
                  <User className="mr-2 h-4 w-4" />
                  {t("nav.loginAsUser")}
                </DropdownMenuItem>
              )}
              {isSignedIn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      deviceId && logoutMutation.mutate({ deviceId })
                    }
                    disabled={logoutMutation.isPending}
                    data-testid="menu-logout"
                    className="text-destructive focus:text-destructive"
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
