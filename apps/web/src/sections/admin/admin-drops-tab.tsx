"use client";

import { useCallback, useEffect, useState } from "react";
import type { Drop } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminDropsListQuery,
  useAdminMerchantsListQuery,
  useAdminUpdateDropMutation,
  useAdminDeleteDropMutation,
  useAdminDropCodesQuery,
  useAdminUploadDropCodesMutation,
  ADMIN_DROPS_PAGE_SIZE,
  fetchAllAdminDropsForExport,
} from "@/hooks/api/admin/use-admin";
import type { MerchantDropsListStatus } from "@/hooks/api/merchant/use-merchant";
import { MerchantDropsPanel } from "@/sections/merchant/merchant-drops-panel";
import { MerchantDropSheet } from "@/sections/merchant/merchant-drop-sheet";
import { publicUrls } from "@/lib/app-config";
import { downloadCsv } from "@/utils/download-csv";
import {
  Plus,
  Download,
  Loader2,
  Upload,
  FileText,
  Tag,
} from "lucide-react";

export function AdminDropsTab(props: { hasSession: boolean }) {
  const { hasSession } = props;
  const { toast } = useToast();

  const [dropsPage, setDropsPage] = useState(1);
  const [dropsSearch, setDropsSearch] = useState("");
  const [dropsStatus, setDropsStatus] =
    useState<MerchantDropsListStatus>("all");
  const [merchantFilterId, setMerchantFilterId] = useState<string>("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null);
  const [adminCodesDropId, setAdminCodesDropId] = useState<string | null>(
    null,
  );
  const [adminCodesText, setAdminCodesText] = useState("");
  const [sheetMerchantSearch, setSheetMerchantSearch] = useState("");
  const [sheetMerchantId, setSheetMerchantId] = useState("");
  const [dropActiveTogglingId, setDropActiveTogglingId] = useState<
    string | null
  >(null);
  const [exporting, setExporting] = useState(false);

  const merchantsPickerQuery = useAdminMerchantsListQuery(hasSession, {
    page: 1,
    limit: 200,
    search: "",
  });
  const merchantsForPickers = merchantsPickerQuery.data?.items ?? [];

  const dropsSearchForApi = dropsSearch.trim();

  const dropsQuery = useAdminDropsListQuery(hasSession, {
    page: dropsPage,
    limit: ADMIN_DROPS_PAGE_SIZE,
    search: dropsSearchForApi,
    status: dropsStatus === "all" ? undefined : dropsStatus,
    merchantId: merchantFilterId || undefined,
  });

  const dropsList = dropsQuery.data?.items ?? [];
  const merchantNameByDropId = new Map(
    dropsList.map((r) => [r.id, r.merchantName]),
  );

  const dropsAsDrops: Drop[] = dropsList.map((row) => {
    const { merchantName: _m, ...rest } = row as Drop & {
      merchantName: string;
    };
    return rest as Drop;
  });

  const dropsTotal = dropsQuery.data?.total ?? 0;
  const dropsTotalPages = dropsQuery.data?.totalPages ?? 1;

  const handleDropsSearchChange = useCallback((value: string) => {
    setDropsSearch(value);
    setDropsPage(1);
  }, []);

  const handleDropsStatusChange = useCallback(
    (value: MerchantDropsListStatus) => {
      setDropsStatus(value);
      setDropsPage(1);
    },
    [],
  );

  const handleMerchantFilterChange = useCallback((value: string) => {
    setMerchantFilterId(value);
    setDropsPage(1);
  }, []);

  useEffect(() => {
    if (dropsPage > dropsTotalPages) {
      setDropsPage(dropsTotalPages);
    }
  }, [dropsPage, dropsTotalPages]);

  const adminCodesQuery = useAdminDropCodesQuery(adminCodesDropId);

  const updateDropMutation = useAdminUpdateDropMutation({
    onSuccess: () => {
      toast({ title: "Drop updated" });
    },
  });

  const deleteDropMutation = useAdminDeleteDropMutation({
    onSuccess: () => {
      toast({ title: "Drop deleted" });
      setSheetOpen(false);
      setEditingDrop(null);
    },
  });

  const adminUploadCodesMutation = useAdminUploadDropCodesMutation(
    adminCodesDropId,
    {
      onSuccess: () => {
        setAdminCodesText("");
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
    },
  );

  const handleAdminUploadCodes = () => {
    if (!adminCodesDropId || !adminCodesText.trim()) return;
    const codes = adminCodesText
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (codes.length === 0) return;
    adminUploadCodesMutation.mutate({ dropId: adminCodesDropId, codes });
  };

  const handleAdminFileImportCodes = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setAdminCodesText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const openCreateSheet = () => {
    setEditingDrop(null);
    setSheetMerchantId("");
    setSheetMerchantSearch("");
    setSheetOpen(true);
  };

  const openEditSheet = (drop: Drop) => {
    setEditingDrop(drop);
    setSheetOpen(true);
  };

  const handleShareDrop = (dropId: string) => {
    const link = publicUrls.drop(dropId);
    void navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Drop URL copied to clipboard.",
    });
  };

  const handleDropActiveChange = (dropId: string, active: boolean) => {
    setDropActiveTogglingId(dropId);
    updateDropMutation.mutate(
      { id: dropId, active },
      { onSettled: () => setDropActiveTogglingId(null) },
    );
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllAdminDropsForExport({
        search: dropsSearchForApi,
        status: dropsStatus,
        merchantId: merchantFilterId || undefined,
      });
      downloadCsv(
        `drops-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Name",
          "Merchant",
          "Reward",
          "Active",
          "Latitude",
          "Longitude",
          "Radius",
          "Created",
        ],
        rows.map((r) => [
          r.name,
          r.merchantName,
          r.rewardValue,
          r.active ? "yes" : "no",
          r.latitude,
          r.longitude,
          r.radius,
          String(r.createdAt),
        ]),
      );
      toast({ title: "Export ready" });
    } catch {
      toast({
        title: "Export failed",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>All Drops</CardTitle>
              <CardDescription>
                Create, edit, and manage drops across the platform
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
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
              <Button
                onClick={openCreateSheet}
                data-testid="button-create-drop"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Drop
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MerchantDropsPanel
            hideSummaryCards
            hideToolbarActions
            externalList={{
              drops: dropsAsDrops,
              total: dropsTotal,
              totalPages: dropsTotalPages,
              loading: dropsQuery.isLoading && !dropsQuery.data,
              page: dropsPage,
              pageSize: ADMIN_DROPS_PAGE_SIZE,
              onPageChange: setDropsPage,
              search: dropsSearch,
              onSearchChange: handleDropsSearchChange,
              status: dropsStatus,
              onStatusChange: handleDropsStatusChange,
              showMerchantColumn: true,
              getMerchantLabel: (d) => merchantNameByDropId.get(d.id) ?? "—",
              merchantFilter: {
                value: merchantFilterId,
                options: merchantsForPickers.map((m) => ({
                  id: m.id,
                  label: m.businessName,
                })),
                onChange: handleMerchantFilterChange,
                disabled:
                  merchantsPickerQuery.isLoading &&
                  merchantsForPickers.length === 0,
              },
            }}
            onCreateClick={openCreateSheet}
            onShareDrop={handleShareDrop}
            onCodesClick={(id) => setAdminCodesDropId(id)}
            onEditDrop={openEditSheet}
            onDropActiveChange={handleDropActiveChange}
            dropActiveTogglePending={updateDropMutation.isPending}
            dropActiveTogglingId={dropActiveTogglingId}
          />
        </CardContent>
      </Card>

      <MerchantDropSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingDrop(null);
            setSheetMerchantId("");
            setSheetMerchantSearch("");
          }
        }}
        editingDrop={editingDrop}
        onAdminMutationSuccess={() => setDropsPage(1)}
        onDeleteDrop={(id) => deleteDropMutation.mutate(id)}
        deletePending={deleteDropMutation.isPending}
        adminContext={{
          merchants: merchantsForPickers.map((m) => ({
            id: m.id,
            businessName: m.businessName,
            emailVerified: m.emailVerified,
          })),
          merchantSearch: sheetMerchantSearch,
          onMerchantSearchChange: setSheetMerchantSearch,
          selectedMerchantId: sheetMerchantId,
          onSelectedMerchantIdChange: setSheetMerchantId,
        }}
      />


      <Dialog
        open={!!adminCodesDropId}
        onOpenChange={(open) => {
          if (!open) {
            setAdminCodesDropId(null);
            setAdminCodesText("");
          }
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-teal-500" />
              Partner Promo Codes
            </DialogTitle>
            <DialogDescription>
              Upload codes that will be assigned one-per-user when they claim
              this drop.
            </DialogDescription>
          </DialogHeader>

          {adminCodesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <div className="text-2xl font-bold">
                    {adminCodesQuery.data?.stats?.total || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {adminCodesQuery.data?.stats?.available || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {adminCodesQuery.data?.stats?.assigned || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Assigned</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Codes</Label>
                <Textarea
                  placeholder="Paste codes here, one per line or comma-separated..."
                  value={adminCodesText}
                  onChange={(e) => setAdminCodesText(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                  data-testid="textarea-admin-promo-codes"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAdminUploadCodes}
                    disabled={
                      !adminCodesText.trim() ||
                      adminUploadCodesMutation.isPending
                    }
                    className="flex-1"
                    data-testid="button-admin-upload-codes"
                  >
                    {adminUploadCodesMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Codes
                  </Button>
                  <Button
                    variant="outline"
                    className="relative"
                    data-testid="button-admin-import-csv"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleAdminFileImportCodes}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </Button>
                </div>
              </div>

              {(adminCodesQuery.data?.codes?.length || 0) > 0 ? (
                <div className="space-y-2">
                  <Label>Code List</Label>
                  <div className="max-h-40 divide-y overflow-y-auto rounded-lg border">
                    {adminCodesQuery.data?.codes.map(
                      (code: { id?: string; code: string; status: string }) => (
                        <div
                          key={code.id ?? code.code}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span className="font-mono">{code.code}</span>
                          <Badge
                            variant={
                              code.status === "available"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {code.status}
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
