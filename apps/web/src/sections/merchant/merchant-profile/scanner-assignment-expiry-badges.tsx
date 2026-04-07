"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  getScannerExpiryUrgency,
  type ScannerAssignmentExpiryUrgency,
} from "@/hooks/api/scanner";

function urgencyLabel(u: ScannerAssignmentExpiryUrgency): string {
  switch (u) {
    case "expired":
      return "Expired";
    case "expiring_soon":
      return "Expiring soon";
    default:
      return "Active";
  }
}

export function ScannerAssignmentExpiryDisplay({
  expiresAtIso,
}: {
  expiresAtIso: string;
}) {
  const urgency = getScannerExpiryUrgency(expiresAtIso);
  const dateLabel = (() => {
    try {
      return format(new Date(expiresAtIso), "MMM d, yyyy");
    } catch {
      return expiresAtIso;
    }
  })();

  const chipClass =
    urgency === "expired"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : urgency === "expiring_soon"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";

  return (
    <div className="flex flex-col gap-1 items-start">
      <Badge variant="outline" className={`font-normal ${chipClass}`}>
        {dateLabel}
      </Badge>
    </div>
  );
}

export function ScannerAssignmentStatusBadge({
  expiresAtIso,
}: {
  expiresAtIso: string;
}) {
  const urgency = getScannerExpiryUrgency(expiresAtIso);
  if (urgency === "expired") {
    return <Badge variant="destructive">{urgencyLabel(urgency)}</Badge>;
  }
  if (urgency === "expiring_soon") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      >
        {urgencyLabel(urgency)}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-600/35 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
    >
      {urgencyLabel(urgency)}
    </Badge>
  );
}
