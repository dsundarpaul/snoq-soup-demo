import type { Drop, Voucher } from "@shared/schema";
import { cn } from "@/lib/utils";
import type { TranslateFn } from "@/sections/home/types";

export interface StoredVoucher {
  voucher: Voucher;
  drop: Drop;
  claimedAt: string;
  businessName: string;
  merchantLogoUrl?: string | null;
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

export function isVoucherActive(
  voucher: Voucher,
  drop: Drop,
  t: TranslateFn
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

export function formatRedemptionCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function voucherRedemptionTimerRowClass(secondsRemaining: number): string {
  if (secondsRemaining <= 0) {
    return cn(
      "border-transparent bg-muted/40 text-muted-foreground",
    );
  }
  if (secondsRemaining >= 172800) {
    return cn(
      "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
    );
  }
  if (secondsRemaining >= 86400) {
    return cn(
      "border-teal/40 bg-teal/10 text-teal dark:border-teal/35 dark:bg-teal/15",
    );
  }
  if (secondsRemaining >= 3600) {
    return cn(
      "border-amber-500/40 bg-amber-500/12 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100",
    );
  }
  if (secondsRemaining >= 600) {
    return cn(
      "border-orange-500/45 bg-orange-500/12 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-100",
    );
  }
  return cn(
    "border-destructive/50 bg-destructive/12 text-destructive font-semibold dark:bg-destructive/20",
  );
}
