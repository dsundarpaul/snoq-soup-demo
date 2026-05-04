"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Target } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type SkeletonCountProps = {
  count?: number;
};

export function ClaimedRewardsGridSkeleton({ count = 4 }: SkeletonCountProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      data-testid="skeleton-claimed-rewards-grid"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="p-0 overflow-hidden border-teal/20"
        >
          <div className="flex min-h-[7rem]">
            <Skeleton className="w-[36%] min-w-[6.5rem] max-w-[10rem] shrink-0 rounded-none" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
            </div>
            <div className="flex w-11 shrink-0 items-center justify-center">
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ActiveDropsSkeleton({ count = 3 }: SkeletonCountProps) {
  const { t } = useLanguage();

  return (
    <section className="space-y-4" data-testid="skeleton-active-drops">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg text-foreground">
          {t("home.activeDropsSection")}
        </h2>
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="overflow-hidden p-0">
            <div className="flex min-h-[7rem]">
              <Skeleton className="w-[36%] min-w-[6.5rem] max-w-[10rem] shrink-0 rounded-none" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Skeleton className="h-8 w-24 rounded-sm" />
                  <Skeleton className="h-8 flex-1 rounded-sm" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function RedeemedRewardsSkeleton({ count = 2 }: SkeletonCountProps) {
  const { t } = useLanguage();

  return (
    <section data-testid="skeleton-redeemed-rewards">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-5 h-5 shrink-0 text-muted-foreground" />
          <h2 className="font-semibold text-lg text-foreground truncate">
            {t("home.redeemedRewards")}
          </h2>
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="p-4 border-teal/20">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
              <Skeleton className="shrink-0 h-8 w-8 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
