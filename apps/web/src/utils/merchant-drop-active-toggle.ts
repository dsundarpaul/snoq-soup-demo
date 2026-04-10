import type { Drop } from "@shared/schema";

export const MERCHANT_DROP_ACTIVE_TOGGLE_BLOCKED =
  "Can't update the drop at this stage";

export function canToggleMerchantDropActive(drop: Drop): boolean {
  const now = new Date();
  const start = drop.startTime ? new Date(drop.startTime) : null;
  const end = drop.endTime ? new Date(drop.endTime) : null;
  if (start && start > now) {
    return false;
  }
  if (end && end < now) {
    return false;
  }
  return true;
}
