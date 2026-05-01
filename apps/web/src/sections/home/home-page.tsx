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
import { VoucherDisplay } from "@/components/voucher-display";
import {
  Navigation,
  Loader2,
  Clock,
  Gift,
  Target,
  Sparkles,
  Trophy,
  QrCode,
  Timer,
  History,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { HomeHeader } from "@/sections/home/home-header";
import { DropCard } from "@/sections/home/drop-card";
import {
  type StoredVoucher,
  isVoucherActive,
  formatRedemptionCountdown,
  voucherRedemptionTimerRowClass,
} from "@/sections/home/home-voucher-helpers";
import { cn } from "@/lib/utils";
import { useHomeActiveDropsQuery } from "@/hooks/api/drop/use-drop";
import { useHasRoleCredentials } from "@/hooks/use-role-credentials";
import {
  useHunterVouchersQuery,
  useTreasureHunterProfileQuery,
  type HunterVoucherRow,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { clearSessionsExcept } from "@/lib/auth-session";
import {
  isSoldOutDrop,
  isScheduledNotYetLive,
  buildDropsWithDistanceClaimed,
  getInRangeHuntableDrops,
  getBrowseActiveDrops,
} from "@/lib/hunt-drop-filters";

const EMPTY_VOUCHER_ROWS: HunterVoucherRow[] = [];
const HOME_UNREDEEMED_LIMIT = 4;
const HOME_REDEEMED_LIMIT = 2;

export default function HomePage() {
  const { t } = useLanguage();
  const geo = useGeolocation();
  const hasHunterCreds = useHasRoleCredentials("hunter");
  const { data: hunterVoucherBuckets } = useHunterVouchersQuery({
    unredeemedLimit: HOME_UNREDEEMED_LIMIT,
    redeemedLimit: HOME_REDEEMED_LIMIT,
  });

  const { data: hunterProfile } = useTreasureHunterProfileQuery();

  const hunterSignedIn = Boolean(hunterProfile?.email);

  const unredeemedVouchers =
    hunterVoucherBuckets?.unredeemed ?? EMPTY_VOUCHER_ROWS;
  const redeemedVouchers = hunterVoucherBuckets?.redeemed ?? EMPTY_VOUCHER_ROWS;
  const unredeemedTotal =
    hunterVoucherBuckets?.unredeemedTotal ?? unredeemedVouchers.length;
  const redeemedTotal =
    hunterVoucherBuckets?.redeemedTotal ?? redeemedVouchers.length;

  const claimedDropIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const id of hunterVoucherBuckets?.claimedDropIds ?? []) {
      s.add(id);
    }
    for (const row of [...unredeemedVouchers, ...redeemedVouchers]) {
      s.add(row.voucher.dropId);
    }
    return s;
  }, [
    hunterVoucherBuckets?.claimedDropIds,
    unredeemedVouchers,
    redeemedVouchers,
  ]);

  const hasClaimedDrop = useCallback(
    (dropId: string) => claimedDropIdSet.has(dropId),
    [claimedDropIdSet]
  );

  const voucherRowsForStatus = useMemo(
    () => [...unredeemedVouchers, ...redeemedVouchers],
    [unredeemedVouchers, redeemedVouchers]
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

  const { data: drops = [], isLoading } =
    useHomeActiveDropsQuery(hasHunterCreds);

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

  const dropsWithDistance = useMemo(
    () =>
      buildDropsWithDistanceClaimed(
        drops,
        geo.latitude,
        geo.longitude,
        calculateDistance,
        hasClaimedDrop
      ),
    [drops, geo.latitude, geo.longitude, hasClaimedDrop]
  );

  const inRangeDrops = useMemo(
    () => getInRangeHuntableDrops(dropsWithDistance),
    [dropsWithDistance]
  );

  const { browseActiveDrops, browseActiveDropsSorted } = useMemo(() => {
    const browse = getBrowseActiveDrops(dropsWithDistance, inRangeDrops);
    const sorted = [...browse].sort(
      (a, b) => (a.distance ?? 0) - (b.distance ?? 0)
    );
    return { browseActiveDrops: browse, browseActiveDropsSorted: sorted };
  }, [dropsWithDistance, inRangeDrops]);

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
        {hunterSignedIn && unredeemedVouchers.length > 0 && (
            <div className="space-y-6">
              <section>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gift className="w-5 h-5 shrink-0 text-teal" />
                      <h2 className="font-semibold text-lg text-foreground truncate">
                        {t("home.claimedDrops")}
                      </h2>
                      <Badge className="shrink-0 bg-teal/10 text-teal border-teal/20">
                        {unredeemedTotal}
                      </Badge>
                    </div>
                    {unredeemedTotal > unredeemedVouchers.length ? (
                      <Link href="/history?tab=unredeemed" className="shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          data-testid="button-show-more-claimed"
                        >
                          {t("home.showMore")}
                          <ChevronRight className="w-4 h-4" aria-hidden />
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {unredeemedVouchers.map(
                      ({
                        voucher,
                        drop,
                        businessName,
                        merchantLogoUrl,
                        merchantStoreLocation,
                        merchantBusinessPhone,
                        merchantBusinessHours,
                      }) => {
                        const status = voucherStatuses[voucher.id];
                        const openVoucher = () =>
                          setSelectedVoucher({
                            voucher,
                            drop,
                            claimedAt: voucher.claimedAt?.toString() || "",
                            businessName,
                            merchantLogoUrl,
                            merchantStoreLocation,
                            merchantBusinessPhone,
                            merchantBusinessHours,
                          });
                        return (
                          <Card
                            key={voucher.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${drop.name}. ${t("home.view")}`}
                            className="p-0 overflow-hidden hover-elevate cursor-pointer border-teal/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            onClick={openVoucher}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              openVoucher();
                            }}
                            data-testid={`card-voucher-${voucher.id}`}
                          >
                            <div className="flex min-h-[9rem]">
                              <div className="relative w-[36%] min-w-[6.5rem] max-w-[10rem] shrink-0 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-teal/10">
                                {drop.logoUrl ? (
                                  <img
                                    src={drop.logoUrl}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Trophy className="w-10 h-10 text-primary/50" />
                                  </div>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                                <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
                                  {drop.name}
                                </h3>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                  <Badge
                                    variant="secondary"
                                    className="bg-teal/10 text-teal border-teal/20 gap-1 px-1.5 py-0.5 text-xs"
                                  >
                                    <Gift className="w-3 h-3" />
                                    {drop.rewardValue}
                                  </Badge>
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
                                  {status?.timeRemaining !== null &&
                                    status?.timeRemaining > 0 && (
                                      <div
                                        className={cn(
                                          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums w-auto",
                                          voucherRedemptionTimerRowClass(
                                            status.timeRemaining
                                          )
                                        )}
                                      >
                                        <Timer
                                          className="h-3 w-3 shrink-0"
                                          aria-hidden
                                        />
                                        <span className="min-w-0 leading-snug">
                                          <span className="mr-1.5 inline opacity-90">
                                            {t("home.timeToRedeem")}
                                          </span>
                                          <span className="font-semibold">
                                            {formatRedemptionCountdown(
                                              status.timeRemaining
                                            )}
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>
                              <div
                                className="flex w-11 shrink-0 flex-col items-center justify-center border-s border-border/60 bg-muted/15"
                                aria-hidden
                              >
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                          </Card>
                        );
                      }
                    )}
                  </div>
                </section>
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
            {(inRangeDrops.length > 0 || browseActiveDrops.length > 0) && (
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
                    {inRangeDrops.length + browseActiveDrops.length}
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
                          variant="inRange"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {browseActiveDropsSorted.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t("home.browseActiveDrops")}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {browseActiveDropsSorted.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {browseActiveDropsSorted.map((drop) => (
                        <DropCard
                          key={drop.id}
                          drop={drop}
                          distance={drop.distance}
                          claimed={drop.claimed}
                          hunterSignedIn={hunterSignedIn}
                          variant="browse"
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
                      variant="browse"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {hunterSignedIn && redeemedVouchers.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <History className="w-5 h-5 shrink-0 text-muted-foreground" />
                <h2 className="font-semibold text-lg text-foreground truncate">
                  {t("home.redeemedRewards")}
                </h2>
                <Badge variant="secondary" className="shrink-0">
                  {redeemedTotal}
                </Badge>
              </div>
              {redeemedTotal > redeemedVouchers.length ? (
                <Link href="/history?tab=redeemed" className="shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    data-testid="button-show-more-redeemed"
                  >
                    {t("home.showMore")}
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </Button>
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {redeemedVouchers.map(
                ({
                  voucher,
                  drop,
                  businessName,
                  merchantLogoUrl,
                  merchantStoreLocation,
                  merchantBusinessPhone,
                  merchantBusinessHours,
                }) => (
                  <Card
                    key={voucher.id}
                    className="p-4 cursor-pointer hover-elevate border-teal/20"
                    onClick={() =>
                      setSelectedVoucher({
                        voucher,
                        drop,
                        claimedAt: voucher.claimedAt?.toString() || "",
                        businessName,
                        merchantLogoUrl,
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
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 h-8 w-8"
                        aria-label={t("home.view")}
                      >
                        <ChevronRight className="w-4 h-4" aria-hidden />
                      </Button>
                    </div>
                  </Card>
                )
              )}
            </div>
          </section>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <Link
            href={
              hunterSignedIn
                ? "/hunt?readySwipe=1"
                : `/login?next=${encodeURIComponent("/hunt?readySwipe=1")}`
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
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col sm:rounded-xl">
          <DialogHeader className="sr-only shrink-0">
            <DialogTitle>{t("home.yourReward")}</DialogTitle>
          </DialogHeader>
          {selectedVoucher ? (
            <VoucherDisplay
              layout="dialog"
              voucher={selectedVoucher.voucher}
              drop={selectedVoucher.drop}
              businessName={selectedVoucher.businessName}
              merchantLogoUrl={selectedVoucher.merchantLogoUrl}
              merchantStoreLocation={selectedVoucher.merchantStoreLocation}
              merchantBusinessPhone={selectedVoucher.merchantBusinessPhone}
              merchantBusinessHours={selectedVoucher.merchantBusinessHours}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
