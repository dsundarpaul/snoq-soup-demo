"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Trophy,
  Clock,
  Gift,
  ArrowRight,
  Target,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { DropDetailsDialog } from "@/sections/home/drop-details-dialog";
import { getTimeWindowInfo } from "@/sections/home/drop-time-window";
import { formatDistance } from "@/lib/format-distance";
import type { DropWithCount } from "@/lib/hunt-drop-filters";
import {
  getCaptureRemaining,
  isDropActive,
} from "@/lib/hunt-drop-filters";
import { clearSessionsExcept } from "@/lib/auth-session";

export type DropCardProps = {
  drop: DropWithCount;
  distance: number | null;
  claimed: boolean;
  hunterSignedIn: boolean;
};

export function DropCard({
  drop,
  distance,
  claimed,
  hunterSignedIn,
}: DropCardProps) {
  const { t } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isInRange = distance !== null && distance <= drop.radius;
  const isActive = isDropActive(drop);
  const remaining = getCaptureRemaining(drop);
  const isSoldOut = remaining !== null && remaining <= 0;
  const timeWindowInfo = getTimeWindowInfo(drop, t);

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${drop.latitude},${drop.longitude}`;
    window.open(url, "_blank");
  };

  const openDetails = () => setDetailsOpen(true);

  return (
    <Card
      data-testid={`card-drop-${drop.id}`}
      className={`relative overflow-hidden p-4 hover-elevate transition-all ${
        claimed ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-[inherit] border-0 bg-transparent p-0 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer transition-colors"
        aria-label={`${drop.name}. ${t("home.dropDetails")}`}
        onClick={openDetails}
      />
      <div className="relative z-[1] flex items-start gap-4 pointer-events-none">
        {drop.logoUrl ? (
          <img
            src={drop.logoUrl}
            alt="Merchant logo"
            className="w-14 h-14 rounded-lg object-cover bg-white"
            data-testid={`img-drop-logo-${drop.id}`}
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate pr-1">
              {drop.name}
            </h3>
            {isInRange && !claimed && (
              <Badge className="bg-primary text-primary-foreground shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                {t("status.inRange")}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {drop.description}
          </p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge
              variant="secondary"
              className="bg-teal/10 text-teal border-teal/20"
            >
              <Gift className="w-3 h-3 mr-1" />
              {drop.rewardValue}
            </Badge>

            {distance !== null && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                {formatDistance(distance)}
              </span>
            )}

            {drop.redemptionType === "timer" && drop.redemptionMinutes && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {drop.redemptionMinutes >= 60
                  ? `${drop.redemptionMinutes / 60}hr`
                  : `${drop.redemptionMinutes}min`}{" "}
                {t("voucher.toRedeem")}
              </span>
            )}

            {remaining !== null && (
              <span
                className={`text-sm flex items-center gap-1 ${
                  isSoldOut ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <Target className="w-3 h-3" />
                {isSoldOut
                  ? t("status.soldOut")
                  : `${remaining} ${t("voucher.left")}`}
              </span>
            )}

            {timeWindowInfo && (
              <span
                className={`text-sm flex items-center gap-1 ${
                  timeWindowInfo.isExpired
                    ? "text-destructive"
                    : timeWindowInfo.notYetActive
                    ? "text-amber-500"
                    : "text-muted-foreground"
                }`}
              >
                <Clock className="w-3 h-3" />
                {timeWindowInfo.status}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2 pointer-events-auto">
          {claimed ? (
            <Badge variant="outline" className="text-muted-foreground">
              {t("status.claimed")}
            </Badge>
          ) : isSoldOut ? (
            <Badge
              variant="outline"
              className="text-destructive border-destructive"
            >
              {t("status.soldOut")}
            </Badge>
          ) : timeWindowInfo?.isExpired ? (
            <Badge
              variant="outline"
              className="text-destructive border-destructive"
            >
              {t("status.expired")}
            </Badge>
          ) : timeWindowInfo?.notYetActive ? (
            <Badge
              variant="outline"
              className="text-amber-500 border-amber-500"
            >
              {t("status.comingSoon")}
            </Badge>
          ) : (
            <Link
              href={
                hunterSignedIn
                  ? `/hunt?drop=${drop.id}`
                  : `/login?next=${encodeURIComponent(`/hunt?drop=${drop.id}`)}`
              }
              onClick={
                hunterSignedIn ? undefined : () => clearSessionsExcept("hunter")
              }
            >
              <Button
                size="sm"
                className="gap-1 w-full"
                disabled={!isActive}
                data-testid={`button-hunt-${drop.id}`}
              >
                {t("home.hunt")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={handleGetDirections}
            data-testid={`button-directions-${drop.id}`}
          >
            <Navigation className="w-3 h-3" />
            {t("home.directions")}
          </Button>
        </div>
      </div>

      <DropDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        drop={drop}
        distance={distance}
        onDirections={handleGetDirections}
        hunterSignedIn={hunterSignedIn}
        showHuntAction={
          !claimed &&
          !isSoldOut &&
          !timeWindowInfo?.isExpired &&
          !timeWindowInfo?.notYetActive
        }
        huntDisabled={!isActive}
      />
    </Card>
  );
}
