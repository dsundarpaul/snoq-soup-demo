"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Trophy,
  Clock,
  Gift,
  Target,
  CheckCircle2,
  BadgeX,
  Hourglass,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { DropDetailsDialog } from "@/sections/home/drop-details-dialog";
import { getTimeWindowInfo } from "@/sections/home/drop-time-window";
import { formatDistance } from "@/lib/format-distance";
import type { DropWithCount } from "@/lib/hunt-drop-filters";
import { getCaptureRemaining, isDropActive } from "@/lib/hunt-drop-filters";
import { clearSessionsExcept } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

export type DropCardProps = {
  drop: DropWithCount;
  distance: number | null;
  claimed: boolean;
  hunterSignedIn: boolean;
  variant: "inRange" | "browse";
};

type HuntState =
  | { kind: "hunt" }
  | { kind: "claimed" }
  | { kind: "soldOut" }
  | { kind: "expired" }
  | { kind: "comingSoon" };

export function DropCard({
  drop,
  distance,
  claimed,
  hunterSignedIn,
  variant,
}: DropCardProps) {
  const { t } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isActive = isDropActive(drop);
  const remaining = getCaptureRemaining(drop);
  const isSoldOut = remaining !== null && remaining <= 0;
  const timeWindowInfo = getTimeWindowInfo(drop, t);

  const state: HuntState = claimed
    ? { kind: "claimed" }
    : isSoldOut
    ? { kind: "soldOut" }
    : timeWindowInfo?.isExpired
    ? { kind: "expired" }
    : timeWindowInfo?.notYetActive
    ? { kind: "comingSoon" }
    : { kind: "hunt" };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${drop.latitude},${drop.longitude}`;
    window.open(url, "_blank");
  };

  const openDetails = () => setDetailsOpen(true);

  const huntHref = hunterSignedIn
    ? `/hunt?drop=${drop.id}`
    : `/login?next=${encodeURIComponent(`/hunt?drop=${drop.id}`)}`;

  const handleHuntClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isActive) {
      e.preventDefault();
      return;
    }
    if (!hunterSignedIn) clearSessionsExcept("hunter");
  };

  return (
    <Card
      data-testid={`card-drop-${drop.id}`}
      className={cn(
        "relative overflow-hidden p-0 hover-elevate transition-all",
        claimed && "opacity-60"
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-[inherit] border-0 bg-transparent p-0 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer transition-colors"
        aria-label={`${drop.name}. ${t("home.dropDetails")}`}
        onClick={openDetails}
      />

      <div className="relative z-[1] flex min-h-[9rem] pointer-events-none">
        <div className="relative w-[36%] min-w-[6.5rem] max-w-[10rem] shrink-0 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-teal/10">
          {drop.logoUrl ? (
            <img
              src={drop.logoUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              data-testid={`img-drop-logo-${drop.id}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary/50" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
          <h3
            className="font-semibold text-foreground leading-tight line-clamp-2"
            data-testid={`text-drop-name-${drop.id}`}
          >
            {drop.name}
          </h3>

          {drop.description ? (
            <p
              className="text-xs text-muted-foreground leading-snug line-clamp-2"
              data-testid={`text-drop-description-${drop.id}`}
            >
              {drop.description}
            </p>
          ) : null}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 pointer-events-auto">
            <Badge
              variant="secondary"
              className="bg-teal/10 text-teal border-teal/20 gap-1 px-1.5 py-0.5 pointer-events-none"
            >
              <Gift className="w-3 h-3" />
              {drop.rewardValue}
            </Badge>

            {variant === "browse" && distance !== null ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
                <Navigation className="w-3 h-3 shrink-0 opacity-80" />
                {formatDistance(distance)}
              </span>
            ) : null}

            {variant === "inRange" ? (
              <>
                {distance !== null ? (
                  <button
                    type="button"
                    onClick={handleGetDirections}
                    aria-label={`${formatDistance(distance)}. ${t(
                      "home.directions"
                    )}`}
                    title={t("home.directions")}
                    data-testid={`button-directions-${drop.id}`}
                    className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97]"
                  >
                    <Navigation className="w-3 h-3 transition-transform group-hover:-rotate-12" />
                    <span>{formatDistance(distance)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 group-hover:opacity-100">
                      {t("home.map")}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGetDirections}
                    aria-label={t("home.directions")}
                    title={t("home.directions")}
                    data-testid={`button-directions-${drop.id}`}
                    className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97]"
                  >
                    <Navigation className="w-3 h-3 transition-transform group-hover:-rotate-12" />
                    {t("home.map")}
                  </button>
                )}
              </>
            ) : null}

            {remaining !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs pointer-events-none",
                  isSoldOut ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Target className="w-3 h-3" />
                {isSoldOut
                  ? t("status.soldOut")
                  : `${remaining} ${t("voucher.left")}`}
              </span>
            )}

            {drop.redemptionType === "timer" && drop.redemptionMinutes && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
                <Clock className="w-3 h-3" />
                {drop.redemptionMinutes >= 60
                  ? `${drop.redemptionMinutes / 60}hr`
                  : `${drop.redemptionMinutes}min`}
              </span>
            )}

            {timeWindowInfo && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs pointer-events-none",
                  timeWindowInfo.isExpired
                    ? "text-destructive"
                    : timeWindowInfo.notYetActive
                    ? "text-amber-500"
                    : "text-muted-foreground"
                )}
              >
                <Clock className="w-3 h-3" />
                {timeWindowInfo.status}
              </span>
            )}
          </div>
        </div>

        <HuntActionPanel
          state={state}
          isActive={isActive}
          huntHref={huntHref}
          onHuntClick={handleHuntClick}
          onDirections={handleGetDirections}
          variant={variant}
          dropId={drop.id}
          labels={{
            hunt: t("home.hunt"),
            claim: t("home.claim"),
            directions: t("home.directions"),
            claimed: t("status.claimed"),
            soldOut: t("status.soldOut"),
            expired: t("status.expired"),
            comingSoon: t("status.comingSoon"),
          }}
        />
      </div>

      <DropDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        drop={drop}
        distance={distance}
        onDirections={handleGetDirections}
        hunterSignedIn={hunterSignedIn}
        showHuntAction={state.kind === "hunt"}
        huntDisabled={!isActive}
      />
    </Card>
  );
}

type HuntActionPanelProps = {
  state: HuntState;
  isActive: boolean;
  huntHref: string;
  onHuntClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  onDirections: () => void;
  variant: "inRange" | "browse";
  dropId: string;
  labels: {
    hunt: string;
    claim: string;
    directions: string;
    claimed: string;
    soldOut: string;
    expired: string;
    comingSoon: string;
  };
};

function HuntActionPanel({
  state,
  isActive,
  huntHref,
  onHuntClick,
  onDirections,
  variant,
  dropId,
  labels,
}: HuntActionPanelProps) {
  const panelTone =
    state.kind === "hunt"
      ? "bg-gradient-to-b from-primary/20 via-primary/10 to-primary/5"
      : state.kind === "claimed"
      ? "bg-gradient-to-b from-muted/60 to-muted/20"
      : state.kind === "soldOut" || state.kind === "expired"
      ? "bg-gradient-to-b from-destructive/15 via-destructive/5 to-destructive/5"
      : "bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-amber-500/5";

  const edgeTone =
    state.kind === "hunt"
      ? "via-primary/50"
      : state.kind === "claimed"
      ? "via-border"
      : state.kind === "soldOut" || state.kind === "expired"
      ? "via-destructive/40"
      : "via-amber-500/50";

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex shrink-0 flex-col items-stretch overflow-hidden",
        variant === "browse" && state.kind === "hunt"
          ? "w-[5.5rem]"
          : "w-[4.75rem]",
        panelTone
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 start-0 w-px bg-gradient-to-b from-transparent to-transparent",
          edgeTone
        )}
      />

      {state.kind === "hunt" && variant === "browse" ? (
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-primary/20">
          <Link
            href={huntHref}
            onClick={onHuntClick}
            aria-disabled={!isActive}
            tabIndex={isActive ? undefined : -1}
            data-testid={`button-hunt-${dropId}`}
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center gap-1.5 px-1.5 py-2 text-center transition-colors",
              isActive
                ? "hover:bg-primary/10 active:bg-primary/15"
                : "pointer-events-none opacity-60"
            )}
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              {isActive ? (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-primary/30 opacity-70 animate-ping [animation-duration:2.4s]"
                  />
                  <span
                    aria-hidden
                    className="absolute -inset-1 rounded-full bg-primary/25 blur-md animate-pulse [animation-duration:2.4s]"
                  />
                </>
              ) : null}
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-gradient-to-br from-primary/25 to-primary/10 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.3),0_6px_14px_-6px_hsl(var(--primary)/0.7)] transition-transform group-hover:scale-105 group-active:scale-95">
                <Target
                  className="h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-12"
                  strokeWidth={2.5}
                />
              </span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary leading-tight">
              {labels.hunt}
            </span>
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDirections();
            }}
            data-testid={`button-panel-directions-${dropId}`}
            aria-label={labels.directions}
            className="group flex flex-1 flex-col items-center justify-center gap-1.5 px-1.5 py-2 text-center transition-colors hover:bg-primary/10 active:bg-primary/15"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 transition-transform group-hover:scale-105 group-active:scale-95">
              <Navigation
                className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-rotate-12 group-hover:text-primary"
                strokeWidth={2.25}
              />
            </span>
            <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.08em] text-muted-foreground group-hover:text-primary">
              {labels.directions}
            </span>
          </button>
        </div>
      ) : state.kind === "hunt" ? (
        <Link
          href={huntHref}
          onClick={onHuntClick}
          aria-disabled={!isActive}
          tabIndex={isActive ? undefined : -1}
          data-testid={`button-hunt-${dropId}`}
          className={cn(
            "group relative flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center transition-colors",
            isActive
              ? "hover:bg-primary/10 active:bg-primary/15"
              : "pointer-events-none opacity-60"
          )}
        >
          <span className="relative flex h-12 w-12 items-center justify-center">
            {isActive ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-primary/30 opacity-70 animate-ping [animation-duration:2.4s]"
                />
                <span
                  aria-hidden
                  className="absolute -inset-1 rounded-full bg-primary/25 blur-md animate-pulse [animation-duration:2.4s]"
                />
              </>
            ) : null}
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-primary/35 bg-gradient-to-br from-primary/25 to-primary/10 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.3),0_6px_14px_-6px_hsl(var(--primary)/0.7)] transition-transform group-hover:scale-105 group-active:scale-95">
              <Target
                className="w-[1.15rem] h-[1.15rem] text-primary transition-transform group-hover:rotate-12"
                strokeWidth={2.5}
              />
            </span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {labels.claim}
          </span>
        </Link>
      ) : (
        <StatusDisplay state={state} labels={labels} />
      )}
    </div>
  );
}

function StatusDisplay({
  state,
  labels,
}: {
  state: Exclude<HuntState, { kind: "hunt" }>;
  labels: HuntActionPanelProps["labels"];
}) {
  const { Icon, label, ringTone, textTone } = (() => {
    switch (state.kind) {
      case "claimed":
        return {
          Icon: CheckCircle2,
          label: labels.claimed,
          ringTone: "border-border bg-muted/60",
          textTone: "text-muted-foreground",
        };
      case "soldOut":
        return {
          Icon: BadgeX,
          label: labels.soldOut,
          ringTone: "border-destructive/30 bg-destructive/10",
          textTone: "text-destructive",
        };
      case "expired":
        return {
          Icon: Hourglass,
          label: labels.expired,
          ringTone: "border-destructive/30 bg-destructive/10",
          textTone: "text-destructive",
        };
      case "comingSoon":
        return {
          Icon: Hourglass,
          label: labels.comingSoon,
          ringTone: "border-amber-500/30 bg-amber-500/10",
          textTone: "text-amber-600 dark:text-amber-400",
        };
    }
  })();

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-2 px-1.5 text-center"
      data-testid="drop-card-status"
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border",
          ringTone,
          textTone
        )}
      >
        <Icon className="w-[1.15rem] h-[1.15rem]" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "text-[10px] font-bold uppercase leading-tight tracking-[0.08em]",
          textTone
        )}
      >
        {label}
      </span>
    </div>
  );
}
