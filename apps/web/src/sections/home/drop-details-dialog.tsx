"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CircleDot,
  Clock,
  Gift,
  MapPin,
  Navigation,
  Target,
  Trophy,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/format-distance";
import type { DropWithCount } from "@/lib/hunt-drop-filters";
import { getCaptureRemaining } from "@/lib/hunt-drop-filters";
import { getTimeWindowInfo } from "@/sections/home/drop-time-window";

function InfoTile({
  icon: Icon,
  label,
  children,
  valueTone = "default",
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  valueTone?: "default" | "destructive" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-gradient-to-br from-muted/40 to-muted/10 p-3.5 flex gap-3 min-h-[4.25rem] shadow-sm"
      )}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-background/90 border border-border/50 flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            "text-sm font-medium leading-snug",
            valueTone === "destructive" && "text-destructive",
            valueTone === "amber" && "text-amber-600 dark:text-amber-400",
            valueTone === "default" && "text-foreground"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function formatRadiusMeters(radius: number): string {
  if (radius >= 1000) {
    return `${(radius / 1000).toFixed(1)} km`;
  }
  return `${Math.round(radius)} m`;
}

export type DropDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drop: DropWithCount;
  distance: number | null;
  onDirections: () => void;
};

export function DropDetailsDialog({
  open,
  onOpenChange,
  drop,
  distance,
  onDirections,
}: DropDetailsDialogProps) {
  const { t } = useLanguage();
  const remaining = getCaptureRemaining(drop);
  const isSoldOut = remaining !== null && remaining <= 0;
  const timeWindowInfo = getTimeWindowInfo(drop, t);

  const redemptionTimer =
    drop.redemptionType === "timer" && drop.redemptionMinutes
      ? drop.redemptionMinutes >= 60
        ? `${drop.redemptionMinutes / 60}hr`
        : `${drop.redemptionMinutes}min`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col sm:rounded-xl"
        data-testid={`dialog-drop-details-${drop.id}`}
      >
        <div className="relative shrink-0 bg-gradient-to-br from-primary/20 via-primary/8 to-teal/10 px-6 pt-8 pb-6 border-b border-border/60">
          <DialogHeader className="space-y-4 text-left">
            <div className="flex gap-4 items-start">
              {drop.logoUrl ? (
                <img
                  src={drop.logoUrl}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover bg-white border border-border/50 shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <DialogTitle className="text-xl leading-tight pr-6">
                  {drop.name}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-teal/15 text-teal border-teal/25 hover:bg-teal/20 gap-1 font-medium">
                    <Gift className="w-3.5 h-3.5" />
                    {drop.rewardValue}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">
              {t("home.dropDetails")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t("home.dropFacts")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <InfoTile icon={Target} label={t("home.captureZone")}>
                {formatRadiusMeters(drop.radius)}
              </InfoTile>

              {distance !== null ? (
                <InfoTile icon={Navigation} label={t("home.yourDistance")}>
                  {formatDistance(distance)}
                </InfoTile>
              ) : null}

              {remaining !== null ? (
                <InfoTile
                  icon={CircleDot}
                  label={t("home.captureLimit")}
                  valueTone={isSoldOut ? "destructive" : "default"}
                >
                  {isSoldOut
                    ? t("status.soldOut")
                    : `${remaining} ${t("voucher.left")}`}
                </InfoTile>
              ) : null}

              {redemptionTimer ? (
                <InfoTile icon={Clock} label={t("voucher.timeRemaining")}>
                  {redemptionTimer} {t("voucher.toRedeem")}
                </InfoTile>
              ) : null}

              {drop.redemptionType === "window" && drop.redemptionDeadline ? (
                <InfoTile icon={Clock} label={t("voucher.deadline")}>
                  {new Date(drop.redemptionDeadline).toLocaleString()}
                </InfoTile>
              ) : null}

              {timeWindowInfo ? (
                <InfoTile
                  icon={Clock}
                  label={t("home.availability")}
                  valueTone={
                    timeWindowInfo.isExpired
                      ? "destructive"
                      : timeWindowInfo.notYetActive
                        ? "amber"
                        : "default"
                  }
                >
                  {timeWindowInfo.status}
                </InfoTile>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="font-mono leading-relaxed">
              {drop.latitude.toFixed(5)}, {drop.longitude.toFixed(5)}
            </span>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              {t("home.aboutDrop")}
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/30 border border-border/50 px-4 py-3">
              {drop.description}
            </p>
          </div>

          {drop.termsAndConditions ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("voucher.termsTitle")}
              </h4>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-xl border-l-4 border-primary/40 bg-muted/25 px-4 py-3">
                {drop.termsAndConditions}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/60 p-4 bg-muted/15">
          <Button
            type="button"
            variant="default"
            className="w-full gap-2"
            onClick={onDirections}
          >
            <Navigation className="w-4 h-4" />
            {t("home.directions")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
