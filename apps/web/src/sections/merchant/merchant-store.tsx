"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Trophy,
  Gift,
  Navigation,
  Store,
  Clock,
  Loader2,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { Drop } from "@shared/schema";
import { publicUrls } from "@/lib/app-config";
import { APP_NAME, appLogo } from "@/lib/app-brand";
import { useMerchantPublicStoreQuery } from "@/hooks/api/merchant/use-merchant";

type DropWithCount = Drop & { captureCount?: number };

function isDropAvailable(drop: DropWithCount): boolean {
  if (drop.availabilityType === "captureLimit" && drop.captureLimit) {
    const remaining = drop.captureLimit - (drop.captureCount || 0);
    if (remaining <= 0) return false;
  }
  const now = new Date();
  if (drop.endTime && new Date(drop.endTime) < now) return false;
  return true;
}

function getDropStatus(
  drop: DropWithCount,
  t: ReturnType<typeof useLanguage>["t"]
) {
  if (drop.availabilityType === "captureLimit" && drop.captureLimit) {
    const remaining = drop.captureLimit - (drop.captureCount || 0);
    if (remaining <= 0)
      return { label: t("status.soldOut"), variant: "destructive" as const };
    return {
      label: `${remaining} ${t("voucher.left")}`,
      variant: "secondary" as const,
    };
  }
  const now = new Date();
  if (drop.startTime && new Date(drop.startTime) > now) {
    return { label: t("status.comingSoon"), variant: "secondary" as const };
  }
  if (drop.endTime && new Date(drop.endTime) < now) {
    return { label: t("status.expired"), variant: "destructive" as const };
  }
  return null;
}

export default function MerchantStorePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const params = useParams<{ username: string }>();
  const username = params.username;

  const { data, isLoading, error } = useMerchantPublicStoreQuery(username);

  const handleCopyLink = () => {
    const url = publicUrls.store(username);
    navigator.clipboard.writeText(url);
    toast({
      title: t("toast.linkCopied"),
    });
  };

  const handleShare = async () => {
    const url = publicUrls.store(username);
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.merchant.businessName || `${APP_NAME} Store`,
          text: `${t("store.activeRewards")} - ${data?.merchant.businessName}`,
          url,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer">
                  <img
                    src={appLogo.src}
                    alt={APP_NAME}
                    width={appLogo.width}
                    height={appLogo.height}
                    className="h-9 w-auto sm:h-10 max-w-[min(180px,45vw)] object-contain"
                  />
                  <span className="font-bold text-lg">{APP_NAME}</span>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <Store className="w-16 h-16 text-muted-foreground mb-4" />
          <h1
            className="text-2xl font-bold mb-2"
            data-testid="text-store-not-found"
          >
            {t("store.notFound")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("store.notFoundDesc")}
          </p>
          <Link href="/">
            <Button data-testid="button-go-home">{t("nav.goHome")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const availableDrops = data.drops.filter(isDropAvailable);
  const unavailableDrops = data.drops.filter((d) => !isDropAvailable(d));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer">
                  <img
                    src={appLogo.src}
                    alt={APP_NAME}
                    width={appLogo.width}
                    height={appLogo.height}
                    className="h-9 w-auto sm:h-10 max-w-[min(180px,45vw)] object-contain"
                  />
                  <span className="font-bold text-lg">{APP_NAME}</span>
                </div>
            </Link>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={handleShare}
                data-testid="button-share-store"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
                data-testid="button-copy-store-link"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-br from-primary/10 via-background to-teal/10 py-8 px-4 border-b">
        <div className="container mx-auto text-center">
          {data.merchant.logoUrl ? (
            <img
              src={data.merchant.logoUrl}
              alt={data.merchant.businessName}
              className="w-20 h-20 object-cover rounded-2xl mx-auto mb-4 border-2 border-primary/20"
              data-testid="img-merchant-logo"
            />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1
            className="text-2xl font-bold text-foreground mb-1"
            data-testid="text-store-name"
          >
            {data.merchant.businessName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {data.drops.length} {t("store.availableRewards")}
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {data.drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mb-4" />
            <h2
              className="text-xl font-semibold mb-2"
              data-testid="text-no-drops"
            >
              {t("store.noActiveDrops")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("store.noActiveDropsDesc")}
            </p>
            <Link href="/">
              <Button data-testid="button-explore">
                {t("common.startHunting")}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {availableDrops.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-primary" />
                  <h2
                    className="font-semibold text-lg"
                    data-testid="text-active-rewards-heading"
                  >
                    {t("store.activeRewards")}
                  </h2>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {availableDrops.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableDrops.map((drop) => (
                    <StoreDropCard key={drop.id} drop={drop} />
                  ))}
                </div>
              </section>
            )}

            {unavailableDrops.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-semibold text-lg text-muted-foreground">
                    {t("status.expired")} / {t("status.soldOut")}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unavailableDrops.map((drop) => (
                    <StoreDropCard key={drop.id} drop={drop} unavailable />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="text-center pt-6 pb-4 border-t space-y-2">
          <Link href="/">
            <span
              className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              data-testid="link-explore-all"
            >
              {t("store.exploreAll")}
            </span>
          </Link>
          <div>
            <Link href="/">
              <span
                className="text-xs text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer"
                data-testid="link-powered-by"
              >
                {t("store.poweredBy")}
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StoreDropCard({
  drop,
  unavailable,
}: {
  drop: DropWithCount;
  unavailable?: boolean;
}) {
  const { t } = useLanguage();
  const status = getDropStatus(drop, t);

  const handleDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${drop.latitude},${drop.longitude}`,
      "_blank"
    );
  };

  return (
    <Card
      className={`p-4 transition-all ${
        unavailable ? "opacity-50" : "hover-elevate"
      }`}
      data-testid={`card-store-drop-${drop.id}`}
    >
      <div className="flex items-start gap-3">
        {drop.logoUrl ? (
          <img
            src={drop.logoUrl}
            alt={drop.name}
            className="w-14 h-14 rounded-lg object-cover bg-white shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-foreground truncate"
              data-testid={`text-drop-name-${drop.id}`}
            >
              {drop.name}
            </h3>
            {status && (
              <Badge variant={status.variant} className="shrink-0 text-[10px]">
                {status.label}
              </Badge>
            )}
          </div>

          {drop.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {drop.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-teal/10 text-teal border-teal/20">
              <Gift className="w-3 h-3 mr-1" />
              {drop.rewardValue}
            </Badge>
          </div>

          {!unavailable && (
            <div className="flex items-center gap-2 mt-3">
              <Link href={`/drop/${drop.id}`}>
                <Button
                  size="sm"
                  className="gap-1"
                  data-testid={`button-hunt-drop-${drop.id}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  {t("store.huntReward")}
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={handleDirections}
                data-testid={`button-directions-${drop.id}`}
              >
                <Navigation className="w-3 h-3" />
                {t("home.directions")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
