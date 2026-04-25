"use client";

import { useEffect, useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type SubmitErrorHandler } from "react-hook-form";
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
import {
  MapPin,
  Loader2,
  Plus,
  Pencil,
  Eye,
  X,
  Store,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { publicUrls } from "@/lib/app-config";
import { merchantQueryKeys } from "@/hooks/api/merchant/use-merchant";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import {
  mapNestDropToLegacy,
  createDropFormToNestDto,
} from "@/lib/nest-mappers";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { validateImageFile } from "@/lib/upload-validation";
import type { Drop } from "@shared/schema";
import { ARDropPlacer } from "@/components/ar-drop-placer";
import {
  getCreateDropEmptyValues,
  type CreateDropForm,
} from "@/sections/merchant/create-drop-schema";
import {
  MerchantDropForm,
  MERCHANT_DROP_FORM_ID,
  useMerchantDropForm,
} from "@/sections/merchant/merchant-drop-form";
import { MerchantDropPreviewDialog } from "@/sections/merchant/merchant-drop-preview-dialog";
import { adminQueryKeys } from "@/hooks/api/admin/use-admin";
import { useMerchantMeQuery } from "@/hooks/api/merchant/use-merchant";
import { Label } from "@/components/ui/label";
import { AdminMerchantAutocomplete } from "@/sections/merchant/admin-merchant-autocomplete";
import { useLanguage } from "@/contexts/language-context";

function invalidateDropRelatedQueries(): void {
  void queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
  void queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
  void queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
}

function legacyAvailabilityToMerchantForm(
  drop: Drop
): "unlimited" | "captureLimit" {
  const raw = drop.availabilityType as unknown;
  if (raw !== null && typeof raw === "object") {
    return drop.captureLimit != null && Number(drop.captureLimit) > 0
      ? "captureLimit"
      : "unlimited";
  }
  if (typeof raw !== "string") {
    return drop.captureLimit != null && Number(drop.captureLimit) > 0
      ? "captureLimit"
      : "unlimited";
  }
  if (raw === "captureLimit") {
    return "captureLimit";
  }
  if (raw === "timeWindow") {
    return "unlimited";
  }
  return "unlimited";
}

function dateToIsoOrEmpty(d: Date | null | undefined): string {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : "";
}

function dropToFormValues(drop: Drop): CreateDropForm {
  const redemptionTypeValue = drop.redemptionType || "anytime";
  const availabilityTypeValue = legacyAvailabilityToMerchantForm(drop);
  return {
    name: drop.name,
    description: drop.description,
    latitude: drop.latitude,
    longitude: drop.longitude,
    radius: drop.radius,
    rewardValue: drop.rewardValue,
    logoUrl: drop.logoUrl || "",
    redemptionType: redemptionTypeValue as "anytime" | "timer" | "window",
    redemptionMinutes: drop.redemptionMinutes ?? undefined,
    redemptionDeadline: dateToIsoOrEmpty(drop.redemptionDeadline),
    availabilityType: availabilityTypeValue,
    captureLimit: drop.captureLimit ?? undefined,
    startTime: dateToIsoOrEmpty(drop.startTime),
    endTime: dateToIsoOrEmpty(drop.endTime),
    voucherAbsoluteExpiresAt: dateToIsoOrEmpty(
      drop.voucherAbsoluteExpiresAt,
    ),
    voucherTtlHoursAfterClaim: drop.voucherTtlHoursAfterClaim ?? undefined,
    termsAndConditions: drop.termsAndConditions ?? "",
  };
}

export type MerchantDropSheetAdminContext = {
  merchants: { id: string; businessName: string; emailVerified?: boolean }[];
  merchantSearch: string;
  onMerchantSearchChange: (value: string) => void;
  selectedMerchantId: string;
  onSelectedMerchantIdChange: (id: string) => void;
};

export interface MerchantDropSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDrop: Drop | null;
  adminContext?: MerchantDropSheetAdminContext;
  onAdminMutationSuccess?: () => void;
  onDeleteDrop?: (dropId: string) => void;
  deletePending?: boolean;
}

export function MerchantDropSheet({
  open,
  onOpenChange,
  editingDrop,
  adminContext,
  onAdminMutationSuccess,
  onDeleteDrop,
  deletePending = false,
}: MerchantDropSheetProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isAdminMode = Boolean(adminContext);
  const merchantSelectInputId = useId();
  const form = useMerchantDropForm();
  const [showPreview, setShowPreview] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [arPlacerOpen, setArPlacerOpen] = useState(false);
  const [mapPickerEpoch, setMapPickerEpoch] = useState(0);
  const logoUploader = useUpload({
    namespace: "drops",
    auth: isAdminMode ? "admin" : "merchant",
  });
  const isUploadingLogo = logoUploader.isUploading;

  useEffect(() => {
    if (!open) {
      form.reset(getCreateDropEmptyValues());
      return;
    }
    setMapPickerEpoch((e) => e + 1);
    if (editingDrop) {
      form.reset(dropToFormValues(editingDrop));
    } else {
      form.reset(getCreateDropEmptyValues());
    }
  }, [open, editingDrop?.id]);

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
      if (isAdminMode) {
        const mid = adminContext!.selectedMerchantId;
        if (!mid) {
          throw new Error("Select a merchant");
        }
        const response = await apiRequest(
          "POST",
          "/api/v1/admin/drops",
          { merchantId: mid, ...payload },
          { auth: "admin" }
        );
        return response.json() as Promise<Record<string, unknown>>;
      }
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
      if (isAdminMode) {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.drops });
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
        onAdminMutationSuccess?.();
      } else {
        invalidateDropRelatedQueries();
      }
      onOpenChange(false);
      form.reset(getCreateDropEmptyValues());
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
      if (isAdminMode) {
        const response = await apiRequest(
          "PATCH",
          `/api/v1/admin/drops/${dropId}`,
          payload,
          { auth: "admin" }
        );
        return response.json();
      }
      const response = await apiRequest(
        "PATCH",
        `/api/v1/merchants/me/drops/${dropId}`,
        payload,
        { auth: "merchant" }
      );
      return response.json();
    },
    onSuccess: () => {
      if (isAdminMode) {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.drops });
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
        onAdminMutationSuccess?.();
      } else {
        invalidateDropRelatedQueries();
      }
      onOpenChange(false);
      form.reset(getCreateDropEmptyValues());
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

  const onSubmit = (data: CreateDropForm) => {
    if (isAdminMode && !editingDrop && !adminContext?.selectedMerchantId) {
      toast({
        title: "Select a merchant",
        variant: "destructive",
      });
      return;
    }
    if (editingDrop) {
      updateDropMutation.mutate({ dropId: editingDrop.id, data });
    } else {
      createDropMutation.mutate(data);
    }
  };

  const handleValidationError: SubmitErrorHandler<CreateDropForm> = (
    errors
  ) => {
    const keys = Object.keys(errors) as (keyof CreateDropForm)[];
    const first = keys[0];
    if (first) {
      form.setFocus(first);
    }
    toast({
      title: t("merchant.form.validation.toastTitle"),
      description: t("merchant.form.validation.toastDesc"),
      variant: "destructive",
    });
  };

  const handleFileUpload = async (file: File) => {
    const check = validateImageFile(file);
    if (!check.valid) {
      toast({ title: check.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Uploading...",
      description: "Please wait while your logo is being uploaded.",
    });
    const result = await logoUploader.uploadFile(file);
    if (!result) {
      toast({
        title: "Upload failed",
        description:
          logoUploader.error?.message ??
          "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      return;
    }
    form.setValue("logoUrl", result.publicUrl);
    toast({
      title: "Logo uploaded!",
      description: "Your logo has been uploaded successfully.",
    });
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

  const { data: merchantMe } = useMerchantMeQuery({
    enabled: !Boolean(adminContext),
  });
  const missingStoreLocation =
    !Boolean(adminContext) && !merchantMe?.storeLocation?.lat;

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isSubmitting =
    createDropMutation.isPending || updateDropMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
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
            {isAdminMode && adminContext && !editingDrop ? (
              <div className="mb-6 space-y-2">
                {adminContext.selectedMerchantId ? (
                  <>
                    <Label>Merchant</Label>
                    <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                      <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">
                        {
                          adminContext.merchants.find(
                            (m) => m.id === adminContext.selectedMerchantId
                          )?.businessName
                        }
                      </span>
                      <button
                        type="button"
                        className="select-none text-xs text-primary hover:underline"
                        onClick={() => {
                          adminContext.onSelectedMerchantIdChange("");
                          adminContext.onMerchantSearchChange("");
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Label htmlFor={merchantSelectInputId}>Merchant</Label>
                    <AdminMerchantAutocomplete
                      inputId={merchantSelectInputId}
                      merchants={adminContext.merchants}
                      search={adminContext.merchantSearch}
                      onSearchChange={adminContext.onMerchantSearchChange}
                      onSelectMerchant={adminContext.onSelectedMerchantIdChange}
                    />
                  </>
                )}
              </div>
            ) : null}
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
              captureCount={
                editingDrop
                  ? ((editingDrop as unknown as { captureCount?: number })
                      .captureCount ?? 0)
                  : 0
              }
              originalAvailabilityType={
                editingDrop
                  ? legacyAvailabilityToMerchantForm(editingDrop)
                  : undefined
              }
              originalCaptureLimit={
                editingDrop?.captureLimit ?? undefined
              }
            />
          </div>
          <SheetFooter className="sticky bottom-0 z-10 shrink-0 flex-col gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-start sm:space-x-0">
            {missingStoreLocation && (
              <div className="flex w-full items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Missing store location — set it in your profile so customers can
                find your store.
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {editingDrop && onDeleteDrop ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending || isSubmitting}
                onClick={() => {
                  if (window.confirm(t("merchant.sheet.deleteConfirm"))) {
                    onDeleteDrop(editingDrop.id);
                  }
                }}
                data-testid="button-delete-drop-sheet"
              >
                {deletePending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t("merchant.sheet.deleteDrop")}
              </Button>
            ) : null}
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
    </>
  );
}
