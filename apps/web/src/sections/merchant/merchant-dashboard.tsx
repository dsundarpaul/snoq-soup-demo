"use client";

import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, BarChart3, Loader2, Ticket } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { publicUrls } from "@/lib/app-config";
import {
  merchantLogout,
  merchantQueryKeys,
  useMerchantMeQuery,
  useMerchantAnalyticsQuery,
  useMerchantDropCodesQuery,
  useMerchantDropActiveMutation,
  type MerchantDropsListStatus,
} from "@/hooks/api/merchant/use-merchant";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import {
  mapMerchantStatsToLegacy,
  toNestBulkPromoPayload,
} from "@/lib/nest-mappers";
import { useToast } from "@/hooks/use-toast";
import type { Drop } from "@shared/schema";
import type {
  AnalyticsData,
  DashboardStats,
  PromoCodesResponse,
} from "@/sections/merchant/merchant-dashboard.types";
import { DatePickerField } from "@/components/date-picker-field";
import { MerchantDashboardHeader } from "@/sections/merchant/merchant-dashboard-header";
import { MerchantScannerFab } from "@/sections/merchant/merchant-scanner-fab";
import { MerchantDropsPanel } from "@/sections/merchant/merchant-drops-panel";
import { MerchantAnalyticsPanel } from "@/sections/merchant/merchant-analytics-panel";
import { filterAnalyticsByRange } from "@/sections/merchant/filter-analytics-by-range";
import { MerchantDropSheet } from "@/sections/merchant/merchant-drop-sheet";
import { MerchantPromoCodesDialog } from "@/sections/merchant/merchant-promo-codes-dialog";
import { MerchantVouchersPanel } from "@/sections/merchant/merchant-vouchers-panel";
import { downloadAuthenticatedCsv } from "@/utils/download-authenticated-csv";

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null);
  const [activeTab, setActiveTab] = useState("drops");
  const { toast } = useToast();

  const invalidateDropRelatedQueries = () => {
    void queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
    void queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
  };

  const [codesDropId, setCodesDropId] = useState<string | null>(null);
  const [codesText, setCodesText] = useState("");
  const [dropsExporting, setDropsExporting] = useState(false);

  const handleExportDropsCsv = async (filters: {
    search: string;
    status: MerchantDropsListStatus;
  }) => {
    setDropsExporting(true);
    try {
      await downloadAuthenticatedCsv({
        path: "/api/v1/merchants/me/drops/export",
        query: {
          search: filters.search.trim() || undefined,
          status:
            filters.status === "all" ? undefined : filters.status,
        },
        fallbackFilename: `drops-${new Date().toISOString().slice(0, 10)}.csv`,
        auth: "merchant",
      });
      toast({ title: "Export ready" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setDropsExporting(false);
    }
  };
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd")
  );
  const [analyticsDateTo, setAnalyticsDateTo] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );

  const { data: merchant, isLoading: merchantLoading } = useMerchantMeQuery();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: merchantQueryKeys.stats,
    queryFn: async () => {
      const path = "/api/v1/merchants/me/stats";
      const res = await apiFetchMaybeRetry("GET", path, { auth: "merchant" });
      await throwIfResNotOk(res, path, "merchant");
      return mapMerchantStatsToLegacy(
        (await res.json()) as Record<string, unknown>
      );
    },
  });

  const { data: analyticsRaw, isLoading: analyticsLoading } =
    useMerchantAnalyticsQuery(
      analyticsDateFrom,
      analyticsDateTo,
      activeTab === "analytics"
    );

  const analytics = useMemo(
    () =>
      analyticsRaw
        ? filterAnalyticsByRange(
            analyticsRaw,
            analyticsDateFrom,
            analyticsDateTo
          )
        : undefined,
    [analyticsRaw, analyticsDateFrom, analyticsDateTo]
  );

  const codesQuery = useMerchantDropCodesQuery(codesDropId);

  const deleteDropMutation = useMutation({
    mutationFn: async (dropId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/v1/merchants/me/drops/${dropId}`,
        undefined,
        { auth: "merchant" }
      );
      if (response.status === 204) return { ok: true };
      return response.json();
    },
    onSuccess: () => {
      invalidateDropRelatedQueries();
      setShowCreateDialog(false);
      setEditingDrop(null);
      toast({
        title: "Drop Deleted",
        description: "The drop has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const dropActiveMutation = useMerchantDropActiveMutation({
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadCodesMutation = useMutation({
    mutationFn: async ({
      dropId,
      codes,
    }: {
      dropId: string;
      codes: string[];
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/v1/merchants/me/drops/${dropId}/codes/bulk`,
        toNestBulkPromoPayload(codes),
        { auth: "merchant" }
      );
      return res.json();
    },
    onSuccess: () => {
      setCodesText("");
      if (codesDropId) {
        queryClient.invalidateQueries({
          queryKey: merchantQueryKeys.dropCodes(codesDropId),
        });
      }
      toast({
        title: "Codes Uploaded",
        description: "Promo codes have been added.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload codes.",
        variant: "destructive",
      });
    },
  });

  const deleteCodesMutation = useMutation({
    mutationFn: async (dropId: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/v1/merchants/me/drops/${dropId}/codes`,
        undefined,
        { auth: "merchant" }
      );
      return res.json();
    },
    onSuccess: () => {
      if (codesDropId) {
        queryClient.invalidateQueries({
          queryKey: merchantQueryKeys.dropCodes(codesDropId),
        });
      }
      toast({
        title: "Codes Deleted",
        description: "All promo codes removed.",
      });
    },
  });

  const deleteOneCodeMutation = useMutation({
    mutationFn: async ({
      dropId,
      codeId,
    }: {
      dropId: string;
      codeId: string;
    }) => {
      const res = await apiRequest(
        "DELETE",
        `/api/v1/merchants/me/drops/${dropId}/codes/${codeId}`,
        undefined,
        { auth: "merchant" }
      );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: merchantQueryKeys.dropCodes(variables.dropId),
      });
      toast({
        title: "Code removed",
        description: "Promo code deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete this code.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await merchantLogout();
    router.push("/merchant");
  };

  const handleEditDrop = (drop: Drop) => {
    setEditingDrop(drop);
  };

  const handleUploadCodes = () => {
    if (!codesDropId || !codesText.trim()) return;
    const codes = codesText
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (codes.length === 0) return;
    uploadCodesMutation.mutate({ dropId: codesDropId, codes });
  };

  const handleFileImportCodes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCodesText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const closeDropDialog = () => {
    setShowCreateDialog(false);
    setEditingDrop(null);
  };

  const openCreateDropDialog = () => {
    setEditingDrop(null);
    setShowCreateDialog(true);
  };

  if (merchantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MerchantDashboardHeader merchant={merchant} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <TabsList className="h-10 w-fit shrink-0 justify-start">
              <TabsTrigger
                value="drops"
                className="gap-2"
                data-testid="tab-drops"
              >
                <MapPin className="w-4 h-4" />
                Drops
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="gap-2"
                data-testid="tab-analytics"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="vouchers"
                className="gap-2"
                data-testid="tab-vouchers"
              >
                <Ticket className="w-4 h-4" />
                Vouchers
              </TabsTrigger>
            </TabsList>
            {activeTab === "analytics" && (
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:justify-end sm:ms-auto"
                data-testid="analytics-date-toolbar"
              >
                <DatePickerField
                  id="analytics-from"
                  label="From"
                  variant="compact"
                  showMonthYearDropdowns
                  value={analyticsDateFrom}
                  onChange={setAnalyticsDateFrom}
                  placeholder="Start"
                  data-testid="analytics-date-from"
                />
                <span
                  className="text-muted-foreground text-xs tabular-nums px-0.5 self-center"
                  aria-hidden
                >
                  –
                </span>
                <DatePickerField
                  id="analytics-to"
                  label="To"
                  variant="compact"
                  showMonthYearDropdowns
                  value={analyticsDateTo}
                  onChange={setAnalyticsDateTo}
                  placeholder="End"
                  data-testid="analytics-date-to"
                />
              </div>
            )}
          </div>

          <TabsContent value="drops" className="mt-0">
            <MerchantDropsPanel
              stats={stats}
              statsLoading={statsLoading}
              onCreateClick={openCreateDropDialog}
              onShareDrop={(dropId) => {
                const shareableLink = publicUrls.drop(dropId);
                navigator.clipboard.writeText(shareableLink);
                toast({
                  title: "Link Copied!",
                  description: "Share this link on your social media.",
                });
              }}
              onCodesClick={setCodesDropId}
              onEditDrop={handleEditDrop}
              onDropActiveChange={(dropId, active) =>
                dropActiveMutation.mutate({ dropId, active })
              }
              dropActiveTogglePending={dropActiveMutation.isPending}
              dropActiveTogglingId={
                dropActiveMutation.variables?.dropId ?? null
              }
              onExportCsv={(f) => void handleExportDropsCsv(f)}
              exportPending={dropsExporting}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <MerchantAnalyticsPanel
              analytics={analytics}
              loading={analyticsLoading}
              dateFrom={analyticsDateFrom}
              dateTo={analyticsDateTo}
            />
          </TabsContent>

          <TabsContent value="vouchers" className="mt-0">
            <MerchantVouchersPanel />
          </TabsContent>
        </Tabs>
      </main>

      <MerchantDropSheet
        open={showCreateDialog || !!editingDrop}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeDropDialog();
        }}
        editingDrop={editingDrop}
        onDeleteDrop={(id) => deleteDropMutation.mutate(id)}
        deletePending={deleteDropMutation.isPending}
      />

      <MerchantPromoCodesDialog
        open={!!codesDropId}
        onOpenChange={(open) => {
          if (!open) {
            setCodesDropId(null);
            setCodesText("");
          }
        }}
        codesText={codesText}
        onCodesTextChange={setCodesText}
        codesQuery={codesQuery}
        uploadPending={uploadCodesMutation.isPending}
        deletePending={deleteCodesMutation.isPending}
        deletingCodeId={
          deleteOneCodeMutation.isPending
            ? deleteOneCodeMutation.variables?.codeId ?? null
            : null
        }
        onUploadCodes={handleUploadCodes}
        onDeleteAllCodes={() => {
          if (
            window.confirm(
              "Delete all promo codes for this drop? This cannot be undone."
            )
          ) {
            deleteCodesMutation.mutate(codesDropId!);
          }
        }}
        onDeleteCode={(codeId) => {
          if (
            window.confirm(
              "Delete this promo code? This cannot be undone if it is still available."
            )
          ) {
            deleteOneCodeMutation.mutate({
              dropId: codesDropId!,
              codeId,
            });
          }
        }}
        onImportFile={handleFileImportCodes}
      />

      <MerchantScannerFab />
    </div>
  );
}
