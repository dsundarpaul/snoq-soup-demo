"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Trophy,
  Loader2,
  Clock,
  Gift,
  Navigation,
  ArrowLeft,
  Target,
} from "lucide-react";
import type { Drop } from "@shared/schema";
import type { TranslationKey } from "@/locales/en";
import { useActiveDropsQuery } from "@/hooks/api/drop/use-drop";

type DropWithCount = Drop & { captureCount?: number };

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

function getTimeWindowInfo(drop: Drop, t: TranslateFn) {
  const now = new Date();
  const startTime = drop.startTime ? new Date(drop.startTime) : null;
  const endTime = drop.endTime ? new Date(drop.endTime) : null;

  if (startTime && startTime > now) {
    return {
      status: "upcoming",
      label: `${t("voucher.starts")} ${startTime.toLocaleDateString()}`,
    };
  }
  if (endTime && endTime < now) {
    return { status: "expired", label: t("status.expired") };
  }
  if (endTime) {
    return {
      status: "active",
      label: `${t("voucher.ends")} ${endTime.toLocaleDateString()}`,
    };
  }
  return { status: "active", label: null };
}

export default function DropViewPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const dropId = params.id;

  const { data: drops = [], isLoading } = useActiveDropsQuery();

  const drop = drops.find((d) => d.id === dropId);
  const timeWindowInfo = drop ? getTimeWindowInfo(drop, t) : null;
  const remaining =
    drop?.availabilityType === "captureLimit" && drop.captureLimit
      ? drop.captureLimit - (drop.captureCount || 0)
      : null;
  const isSoldOut = remaining !== null && remaining <= 0;

  const handleGetDirections = () => {
    if (drop) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${drop.latitude},${drop.longitude}`;
      window.open(url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("drop.notFound")}</h1>
          <p className="text-muted-foreground mb-6">{t("drop.notFoundDesc")}</p>
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t("drop.browseAll")}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-foreground">
              {t("drop.rewardDrop")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("drop.claimYourReward")}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 to-teal/20 p-8 flex items-center justify-center">
            {drop.logoUrl ? (
              <img
                src={drop.logoUrl}
                alt="Merchant logo"
                className="w-32 h-32 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-teal/20 flex items-center justify-center shadow-lg">
                <Trophy className="w-16 h-16 text-teal" />
              </div>
            )}
          </div>

          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {drop.name}
                </h2>
                <p className="text-muted-foreground">{drop.description}</p>
              </div>
              <Badge className="bg-teal text-teal-foreground text-lg px-4 py-2 shrink-0">
                {drop.rewardValue}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {timeWindowInfo?.label && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {timeWindowInfo.label}
                </Badge>
              )}
              {remaining !== null && !isSoldOut && (
                <Badge variant="outline" className="gap-1">
                  <Target className="w-3 h-3" />
                  {remaining} {t("voucher.left")}
                </Badge>
              )}
              {isSoldOut && (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/30">
                  {t("status.soldOut")}
                </Badge>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span>{t("drop.location")}</span>
              </div>
              <p className="text-foreground">
                Lat: {drop.latitude.toFixed(4)}, Long:{" "}
                {drop.longitude.toFixed(4)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("drop.getWithinRange", { radius: String(drop.radius) })}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleGetDirections}
                variant="outline"
                className="gap-2"
              >
                <Navigation className="w-4 h-4" />
                {t("drop.getDirections")}
              </Button>
              <Link href={`/hunt?drop=${drop.id}`}>
                <Button className="w-full gap-2">
                  <Gift className="w-4 h-4" />
                  {t("drop.huntThisDrop")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
