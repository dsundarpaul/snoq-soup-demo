import { differenceInCalendarDays } from "date-fns";

export type ScannerAssignmentExpiryUrgency =
  | "active"
  | "expiring_soon"
  | "expired";

export function getScannerExpiryUrgency(
  expiresAtIso: string,
  now: Date = new Date()
): ScannerAssignmentExpiryUrgency {
  const expiry = new Date(expiresAtIso);
  if (Number.isNaN(expiry.getTime())) return "expired";
  if (now.getTime() >= expiry.getTime()) return "expired";
  const daysLeft = differenceInCalendarDays(expiry, now);
  if (daysLeft <= 7) return "expiring_soon";
  return "active";
}

export function dateInputToEndOfDayIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error("Invalid date");
  }
  const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
  return localEnd.toISOString();
}
