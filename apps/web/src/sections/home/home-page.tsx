"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useGeolocation, calculateDistance } from "@/hooks/use-geolocation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VoucherDisplay } from "@/components/voucher-display";
import {
  MapPin,
  Navigation,
  Trophy,
  Loader2,
  Clock,
  Gift,
  ArrowRight,
  Target,
  Sparkles,
  ExternalLink,
  Ticket,
  QrCode,
  Timer,
  AlertTriangle,
  Check,
  History,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { HomeHeader } from "@/sections/home/home-header";
import type { Drop, Voucher } from "@shared/schema";
import { useActiveDropsQuery } from "@/hooks/api/drop/use-drop";
import {
  useHunterVouchersQuery,
  useTreasureHunterProfileQuery,
  type HunterVoucherRow,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { clearSessionsExcept } from "@/lib/auth-session";
import type { TranslationKey } from "@/locales/en";

type TFunc = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

type DropWithCount = Drop & { captureCount?: number };

function getCaptureRemaining(drop: DropWithCount): number | null {
  if (drop.availabilityType !== "captureLimit" || !drop.captureLimit) {
    return null;
  }
  return drop.captureLimit - (drop.captureCount || 0);
}

function isSoldOutDrop(drop: DropWithCount): boolean {
  const remaining = getCaptureRemaining(drop);
  return remaining !== null && remaining <= 0;
}

function isScheduledNotYetLive(drop: Drop): boolean {
  if (!drop.active) return false;
  if (drop.availabilityType !== "timeWindow" || !drop.startTime) {
    return false;
  }
  return new Date(drop.startTime) > new Date();
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

function DropCard({
  drop,
  distance,
  claimed,
  hunterSignedIn,
}: {
  drop: DropWithCount;
  distance: number | null;
  claimed: boolean;
  hunterSignedIn: boolean;
}) {
  const { t } = useLanguage();
  const isInRange = distance !== null && distance <= drop.radius;
  const isActive = isDropActive(drop);
  const remaining = getCaptureRemaining(drop);
  const isSoldOut = remaining !== null && remaining <= 0;
  const timeWindowInfo = getTimeWindowInfo(drop, t);

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${drop.latitude},${drop.longitude}`;
    window.open(url, "_blank");
  };

  return (
    <Card
      className={`p-4 hover-elevate transition-all ${
        claimed ? "opacity-60" : ""
      } ${isInRange ? "border-primary border-2" : ""}`}
    >
      <div className="flex items-start gap-4">
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
            <h3 className="font-semibold text-foreground truncate">
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

        <div className="shrink-0 flex flex-col gap-2">
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

      <Accordion type="single" collapsible className="w-full mt-3 border-t pt-1">
        <AccordionItem value="details" className="border-0">
          <AccordionTrigger
            className="py-2 text-sm text-muted-foreground hover:no-underline"
            data-testid={`accordion-drop-details-${drop.id}`}
          >
            {t("home.dropDetails")}
          </AccordionTrigger>
          <AccordionContent className="text-sm space-y-3 text-muted-foreground pb-2">
            <p className="text-foreground whitespace-pre-wrap">{drop.description}</p>
            {drop.termsAndConditions ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {t("voucher.termsTitle")}
                </p>
                <p className="whitespace-pre-wrap">{drop.termsAndConditions}</p>
              </div>
            ) : null}
            {remaining !== null ? (
              <p>
                <span className="font-medium text-foreground">
                  {t("home.captureLimit")}:{" "}
                </span>
                {isSoldOut
                  ? t("status.soldOut")
                  : `${remaining} ${t("voucher.left")}`}
              </p>
            ) : null}
            {drop.redemptionType === "timer" && drop.redemptionMinutes ? (
              <p>
                <span className="font-medium text-foreground">
                  {t("voucher.timeRemaining")}:{" "}
                </span>
                {drop.redemptionMinutes >= 60
                  ? `${drop.redemptionMinutes / 60}hr`
                  : `${drop.redemptionMinutes}min`}{" "}
                {t("voucher.toRedeem")}
              </p>
            ) : null}
            {drop.redemptionType === "window" && drop.redemptionDeadline ? (
              <p>
                <span className="font-medium text-foreground">
                  {t("voucher.deadline")}:{" "}
                </span>
                {new Date(drop.redemptionDeadline).toLocaleString()}
              </p>
            ) : null}
            {timeWindowInfo ? (
              <p>
                <span className="font-medium text-foreground">
                  {t("home.availability")}:{" "}
                </span>
                {timeWindowInfo.status}
              </p>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

function isDropActive(drop: Drop): boolean {
  const now = new Date();
  if (drop.availabilityType === "timeWindow") {
    if (drop.startTime && new Date(drop.startTime) > now) return false;
    if (drop.endTime && new Date(drop.endTime) < now) return false;
  }
  return drop.active;
}

function getTimeWindowInfo(
  drop: Drop,
  t: TFunc
): { status: string; isExpired: boolean; notYetActive: boolean } | null {
  if (drop.availabilityType !== "timeWindow") return null;

  const now = new Date();

  if (drop.startTime && new Date(drop.startTime) > now) {
    const startDate = new Date(drop.startTime);
    return {
      status: `${t(
        "voucher.starts"
      )} ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      isExpired: false,
      notYetActive: true,
    };
  }

  if (drop.endTime) {
    const endDate = new Date(drop.endTime);
    if (endDate < now) {
      return {
        status: t("status.expired"),
        isExpired: true,
        notYetActive: false,
      };
    }
    return {
      status: `${t(
        "voucher.ends"
      )} ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      isExpired: false,
      notYetActive: false,
    };
  }

  return null;
}

function isVoucherActive(
  voucher: Voucher,
  drop: Drop,
  t: TFunc
): { active: boolean; status: string; timeRemaining: number | null } {
  if (voucher.redeemed) {
    return { active: false, status: t("status.redeemed"), timeRemaining: null };
  }

  const now = Date.now();

  if (voucher.expiresAt) {
    const expiryMs = new Date(voucher.expiresAt).getTime();
    const remaining = Math.floor((expiryMs - now) / 1000);
    if (remaining <= 0) {
      return { active: false, status: t("status.expired"), timeRemaining: 0 };
    }
    return {
      active: true,
      status: t("status.active"),
      timeRemaining: remaining,
    };
  }

  if (
    drop.redemptionType === "timer" &&
    drop.redemptionMinutes &&
    voucher.claimedAt
  ) {
    const claimedTime = new Date(voucher.claimedAt).getTime();
    const expiryTime = claimedTime + drop.redemptionMinutes * 60 * 1000;
    const remaining = Math.floor((expiryTime - now) / 1000);
    if (remaining <= 0) {
      return { active: false, status: t("status.expired"), timeRemaining: 0 };
    }
    return {
      active: true,
      status: t("status.active"),
      timeRemaining: remaining,
    };
  }

  if (drop.redemptionType === "window" && drop.redemptionDeadline) {
    const deadline = new Date(drop.redemptionDeadline).getTime();
    const remaining = Math.floor((deadline - now) / 1000);
    if (remaining <= 0) {
      return { active: false, status: t("status.expired"), timeRemaining: 0 };
    }
    return {
      active: true,
      status: t("status.active"),
      timeRemaining: remaining,
    };
  }

  return { active: true, status: t("status.active"), timeRemaining: null };
}

function formatTimeShort(seconds: number, t: TFunc): string {
  if (seconds <= 0) return t("status.expired");
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${t("voucher.left")}`;
  if (hours > 0) return `${hours}h ${minutes}m ${t("voucher.left")}`;
  return `${minutes}m ${t("voucher.left")}`;
}

interface StoredVoucher {
  voucher: Voucher;
  drop: Drop;
  claimedAt: string;
  businessName: string;
  merchantStoreLocation: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    howToReach?: string;
  } | null;
  merchantBusinessPhone: string | null;
  merchantBusinessHours: string | null;
}

const EMPTY_VOUCHER_ROWS: HunterVoucherRow[] = [];

export default function HomePage() {
  const { t } = useLanguage();
  const geo = useGeolocation();
  const { data: hunterVoucherBuckets } = useHunterVouchersQuery();

  const { data: hunterProfile } = useTreasureHunterProfileQuery();

  const hunterSignedIn = Boolean(hunterProfile?.email);

  const unredeemedVouchers =
    hunterVoucherBuckets?.unredeemed ?? EMPTY_VOUCHER_ROWS;
  const redeemedVouchers =
    hunterVoucherBuckets?.redeemed ?? EMPTY_VOUCHER_ROWS;

  const claimedDropIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const row of [...unredeemedVouchers, ...redeemedVouchers]) {
      s.add(row.voucher.dropId);
    }
    return s;
  }, [unredeemedVouchers, redeemedVouchers]);

  const hasClaimedDrop = useCallback(
    (dropId: string) => claimedDropIdSet.has(dropId),
    [claimedDropIdSet],
  );

  const voucherRowsForStatus = useMemo(
    () => [...unredeemedVouchers, ...redeemedVouchers],
    [unredeemedVouchers, redeemedVouchers],
  );
  const [selectedVoucher, setSelectedVoucher] = useState<StoredVoucher | null>(
    null
  );
  const [voucherStatuses, setVoucherStatuses] = useState<
    Record<
      string,
      { active: boolean; status: string; timeRemaining: number | null }
    >
  >({});

  const { data: drops = [], isLoading } = useActiveDropsQuery();

  useEffect(() => {
    const updateStatuses = () => {
      const statuses: Record<
        string,
        { active: boolean; status: string; timeRemaining: number | null }
      > = {};
      voucherRowsForStatus.forEach(({ voucher, drop }) => {
        statuses[voucher.id] = isVoucherActive(voucher, drop, t);
      });
      setVoucherStatuses(statuses);
    };

    updateStatuses();
    const interval = setInterval(updateStatuses, 1000);
    return () => clearInterval(interval);
  }, [voucherRowsForStatus, t]);

  const dropsWithDistance = useMemo(() => {
    if (!geo.latitude || !geo.longitude) {
      return drops.map((drop) => ({
        ...drop,
        distance: null as number | null,
        claimed: hasClaimedDrop(drop.id),
      }));
    }

    return drops
      .map((drop) => ({
        ...drop,
        distance: calculateDistance(
          geo.latitude!,
          geo.longitude!,
          drop.latitude,
          drop.longitude
        ),
        claimed: hasClaimedDrop(drop.id),
      }))
      .sort((a, b) => {
        if (a.claimed && !b.claimed) return 1;
        if (!a.claimed && b.claimed) return -1;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }, [drops, geo.latitude, geo.longitude, hasClaimedDrop]);

  const huntableDrops = useMemo(
    () =>
      dropsWithDistance.filter(
        (d) => !d.claimed && !isSoldOutDrop(d) && isDropActive(d)
      ),
    [dropsWithDistance]
  );

  const inRangeDrops = huntableDrops.filter(
    (d) => d.distance !== null && d.distance <= d.radius
  );
  const nearbyDrops = huntableDrops.filter(
    (d) => d.distance === null || d.distance > d.radius
  );

  const scheduledDrops = useMemo(
    () =>
      dropsWithDistance.filter(
        (d) => !d.claimed && !isSoldOutDrop(d) && isScheduledNotYetLive(d)
      ),
    [dropsWithDistance]
  );

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader geo={{ loading: geo.loading, error: geo.error }} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {hunterSignedIn &&
          (unredeemedVouchers.length > 0 || redeemedVouchers.length > 0) && (
            <div className="space-y-6">
              {unredeemedVouchers.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-teal" />
                    <h2 className="font-semibold text-lg text-foreground">
                      {t("home.claimedDrops")}
                    </h2>
                    <Badge className="bg-teal/10 text-teal border-teal/20">
                      {unredeemedVouchers.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {unredeemedVouchers.map(
                      ({
                        voucher,
                        drop,
                        businessName,
                        merchantStoreLocation,
                        merchantBusinessPhone,
                        merchantBusinessHours,
                      }) => {
                      const status = voucherStatuses[voucher.id];
                      return (
                        <Card
                          key={voucher.id}
                          className="p-4 hover-elevate cursor-pointer border-teal/20"
                          onClick={() =>
                            setSelectedVoucher({
                              voucher,
                              drop,
                              claimedAt: voucher.claimedAt?.toString() || "",
                              businessName,
                              merchantStoreLocation,
                              merchantBusinessPhone,
                              merchantBusinessHours,
                            })
                          }
                          data-testid={`card-voucher-${voucher.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                              {drop.logoUrl ? (
                                <img
                                  src={drop.logoUrl}
                                  alt={drop.name}
                                  className="w-full h-full rounded-lg object-cover bg-white"
                                />
                              ) : (
                                <QrCode className="w-6 h-6 text-teal" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground truncate">
                                {drop.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="bg-teal/10 text-teal text-xs"
                                >
                                  {drop.rewardValue}
                                </Badge>
                                {status?.timeRemaining !== null &&
                                  status?.timeRemaining > 0 && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Timer className="w-3 h-3" />
                                      {t("home.timeToRedeem")}:{" "}
                                      {formatTimeShort(
                                        status.timeRemaining,
                                        t
                                      )}
                                    </span>
                                  )}
                                {status?.timeRemaining === 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs shrink-0"
                                  >
                                    {t("status.expired")}
                                  </Badge>
                                )}
                                {status?.active &&
                                  status.timeRemaining === null && (
                                    <span className="text-xs text-muted-foreground">
                                      {t("home.redeemAnytime")}
                                    </span>
                                  )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1"
                              data-testid={`button-view-voucher-${voucher.id}`}
                            >
                              <QrCode className="w-4 h-4" />
                              {t("home.view")}
                            </Button>
                          </div>
                        </Card>
                      );
                    }
                    )}
                  </div>
                </section>
              )}

              {redeemedVouchers.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <h2 className="font-semibold text-lg text-foreground">
                      {t("home.redeemedRewards")}
                    </h2>
                    <Badge variant="secondary">
                      {redeemedVouchers.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {redeemedVouchers.map(
                      ({
                        voucher,
                        drop,
                        businessName,
                        merchantStoreLocation,
                        merchantBusinessPhone,
                        merchantBusinessHours,
                      }) => (
                      <Card
                        key={voucher.id}
                        className="p-4 border-muted cursor-pointer hover-elevate"
                        onClick={() =>
                          setSelectedVoucher({
                            voucher,
                            drop,
                            claimedAt: voucher.claimedAt?.toString() || "",
                            businessName,
                            merchantStoreLocation,
                            merchantBusinessPhone,
                            merchantBusinessHours,
                          })
                        }
                        data-testid={`card-redeemed-voucher-${voucher.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {drop.logoUrl ? (
                              <img
                                src={drop.logoUrl}
                                alt={drop.name}
                                className="w-full h-full rounded-lg object-cover bg-white"
                              />
                            ) : (
                              <QrCode className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                              {drop.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {drop.rewardValue}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground"
                              >
                                {t("status.redeemed")}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="shrink-0">
                            {t("home.view")}
                          </Button>
                        </div>
                      </Card>
                    )
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t("home.loadingDrops")}</p>
          </div>
        ) : drops.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("home.noDrops")}
            </h2>
            <p className="text-muted-foreground">{t("home.noDropsDesc")}</p>
          </Card>
        ) : (
          <>
            {(inRangeDrops.length > 0 || nearbyDrops.length > 0) && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-foreground">
                    {t("home.activeDropsSection")}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {inRangeDrops.length + nearbyDrops.length}
                  </Badge>
                </div>

                {inRangeDrops.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t("home.readyToClaim")}
                      </h3>
                      <Badge className="bg-primary/10 text-primary text-xs">
                        {inRangeDrops.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {inRangeDrops.map((drop) => (
                        <DropCard
                          key={drop.id}
                          drop={drop}
                          distance={drop.distance}
                          claimed={drop.claimed}
                          hunterSignedIn={hunterSignedIn}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {nearbyDrops.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t("home.nearbyDrops")}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {nearbyDrops.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {nearbyDrops.map((drop) => (
                        <DropCard
                          key={drop.id}
                          drop={drop}
                          distance={drop.distance}
                          claimed={drop.claimed}
                          hunterSignedIn={hunterSignedIn}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {scheduledDrops.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-lg text-foreground">
                    {t("home.startingSoon")}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="border-amber-500/40 text-amber-600"
                  >
                    {scheduledDrops.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {scheduledDrops.map((drop) => (
                    <DropCard
                      key={drop.id}
                      drop={drop}
                      distance={drop.distance}
                      claimed={drop.claimed}
                      hunterSignedIn={hunterSignedIn}
                    />
                  ))}
                </div>
              </section>
            )}

          </>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <Link
            href={
              hunterSignedIn
                ? "/hunt"
                : `/login?next=${encodeURIComponent("/hunt")}`
            }
            onClick={
              hunterSignedIn ? undefined : () => clearSessionsExcept("hunter")
            }
          >
            <Button
              size="lg"
              className="gap-2 shadow-lg"
              data-testid="button-open-ar"
            >
              <Target className="w-5 h-5" />
              {t("home.openArHunt")}
            </Button>
          </Link>
        </div>

        <div className="h-20" />
      </main>

      <Dialog
        open={selectedVoucher !== null}
        onOpenChange={(open) => !open && setSelectedVoucher(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-teal" />
              {t("home.yourReward")}
            </DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <VoucherDisplay
              voucher={selectedVoucher.voucher}
              drop={selectedVoucher.drop}
              businessName={selectedVoucher.businessName}
              merchantStoreLocation={selectedVoucher.merchantStoreLocation}
              merchantBusinessPhone={selectedVoucher.merchantBusinessPhone}
              merchantBusinessHours={selectedVoucher.merchantBusinessHours}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
