"use client";

import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, BarChart3, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { publicUrls } from "@/lib/app-config";
import {
  merchantLogout,
  merchantQueryKeys,
  useMerchantMeQuery,
  useMerchantDropsListQuery,
  useMerchantAnalyticsQuery,
  useMerchantDropCodesQuery,
} from "@/hooks/api/merchant/use-merchant";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
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
import { MerchantDropForm } from "@/sections/merchant/merchant-drop-form";
import { MerchantDropPreviewDialog } from "@/sections/merchant/merchant-drop-preview-dialog";
import { MerchantPromoCodesDialog } from "@/sections/merchant/merchant-promo-codes-dialog";
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

  const { data: drops = [], isLoading: dropsLoading } =
    useMerchantDropsListQuery();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: merchantQueryKeys.stats,
    queryFn: async () => {
      const res = await apiFetch("GET", "/api/v1/merchants/me/stats", {
        auth: "merchant",
      });
      await throwIfResNotOk(res);
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
          data.redemptionType === "timer" ? data.redemptionMinutes || 30 : data.redemptionMinutes,
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
          data.redemptionType === "timer" ? data.redemptionMinutes || 30 : data.redemptionMinutes,
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
        file.type && file.type.length > 0
          ? file.type
          : "image/png";
      const presignRes = await apiFetch("POST", "/api/v1/upload/presign", {
        auth: "merchant",
        body: {
          filename: file.name,
          contentType,
          size: file.size,
        },
      });
      await throwIfResNotOk(presignRes);
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
      form.setValue(
        "logoUrl",
        presignJson.publicUrl || presignJson.key || ""
      );
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
        </Tabs>
      </main>

      <Dialog
        open={showCreateDialog || !!editingDrop}
        onOpenChange={(open) => {
          if (!open) closeDropDialog();
        }}
      >
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {editingDrop ? "Edit Drop" : "Create New Drop"}
            </DialogTitle>
            <DialogDescription>
              {editingDrop
                ? "Update the details of your reward drop."
                : "Set up a new reward drop location for customers to discover."}
            </DialogDescription>
          </DialogHeader>
          <MerchantDropForm
            form={form}
            editingDrop={editingDrop}
            mapPickerRemountKey={mapPickerEpoch}
            isUploadingLogo={isUploadingLogo}
            isGettingLocation={isGettingLocation}
            isSubmitting={isSubmitting}
            googleMapsApiKey={googleMapsApiKey}
            onLogoFile={handleFileUpload}
            onUseCurrentLocation={handleUseCurrentLocation}
            onOpenArPlacer={() => setArPlacerOpen(true)}
            onCancel={closeDropDialog}
            onPreview={() => setShowPreview(true)}
            onSubmitValid={onSubmit}
            onSubmitInvalid={handleValidationError}
          />
        </DialogContent>
      </Dialog>

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
