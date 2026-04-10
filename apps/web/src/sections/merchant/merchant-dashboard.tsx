"use client";

import { useState, useMemo, useDeferredValue, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  BarChart3,
  Loader2,
  Ticket,
  Plus,
  Pencil,
  Eye,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { publicUrls } from "@/lib/app-config";
import {
  merchantLogout,
  merchantQueryKeys,
  useMerchantMeQuery,
  useMerchantDropsListQuery,
  useMerchantAnalyticsQuery,
  useMerchantDropCodesQuery,
  useMerchantDropActiveMutation,
  type MerchantDropsListStatus,
} from "@/hooks/api/merchant/use-merchant";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import {
  mapMerchantStatsToLegacy,
  mapNestDropToLegacy,
  createDropFormToNestDto,
  toNestBulkPromoPayload,
} from "@/lib/nest-mappers";
import { useToast } from "@/hooks/use-toast";
import type { Drop, Merchant } from "@shared/schema";
import { ARDropPlacer } from "@/components/ar-drop-placer";
import type {
  AnalyticsData,
  DashboardStats,
  PromoCodesResponse,
} from "@/sections/merchant/merchant-dashboard.types";
import {
  createDropSchema,
  formatIsoForDatetimeLocalInput,
  type CreateDropForm,
} from "@/sections/merchant/create-drop-schema";
import { DatePickerField } from "@/components/date-picker-field";
import { MerchantDashboardHeader } from "@/sections/merchant/merchant-dashboard-header";
import { MerchantScannerFab } from "@/sections/merchant/merchant-scanner-fab";
import { MerchantDropsPanel } from "@/sections/merchant/merchant-drops-panel";
import { MerchantAnalyticsPanel } from "@/sections/merchant/merchant-analytics-panel";
import { filterAnalyticsByRange } from "@/sections/merchant/filter-analytics-by-range";
import {
  MerchantDropForm,
  MERCHANT_DROP_FORM_ID,
} from "@/sections/merchant/merchant-drop-form";
import { MerchantDropPreviewDialog } from "@/sections/merchant/merchant-drop-preview-dialog";
import { MerchantPromoCodesDialog } from "@/sections/merchant/merchant-promo-codes-dialog";
import { MerchantVouchersPanel } from "@/sections/merchant/merchant-vouchers-panel";
const FIELD_LABELS: Record<string, string> = {
  name: "Drop Name",
  description: "Description",
  latitude: "Latitude",
  longitude: "Longitude",
  radius: "Radius",
  rewardValue: "Reward Value",
  logoUrl: "Logo URL",
  captureLimit: "Capture Limit",
  startTime: "Start Time",
  endTime: "End Time",
};

const DROPS_PAGE_SIZE = 10;

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null);
  const [activeTab, setActiveTab] = useState("drops");
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateDropForm>({
    resolver: zodResolver(createDropSchema),
    defaultValues: {
      name: "",
      description: "",
      latitude: 24.7136,
      longitude: 46.6753,
      radius: 15,
      rewardValue: "",
      logoUrl: "",
      redemptionType: "anytime",
      redemptionMinutes: undefined,
      redemptionDeadline: "",
      availabilityType: "unlimited",
      captureLimit: undefined,
      startTime: "",
      endTime: "",
      voucherAbsoluteExpiresAt: "",
      voucherTtlHoursAfterClaim: undefined,
    },
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [arPlacerOpen, setArPlacerOpen] = useState(false);
  const [codesDropId, setCodesDropId] = useState<string | null>(null);
  const [codesText, setCodesText] = useState("");
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd")
  );
  const [analyticsDateTo, setAnalyticsDateTo] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );

  const { data: merchant, isLoading: merchantLoading } = useMerchantMeQuery();

  const [dropsPage, setDropsPage] = useState(1);
  const [dropsSearch, setDropsSearch] = useState("");
  const [dropsStatus, setDropsStatus] =
    useState<MerchantDropsListStatus>("all");
  const deferredDropsSearch = useDeferredValue(dropsSearch);

  useEffect(() => {
    setDropsPage(1);
  }, [deferredDropsSearch, dropsStatus]);

  const { data: dropsListData, isLoading: dropsLoading } =
    useMerchantDropsListQuery({
      page: dropsPage,
      limit: DROPS_PAGE_SIZE,
      search: deferredDropsSearch,
      status: dropsStatus,
    });

  const drops = dropsListData?.drops ?? [];
  const dropsTotal = dropsListData?.total ?? 0;
  const dropsTotalPages = Math.max(
    1,
    Math.ceil(dropsTotal / DROPS_PAGE_SIZE)
  );

  useEffect(() => {
    if (dropsPage > dropsTotalPages) {
      setDropsPage(dropsTotalPages);
    }
  }, [dropsPage, dropsTotalPages]);

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

  const createDropMutation = useMutation({
    mutationFn: async (data: CreateDropForm) => {
      const formData = {
        ...data,
        redemptionMinutes:
          data.redemptionType === "timer"
            ? data.redemptionMinutes || 30
            : data.redemptionMinutes,
      };
      const payload = createDropFormToNestDto(formData);
      const response = await apiRequest(
        "POST",
        "/api/v1/merchants/me/drops",
        payload,
        { auth: "merchant" }
      );
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: (newDropRaw) => {
      const newDrop = mapNestDropToLegacy(newDropRaw);
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
      setShowCreateDialog(false);
      form.reset();
      const shareableLink = publicUrls.drop(newDrop.id);
      navigator.clipboard.writeText(shareableLink);
      toast({
        title: "Drop Created!",
        description:
          "Shareable link copied to clipboard. Share it on social media!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Drop",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
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

  const updateDropMutation = useMutation({
    mutationFn: async ({
      dropId,
      data,
    }: {
      dropId: string;
      data: CreateDropForm;
    }) => {
      const formData = {
        ...data,
        redemptionMinutes:
          data.redemptionType === "timer"
            ? data.redemptionMinutes || 30
            : data.redemptionMinutes,
      };
      const payload = createDropFormToNestDto(formData);
      const response = await apiRequest(
        "PATCH",
        `/api/v1/merchants/me/drops/${dropId}`,
        payload,
        { auth: "merchant" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
      setEditingDrop(null);
      form.reset();
      toast({
        title: "Drop Updated!",
        description: "Your reward drop has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Drop",
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

  const handleLogout = async () => {
    await merchantLogout();
    router.push("/merchant");
  };

  const handleEditDrop = (drop: Drop) => {
    setMapPickerEpoch((e) => e + 1);
    const redemptionTypeValue = drop.redemptionType || "anytime";
    const availabilityTypeValue = drop.availabilityType || "unlimited";

    form.reset({
      name: drop.name,
      description: drop.description,
      latitude: drop.latitude,
      longitude: drop.longitude,
      radius: drop.radius,
      rewardValue: drop.rewardValue,
      logoUrl: drop.logoUrl || "",
      redemptionType: redemptionTypeValue as "anytime" | "timer" | "window",
      redemptionMinutes: drop.redemptionMinutes ?? undefined,
      redemptionDeadline: formatIsoForDatetimeLocalInput(
        drop.redemptionDeadline
      ),
      availabilityType: availabilityTypeValue as
        | "unlimited"
        | "captureLimit"
        | "timeWindow",
      captureLimit: drop.captureLimit ?? undefined,
      startTime: formatIsoForDatetimeLocalInput(drop.startTime),
      endTime: formatIsoForDatetimeLocalInput(drop.endTime),
      voucherAbsoluteExpiresAt: formatIsoForDatetimeLocalInput(
        drop.voucherAbsoluteExpiresAt
      ),
      voucherTtlHoursAfterClaim: drop.voucherTtlHoursAfterClaim ?? undefined,
    });
    setEditingDrop(drop);
  };

  const onSubmit = (data: CreateDropForm) => {
    if (editingDrop) {
      updateDropMutation.mutate({ dropId: editingDrop.id, data });
    } else {
      createDropMutation.mutate(data);
    }
  };

  const handleValidationError: SubmitErrorHandler<CreateDropForm> = (
    errors
  ) => {
    const errorFields = Object.keys(errors).map(
      (key) => FIELD_LABELS[key] || key
    );
    toast({
      title: "Please fix the following fields",
      description: errorFields.join(", "),
      variant: "destructive",
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsUploadingLogo(true);
    toast({
      title: "Uploading...",
      description: "Please wait while your logo is being uploaded.",
    });
    try {
      const contentType =
        file.type && file.type.length > 0 ? file.type : "image/png";
      const presignPath = "/api/v1/upload/presign";
      const presignRes = await apiFetchMaybeRetry("POST", presignPath, {
        auth: "merchant",
        body: {
          filename: file.name,
          contentType,
          size: file.size,
        },
      });
      await throwIfResNotOk(presignRes, presignPath, "merchant");
      const presignJson = (await presignRes.json()) as {
        presignedUrl: string;
        publicUrl: string;
        key?: string;
      };
      const uploadResponse = await fetch(presignJson.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload file");
      form.setValue("logoUrl", presignJson.publicUrl || presignJson.key || "");
      toast({
        title: "Logo uploaded!",
        description: "Your logo has been uploaded successfully.",
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue(
          "latitude",
          parseFloat(position.coords.latitude.toFixed(6))
        );
        form.setValue(
          "longitude",
          parseFloat(position.coords.longitude.toFixed(6))
        );
        setIsGettingLocation(false);
        toast({
          title: "Location Found",
          description: "Your current location has been set.",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Could not get your location. Please try again.";
        if (error.code === 1) {
          errorMessage =
            "Location permission denied. Please allow location access in your browser settings.";
        } else if (error.code === 2) {
          errorMessage =
            "Location unavailable. Please check your GPS/network connection.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again.";
        }
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
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
    form.reset();
  };

  const [mapPickerEpoch, setMapPickerEpoch] = useState(0);

  const openCreateDropDialog = () => {
    setMapPickerEpoch((e) => e + 1);
    setShowCreateDialog(true);
  };

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isSubmitting =
    createDropMutation.isPending || updateDropMutation.isPending;

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
              drops={drops}
              dropsLoading={dropsLoading}
              dropsTotal={dropsTotal}
              dropsPage={dropsPage}
              dropsPageSize={DROPS_PAGE_SIZE}
              dropsSearch={dropsSearch}
              dropsStatus={dropsStatus}
              onDropsSearchChange={setDropsSearch}
              onDropsStatusChange={setDropsStatus}
              onDropsPageChange={setDropsPage}
              deletePending={deleteDropMutation.isPending}
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
              onDeleteDrop={(id) => deleteDropMutation.mutate(id)}
              onDropActiveChange={(dropId, active) =>
                dropActiveMutation.mutate({ dropId, active })
              }
              dropActiveTogglePending={dropActiveMutation.isPending}
              dropActiveTogglingId={
                dropActiveMutation.variables?.dropId ?? null
              }
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

      <Sheet
        open={showCreateDialog || !!editingDrop}
        onOpenChange={(open) => {
          if (!open) closeDropDialog();
        }}
      >
        <SheetContent
          showClose={false}
          side="right"
          className="flex h-full max-h-[100dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-1 border-b bg-background px-6 pb-4 pt-6 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <MapPin className="h-5 w-5 shrink-0 text-primary" />
                  {editingDrop ? "Edit Drop" : "Create New Drop"}
                </SheetTitle>
                <SheetDescription>
                  {editingDrop
                    ? "Update the details of your reward drop."
                    : "Set up a new reward drop location for customers to discover."}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <MerchantDropForm
              form={form}
              mapPickerRemountKey={mapPickerEpoch}
              isUploadingLogo={isUploadingLogo}
              isGettingLocation={isGettingLocation}
              googleMapsApiKey={googleMapsApiKey}
              onLogoFile={handleFileUpload}
              onUseCurrentLocation={handleUseCurrentLocation}
              onOpenArPlacer={() => setArPlacerOpen(true)}
              onSubmitValid={onSubmit}
              onSubmitInvalid={handleValidationError}
            />
          </div>
          <SheetFooter className="sticky bottom-0 z-10 shrink-0 flex-col gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-start sm:space-x-0">
            <Button type="button" variant="outline" onClick={closeDropDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(true)}
              disabled={!form.watch("name") || !form.watch("rewardValue")}
              data-testid="button-preview-drop"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              type="submit"
              form={MERCHANT_DROP_FORM_ID}
              className="sm:flex-1"
              disabled={isSubmitting}
              data-testid="button-submit-drop"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingDrop ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {editingDrop ? (
                    <Pencil className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {editingDrop ? "Update Drop" : "Create Drop"}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <MerchantDropPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        form={form}
        editingDrop={editingDrop}
        isSubmitting={isSubmitting}
        onPublish={() => {
          setShowPreview(false);
          void form.handleSubmit(onSubmit, handleValidationError)();
        }}
      />

      <ARDropPlacer
        open={arPlacerOpen}
        onClose={() => setArPlacerOpen(false)}
        onPlaceConfirm={(lat, lon) => {
          form.setValue("latitude", lat);
          form.setValue("longitude", lon);
          toast({
            title: "Location Set",
            description: `Drop location set to ${lat}, ${lon}`,
          });
        }}
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
        onImportFile={handleFileImportCodes}
      />

      <MerchantScannerFab />
    </div>
  );
}
