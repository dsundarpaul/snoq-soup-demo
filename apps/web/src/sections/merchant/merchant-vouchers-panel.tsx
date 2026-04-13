"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Ticket } from "lucide-react";
import { useMerchantVouchersQuery } from "@/hooks/api/voucher/use-voucher";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "—";
  return format(new Date(d), "MMM d, yyyy HH:mm");
}

export function MerchantVouchersPanel() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading } = useMerchantVouchersQuery(page, limit);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rows = data?.vouchers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Ticket className="w-5 h-5" />
        <p className="text-sm">{t("merchantVouchers.subtitle")}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("merchantVouchers.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("merchantVouchers.drop")}</TableHead>
                  <TableHead>{t("merchantVouchers.claimedBy")}</TableHead>
                  <TableHead>{t("merchantVouchers.claimed")}</TableHead>
                  <TableHead>{t("merchantVouchers.expires")}</TableHead>
                  <TableHead>{t("merchantVouchers.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(
                  ({ voucher, dropName, claimerName, claimerEmail }) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {dropName || voucher.dropId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[220px]">
                      {claimerName || claimerEmail ? (
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {claimerName ? (
                            <span className="font-medium text-foreground truncate">
                              {claimerName}
                            </span>
                          ) : null}
                          {claimerEmail ? (
                            <span
                              className={
                                claimerName
                                  ? "truncate text-xs"
                                  : "font-medium text-foreground truncate"
                              }
                            >
                              {claimerEmail}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {fmt(voucher.claimedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {fmt(voucher.expiresAt)}
                    </TableCell>
                    <TableCell>
                      {voucher.redeemed ? (
                        <Badge variant="secondary">
                          {t("merchantVouchers.redeemed")}
                        </Badge>
                      ) : (
                        <Badge className="bg-teal/15 text-teal-foreground border-teal/30">
                          {t("merchantVouchers.active")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
          {rows.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("merchantVouchers.prev")}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("merchantVouchers.next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
