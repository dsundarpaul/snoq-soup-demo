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
  Ticket,
  QrCode,
  Timer,
  History,
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

export default function HomePage() {
  const { t } = useLanguage();
  const geo = useGeolocation();
  const hasHunterCreds = useHasRoleCredentials("hunter");
  const { data: hunterVoucherBuckets } = useHunterVouchersQuery();

  const { data: hunterProfile } = useTreasureHunterProfileQuery();

  const hunterSignedIn = Boolean(hunterProfile?.email);

  const unredeemedVouchers =
    hunterVoucherBuckets?.unredeemed ?? EMPTY_VOUCHER_ROWS;
  const redeemedVouchers = hunterVoucherBuckets?.redeemed ?? EMPTY_VOUCHER_ROWS;

  const claimedDropIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const row of [...unredeemedVouchers, ...redeemedVouchers]) {
      s.add(row.voucher.dropId);
    }
    return s;
  }, [unredeemedVouchers, redeemedVouchers]);

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
                                          "inline-flex w-full max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums sm:w-auto",
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
                    <Badge variant="secondary">{redeemedVouchers.length}</Badge>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                            >
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
