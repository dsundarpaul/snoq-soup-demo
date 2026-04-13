"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Gift,
  Check,
  Clock,
  ArrowLeft,
  Ticket,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { RequireTreasureHunterSession } from "@/components/require-treasure-hunter-session";
import {
  useTreasureHunterHistoryQuery,
  useTreasureHunterProfileQuery,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClaimHistoryPage() {
  const { t } = useLanguage();

  const {
    data: vouchers = [],
    isLoading,
    isError: vouchersError,
  } = useTreasureHunterHistoryQuery();

  const { data: profile } = useTreasureHunterProfileQuery();

  return (
    <RequireTreasureHunterSession>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">{t("history.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container max-w-lg mx-auto p-4">
          {profile && (
            <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {profile.nickname || t("leaderboard.anonymousHunter")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.totalClaims} {t("profile.claims")} ·{" "}
                    {profile.totalRedemptions} {t("profile.redeemed")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : vouchersError ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-medium mb-2">
                {t("history.failedToLoad")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("history.tryAgainLater")}
              </p>
              <Link href="/">
                <Button variant="outline" data-testid="button-go-home">
                  {t("nav.goHome")}
                </Button>
              </Link>
            </Card>
          ) : vouchers.length === 0 ? (
            <Card className="p-8 text-center">
              <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">
                {t("history.noVouchers")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("history.startHunting")}
              </p>
              <Link href="/">
                <Button data-testid="button-start-hunting">
                  {t("common.startHunting")}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <Card
                  key={v.id}
                  className="p-4"
                  data-testid={`card-voucher-${v.id}`}
                >
                  <div className="flex items-start gap-4">
                    {v.drop?.logoUrl ? (
                      <img
                        src={v.drop.logoUrl}
                        alt="Merchant"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-primary" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium truncate">
                          {v.drop?.name || t("voucher.reward")}
                        </h3>
                        {v.redeemed ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {t("status.redeemed")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            <Clock className="w-3 h-3 mr-1" />
                            {t("status.active")}
                          </Badge>
                        )}
                      </div>

                      {v.drop?.rewardValue && (
                        <Badge
                          variant="outline"
                          className="mt-2 bg-teal/10 text-teal border-teal/20"
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          {v.drop.rewardValue}
                        </Badge>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        {t("history.claimed")}{" "}
                        {v.claimedAt
                          ? formatDate(v.claimedAt)
                          : t("history.recently")}
                      </p>
                    </div>
                  </div>

                  {!v.redeemed && (
                    <Link href={`/voucher/${v.magicToken}`}>
                      <Button
                        className="w-full mt-3"
                        size="sm"
                        data-testid={`button-view-voucher-${v.id}`}
                      >
                        {t("voucher.viewVoucher")}
                      </Button>
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireTreasureHunterSession>
  );
}
