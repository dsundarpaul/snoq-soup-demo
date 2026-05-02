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
  ChevronsRightLeft,
  ChevronRightIcon,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { DropDetailsDialog } from "@/sections/home/drop-details-dialog";
import { getTimeWindowInfo } from "@/sections/home/drop-time-window";
import { formatDistance } from "@/lib/format-distance";
import type { DropWithCount } from "@/lib/hunt-drop-filters";
import { getCaptureRemaining, isDropActive } from "@/lib/hunt-drop-filters";
import { clearSessionsExcept } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

const DISTANCE_CLIP_THRESHOLD_METERS = 99 * 1000;

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

      <div
        className={cn(
          "relative z-[1] flex pointer-events-none",
          variant === "browse" ? "min-h-[7rem]" : "min-h-[9rem]"
        )}
      >
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

          {drop.description && variant === "inRange" ? (
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

          {variant === "browse" && state.kind === "hunt" ? (
            <div className="mt-1.5 flex w-full flex-wrap items-center justify-end gap-2 pointer-events-auto">
              {distance !== null ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetDirections();
                  }}
                  aria-label={`${
                    distance > DISTANCE_CLIP_THRESHOLD_METERS
                      ? t("home.distanceOver999KmAria")
                      : formatDistance(distance)
                  }. ${t("home.directions")}`}
                  title={
                    distance > DISTANCE_CLIP_THRESHOLD_METERS
                      ? `${t("home.distanceOver999KmAria")}. ${t(
                          "home.directions"
                        )}`
                      : t("home.directions")
                  }
                  data-testid={`button-directions-${drop.id}`}
                  className="group inline-flex h-7 shrink-0 items-center gap-1 rounded-sm border border-border/70 bg-background/40 px-2 text-xs leading-none text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97]"
                >
                  <Navigation className="h-3 w-3 text-white shrink-0 transition-transform group-hover:-rotate-12" />
                  <span className="max-w-[4.5rem] truncate text-white">
                    {distance > DISTANCE_CLIP_THRESHOLD_METERS
                      ? t("home.distanceOver999Km")
                      : formatDistance(distance)}
                  </span>
                  <span className="text-[10px] text-white font-semibold leading-none tracking-wider group-hover:opacity-100">
                    Directions
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetDirections();
                  }}
                  aria-label={t("home.directions")}
                  title={t("home.directions")}
                  data-testid={`button-directions-${drop.id}`}
                  className="group inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97]"
                >
                  <Navigation className="h-3 w-3 shrink-0 transition-transform group-hover:-rotate-12" />
                  {t("home.map")}
                </button>
              )}
              <Link
                href={huntHref}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHuntClick(e);
                }}
                aria-disabled={!isActive}
                tabIndex={isActive ? undefined : -1}
                data-testid={`button-hunt-${drop.id}`}
                className={cn(
                  "inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-[12px]  leading-none shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background active:scale-[0.97]",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "pointer-events-none bg-muted text-muted-foreground opacity-70 shadow-none"
                )}
              >
                <Target className="w-3 h-3" strokeWidth={2.5} />
                {t("home.hunt")}
                <ChevronRightIcon className="w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>
          ) : null}

          {variant === "browse" && state.kind !== "hunt" ? (
            <div className="mt-1.5 pointer-events-auto">
              <BrowseInlineStatus
                state={state}
                labels={{
                  claimed: t("status.claimed"),
                  soldOut: t("status.soldOut"),
                  expired: t("status.expired"),
                  comingSoon: t("status.comingSoon"),
                }}
              />
            </div>
          ) : null}
        </div>

        {variant === "inRange" ? (
          <HuntActionPanel
            state={state}
            isActive={isActive}
            huntHref={huntHref}
            onHuntClick={handleHuntClick}
            dropId={drop.id}
            labels={{
              claim: t("home.claim"),
              claimed: t("status.claimed"),
              soldOut: t("status.soldOut"),
              expired: t("status.expired"),
              comingSoon: t("status.comingSoon"),
            }}
          />
        ) : null}
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

type StatusLabels = {
  claimed: string;
  soldOut: string;
  expired: string;
  comingSoon: string;
};

function BrowseInlineStatus({
  state,
  labels,
}: {
  state: Exclude<HuntState, { kind: "hunt" }>;
  labels: StatusLabels;
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
      className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
      data-testid="drop-card-status"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          ringTone,
          textTone
        )}
      >
        <Icon className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "min-w-0 text-left text-[11px] font-bold uppercase leading-snug tracking-wide",
          textTone
        )}
      >
        {label}
      </span>
    </div>
  );
}

type HuntActionPanelProps = {
  state: HuntState;
  isActive: boolean;
  huntHref: string;
  onHuntClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  dropId: string;
  labels: StatusLabels & { claim: string };
};

function HuntActionPanel({
  state,
  isActive,
  huntHref,
  onHuntClick,
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
        "pointer-events-auto relative flex w-[4.75rem] shrink-0 flex-col items-stretch overflow-hidden",
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

      {state.kind === "hunt" ? (
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
