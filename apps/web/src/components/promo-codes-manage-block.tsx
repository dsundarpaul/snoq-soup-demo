"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type {
  PromoCodesResponse,
  PromoCodesStats,
} from "@/sections/merchant/merchant-dashboard.types";

export type PromoCodesManageVariant = "merchant" | "admin";

export interface PromoCodesManageBlockProps {
  variant: PromoCodesManageVariant;
  isLoading: boolean;
  data: PromoCodesResponse | undefined;
  stats?: PromoCodesStats;
  statsLoading?: boolean;
  tableSection?: ReactNode;
  codesText: string;
  onCodesTextChange: (text: string) => void;
  uploadPending: boolean;
  onUploadCodes: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deletePending?: boolean;
  onDeleteAllCodes?: () => void;
  onDeleteCode?: (codeId: string) => void;
  deletingCodeId?: string | null;
}

export function PromoCodesManageBlock({
  variant,
  isLoading,
  data,
  stats: statsProp,
  statsLoading = false,
  tableSection,
  codesText,
  onCodesTextChange,
  uploadPending,
  onUploadCodes,
  onImportFile,
  deletePending = false,
  onDeleteAllCodes,
  onDeleteCode,
  deletingCodeId = null,
}: PromoCodesManageBlockProps) {
  const { t } = useLanguage();
  const stats = statsProp ?? data?.stats;

  const ids =
    variant === "admin"
      ? {
          textarea: "textarea-admin-promo-codes",
          upload: "button-admin-upload-codes",
          importCsv: "button-admin-import-csv",
        }
      : {
          textarea: "textarea-promo-codes",
          upload: "button-upload-codes",
          importCsv: "button-import-csv",
        };

  const statusLabel = (status: string) =>
    status === "available"
      ? t("promoCodes.statusAvailable")
      : t("promoCodes.statusAssigned");

  return (
    <>
      {isLoading && !tableSection ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <div
                className="text-2xl font-bold"
                data-testid="text-codes-total"
              >
                {statsLoading ? (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                ) : (
                  stats?.total ?? 0
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("promoCodes.total")}
              </div>
            </div>
            <div className="rounded-lg bg-green-500/10 p-3 text-center">
              <div
                className="text-2xl font-bold text-green-600"
                data-testid="text-codes-available"
              >
                {statsLoading ? (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                ) : (
                  stats?.available ?? 0
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("promoCodes.available")}
              </div>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-center">
              <div
                className="text-2xl font-bold text-blue-600"
                data-testid="text-codes-assigned"
              >
                {statsLoading ? (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                ) : (
                  stats?.assigned ?? 0
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("promoCodes.assigned")}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("promoCodes.addCodes")}</Label>
            <Textarea
              placeholder={t("promoCodes.placeholder")}
              value={codesText}
              onChange={(e) => onCodesTextChange(e.target.value)}
              rows={5}
              className="font-mono text-sm"
              data-testid={ids.textarea}
            />
            <div className="flex gap-2">
              <Button
                onClick={onUploadCodes}
                disabled={!codesText.trim() || uploadPending}
                className="flex-1"
                data-testid={ids.upload}
              >
                {uploadPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {t("promoCodes.uploadCodes")}
              </Button>
              <label
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "cursor-pointer",
                )}
                data-testid={ids.importCsv}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t("promoCodes.importCsv")}
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={onImportFile}
                  className="sr-only"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Max upload limit: 1000 codes
            </p>
          </div>

          {tableSection ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("promoCodes.codeList")}</Label>
                {onDeleteAllCodes ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={onDeleteAllCodes}
                    disabled={deletePending}
                    data-testid="button-delete-all-codes"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t("promoCodes.deleteAll")}
                  </Button>
                ) : null}
              </div>
              {tableSection}
            </div>
          ) : (data?.codes?.length || 0) > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("promoCodes.codeList")}</Label>
                {onDeleteAllCodes ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={onDeleteAllCodes}
                    disabled={deletePending}
                    data-testid="button-delete-all-codes"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t("promoCodes.deleteAll")}
                  </Button>
                ) : null}
              </div>
              <div className="max-h-40 divide-y overflow-y-auto rounded-lg border">
                {data?.codes.map((code) => (
                  <div
                    key={code.id}
                    className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 truncate font-mono">
                      {code.code}
                    </span>
                    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            code.status === "available"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {statusLabel(code.status)}
                        </Badge>
                        {code.status === "available" && onDeleteCode ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={deletingCodeId === code.id}
                            onClick={() => onDeleteCode(code.id)}
                            data-testid={`button-delete-code-${code.id}`}
                            title={t("promoCodes.deleteOneTitle")}
                          >
                            {deletingCodeId === code.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                      {code.status === "assigned" && code.assignedToName ? (
                        <span className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {t("promoCodes.claimedBy")}: {code.assignedToName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
