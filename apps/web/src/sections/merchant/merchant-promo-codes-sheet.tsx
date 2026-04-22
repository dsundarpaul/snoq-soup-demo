"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { format } from "date-fns";
import { Tag, Loader2, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PromoCodesManageBlock } from "@/components/promo-codes-manage-block";
import { useLanguage } from "@/contexts/language-context";
import {
  useMerchantDropCodesListQuery,
  useMerchantDropCodesStatsQuery,
} from "@/hooks/api/merchant/use-merchant";
import type { MerchantPromoCodesListStatus } from "@/sections/merchant/merchant-dashboard.types";
import { cn } from "@/lib/utils";

function formatCodeDate(d: Date | null): string {
  if (d == null) return "—";
  return format(d, "MMM d, yyyy HH:mm");
}

export interface MerchantPromoCodesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropId: string | null;
  codesText: string;
  onCodesTextChange: (text: string) => void;
  uploadPending: boolean;
  deletePending: boolean;
  deletingCodeId?: string | null;
  onUploadCodes: () => void;
  onDeleteAllCodes: () => void;
  onDeleteCode: (codeId: string) => void;
  onImportFile: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function MerchantPromoCodesSheet({
  open,
  onOpenChange,
  dropId,
  codesText,
  onCodesTextChange,
  uploadPending,
  deletePending,
  deletingCodeId = null,
  onUploadCodes,
  onDeleteAllCodes,
  onDeleteCode,
  onImportFile,
}: MerchantPromoCodesSheetProps) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MerchantPromoCodesListStatus>("all");

  const statsQuery = useMerchantDropCodesStatsQuery(
    open && dropId ? dropId : null,
  );
  const listQuery = useMerchantDropCodesListQuery({
    dropId: open && dropId ? dropId : null,
    page,
    status: statusFilter,
    search: debouncedSearch,
    enabled: open && !!dropId,
  });

  useEffect(() => {
    if (open && dropId) {
      setPage(1);
      setSearchInput("");
      setDebouncedSearch("");
      setStatusFilter("all");
    }
  }, [open, dropId]);

  useEffect(() => {
    const tmr = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const statusLabel = (status: string) =>
    status === "available"
      ? t("promoCodes.statusAvailable")
      : t("promoCodes.statusAssigned");

  const hasActiveFilters =
    debouncedSearch.length > 0 || statusFilter !== "all";
  const listData = listQuery.data;
  const totalPages = listData?.totalPages ?? 1;

  const tableSection = !dropId ? null : (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder={t("promoCodes.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="font-mono text-sm sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as MerchantPromoCodesListStatus)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("promoCodes.filterAll")}</SelectItem>
            <SelectItem value="available">
              {t("promoCodes.filterAvailable")}
            </SelectItem>
            <SelectItem value="assigned">
              {t("promoCodes.filterAssigned")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && listData ? (
        <p className="text-xs text-muted-foreground">
          {t("promoCodes.matchesFilter", { count: listData.total })}
        </p>
      ) : null}
      <div className="relative rounded-md border">
        {listQuery.isFetching ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60"
            aria-busy
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}
        <div className="max-h-[min(50vh,420px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">
                  {t("promoCodes.colCode")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("promoCodes.colStatus")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("promoCodes.colAssignee")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("promoCodes.colAssignedAt")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("promoCodes.colCreated")}
                </TableHead>
                <TableHead className="w-12 p-2 text-end font-semibold" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-destructive"
                  >
                    {t("common.error")}
                  </TableCell>
                </TableRow>
              ) : !listQuery.isFetching &&
                listData &&
                listData.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("promoCodes.emptyTable")}
                  </TableCell>
                </TableRow>
              ) : listData && listData.items.length > 0 ? (
                listData.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[140px] font-mono text-xs sm:max-w-[200px]">
                      <span className="block truncate">{row.code}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "available"
                            ? "secondary"
                            : "default"
                        }
                        className="whitespace-nowrap"
                      >
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] text-sm text-muted-foreground">
                      <span className="line-clamp-2 break-words">
                        {row.assignedToName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                      {formatCodeDate(row.assignedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                      {formatCodeDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-end">
                      {row.status === "available" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deletingCodeId === row.id}
                          onClick={() => onDeleteCode(row.id)}
                          data-testid={`button-delete-code-${row.id}`}
                          title={t("promoCodes.deleteOneTitle")}
                        >
                          {deletingCodeId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : !listData && !listQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24" aria-hidden />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {t("promoCodes.page", { page, totalPages })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || listQuery.isFetching}
          >
            {t("promoCodes.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || listQuery.isFetching}
          >
            {t("promoCodes.next")}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[min(100vw,960px)]",
        )}
      >
        <div className="space-y-4 border-b p-6">
          <SheetHeader className="space-y-1 text-start">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Tag className="h-5 w-5 text-teal-500" />
              {t("promoCodes.partnerTitle")}
            </SheetTitle>
            <SheetDescription>{t("promoCodes.description")}</SheetDescription>
          </SheetHeader>
        </div>
        <div className="flex-1 space-y-4 p-6">
          <PromoCodesManageBlock
            variant="merchant"
            isLoading={false}
            data={undefined}
            stats={statsQuery.data}
            statsLoading={statsQuery.isLoading}
            tableSection={tableSection}
            codesText={codesText}
            onCodesTextChange={onCodesTextChange}
            uploadPending={uploadPending}
            onUploadCodes={onUploadCodes}
            onImportFile={onImportFile}
            deletePending={deletePending}
            onDeleteAllCodes={onDeleteAllCodes}
            onDeleteCode={onDeleteCode}
            deletingCodeId={deletingCodeId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
