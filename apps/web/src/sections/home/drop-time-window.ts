import type { Drop } from "@shared/schema";
import type { TranslateFn } from "@/sections/home/types";

export type TimeWindowInfo = {
  status: string;
  isExpired: boolean;
  notYetActive: boolean;
};

export function getTimeWindowInfo(
  drop: Drop,
  t: TranslateFn
): TimeWindowInfo | null {
  if (!drop.startTime && !drop.endTime) return null;

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
