"use client";

import Link from "next/link";
import { useDeviceId } from "@/hooks/use-device-id";
import { useLanguage } from "@/contexts/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trophy,
  Medal,
  ArrowLeft,
  Crown,
  Target,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { RequireTreasureHunterSession } from "@/components/require-treasure-hunter-session";
import {
  useLeaderboardQuery,
  useTreasureHunterProfileQuery,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const deviceId = useDeviceId();

  const {
    data: leaderboard = [],
    isLoading,
    isError: leaderboardError,
  } = useLeaderboardQuery(50);

  const { data: profile } = useTreasureHunterProfileQuery(deviceId ?? "");

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {rank}
          </span>
        );
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/10 border-yellow-500/30";
      case 2:
        return "bg-gray-400/10 border-gray-400/30";
      case 3:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "";
    }
  };

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
              <h1 className="text-lg font-semibold">{t("nav.leaderboard")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container max-w-lg mx-auto p-4">
          {profile && (profile.totalClaims ?? 0) > 0 && (
            <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {profile.nickname || t("leaderboard.anonymousHunter")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("leaderboard.yourStats")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {profile.totalClaims}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.claims")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{t("leaderboard.topHunters")}</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : leaderboardError ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-medium mb-2">
                {t("leaderboard.failedToLoad")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("leaderboard.tryAgainLater")}
              </p>
              <Link href="/">
                <Button variant="outline" data-testid="button-go-home">
                  {t("nav.goHome")}
                </Button>
              </Link>
            </Card>
          ) : leaderboard.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">
                {t("leaderboard.noHunters")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("leaderboard.beFirst")}
              </p>
              <Link href="/">
                <Button data-testid="button-start-hunting">
                  {t("leaderboard.startHunting")}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                return (
                  <Card
                    key={index}
                    className={`p-4 ${getRankBg(rank)}`}
                    data-testid={`card-leaderboard-${rank}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.nickname || t("leaderboard.anonymousHunter")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.totalRedemptions} {t("profile.redeemed")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold">{entry.totalClaims}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("profile.claims")}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </RequireTreasureHunterSession>
  );
}
