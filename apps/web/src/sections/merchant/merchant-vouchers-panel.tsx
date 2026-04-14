"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Loader2,
  Ticket,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useMerchantVouchersQuery,
  fetchAllMerchantVouchersForExport,
  MERCHANT_VOUCHERS_PAGE_SIZE,
  type MerchantVoucherStatus,
} from "@/hooks/api/voucher/use-voucher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/utils/download-csv";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "—";
  return format(new Date(d), "MMM d, yyyy HH:mm");
}

export function MerchantVouchersPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MerchantVoucherStatus>("all");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useMerchantVouchersQuery({
    page,
    limit: MERCHANT_VOUCHERS_PAGE_SIZE,
    search,
    status,
  });

  const rows = data?.vouchers ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rangeStart = total === 0 ? 0 : (page - 1) * MERCHANT_VOUCHERS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * MERCHANT_VOUCHERS_PAGE_SIZE, total);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllMerchantVouchersForExport({ search, status });
      downloadCsv(
        `vouchers-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Drop", "Claimed By", "Email", "Claimed", "Status"],
        all.map((r) => [
          r.dropName,
          r.claimerName ?? "",
          r.claimerEmail ?? "",
          fmt(r.voucher.claimedAt),
          r.voucher.redeemed ? "Redeemed" : "Active",
        ]),
      );
      toast({ title: "Export ready" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Ticket className="w-5 h-5" />
        <p className="text-sm">{t("merchantVouchers.subtitle")}</p>
      </div>
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Vouchers
            </CardTitle>
            <CardDescription>
              {total > 0 ? `${total} voucher${total === 1 ? "" : "s"} total` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by drop name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                aria-label="Search vouchers"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as MerchantVoucherStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">{t("merchantVouchers.active")}</SelectItem>
                <SelectItem value="redeemed">{t("merchantVouchers.redeemed")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              disabled={exporting}
              onClick={() => void handleExportCsv()}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !data ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search || status !== "all"
                ? "No vouchers match your filters"
                : t("merchantVouchers.empty")}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("merchantVouchers.drop")}</TableHead>
                    <TableHead>{t("merchantVouchers.claimedBy")}</TableHead>
                    <TableHead>{t("merchantVouchers.claimed")}</TableHead>
                    <TableHead>{t("merchantVouchers.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ voucher, dropName, claimerName, claimerEmail }) => (
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
                  ))}
                </TableBody>
              </Table>
              {total > 0 ? (
                <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {rangeStart}–{rangeEnd} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("merchantVouchers.prev")}
                    </Button>
                    <span className="px-1 text-sm text-muted-foreground tabular-nums">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      {t("merchantVouchers.next")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
