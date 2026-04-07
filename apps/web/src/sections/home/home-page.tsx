"use client";

import { useState, useEffect, useMemo } from "react";
import { useDeviceId } from "@/hooks/use-device-id";
import Link from "next/link";
import { useGeolocation, calculateDistance } from "@/hooks/use-geolocation";
import { useVoucherStorage } from "@/hooks/use-voucher-storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { HomeHeader } from "@/sections/home/home-header";
import type { Drop, Voucher } from "@shared/schema";
import { useActiveDropsQuery } from "@/hooks/api/drop/use-drop";
import { useTreasureHunterProfileQuery } from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import type { TranslationKey } from "@/locales/en";

type TFunc = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

type DropWithCount = Drop & { captureCount?: number };

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
  const remaining =
    drop.availabilityType === "captureLimit" && drop.captureLimit
      ? drop.captureLimit - (drop.captureCount || 0)
      : null;
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

  if (drop.redemptionType === "window" && (drop as any).redemptionDeadline) {
    const deadline = new Date((drop as any).redemptionDeadline).getTime();
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
}

export default function HomePage() {
  const { t } = useLanguage();
  const deviceId = useDeviceId();
  const geo = useGeolocation();
  const { hasClaimedDrop, vouchers } = useVoucherStorage();

  const { data: hunterProfile } = useTreasureHunterProfileQuery(
    deviceId ?? ""
  );

  const hunterSignedIn = Boolean(hunterProfile?.email);
  const [selectedVoucher, setSelectedVoucher] = useState<StoredVoucher | null>(
    null
  );
  const [voucherStatuses, setVoucherStatuses] = useState<
    Record<
      string,
      { active: boolean; status: string; timeRemaining: number | null }
    >
  >({});

  const { data: drops = [], isLoading } = useActiveDropsQuery(
    geo.latitude,
    geo.longitude
  );

  useEffect(() => {
    const updateStatuses = () => {
      const statuses: Record<
        string,
        { active: boolean; status: string; timeRemaining: number | null }
      > = {};
      vouchers.forEach(({ voucher, drop }) => {
        statuses[voucher.id] = isVoucherActive(voucher, drop, t);
      });
      setVoucherStatuses(statuses);
    };

    updateStatuses();
    const interval = setInterval(updateStatuses, 1000);
    return () => clearInterval(interval);
  }, [vouchers, t]);

  const activeVouchers = useMemo(() => {
    return vouchers.filter(({ voucher }) => {
      const status = voucherStatuses[voucher.id];
      return status?.active === true;
    });
  }, [vouchers, voucherStatuses]);

  const dropsWithDistance = useMemo(() => {
    const activeDrops = drops.filter(isDropActive);

    if (!geo.latitude || !geo.longitude) {
      return activeDrops.map((drop) => ({
        ...drop,
        distance: null as number | null,
        claimed: hasClaimedDrop(drop.id),
      }));
    }

    return activeDrops
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

  const inRangeDrops = dropsWithDistance.filter(
    (d) => d.distance !== null && d.distance <= d.radius && !d.claimed
  );
  const nearbyDrops = dropsWithDistance.filter(
    (d) => !d.claimed && (d.distance === null || d.distance > d.radius)
  );
  const claimedDrops = dropsWithDistance.filter((d) => d.claimed);

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader geo={{ loading: geo.loading, error: geo.error }} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {hunterSignedIn && activeVouchers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-5 h-5 text-teal" />
              <h2 className="font-semibold text-lg text-foreground">
                {t("home.myRewards")}
              </h2>
              <Badge className="bg-teal/10 text-teal border-teal/20">
                {activeVouchers.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeVouchers.map(({ voucher, drop }) => {
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
                            status.timeRemaining > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {formatTimeShort(status.timeRemaining, t)}
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
              })}
            </div>
          </section>
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
            {inRangeDrops.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-foreground">
                    {t("home.readyToClaim")}
                  </h2>
                  <Badge className="bg-primary/10 text-primary">
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
              </section>
            )}

            {nearbyDrops.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-semibold text-lg text-foreground">
                    {t("home.nearbyDrops")}
                  </h2>
                  <Badge variant="secondary">{nearbyDrops.length}</Badge>
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
              </section>
            )}

            {claimedDrops.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-semibold text-lg text-foreground">
                    {t("home.alreadyClaimed")}
                  </h2>
                  <Badge variant="secondary">{claimedDrops.length}</Badge>
                </div>
                <div className="space-y-3">
                  {claimedDrops.map((drop) => (
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
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
