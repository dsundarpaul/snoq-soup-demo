"use client";

import { useEffect, useState } from "react";
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
import { MapPin, Loader2, Plus, Pencil, Eye, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { publicUrls } from "@/lib/app-config";
import { merchantQueryKeys } from "@/hooks/api/merchant/use-merchant";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import { mapNestDropToLegacy, createDropFormToNestDto } from "@/lib/nest-mappers";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/upload-validation";
import type { Drop } from "@shared/schema";
import { ARDropPlacer } from "@/components/ar-drop-placer";
import {
  formatIsoForDatetimeLocalInput,
  getCreateDropEmptyValues,
  type CreateDropForm,
} from "@/sections/merchant/create-drop-schema";
import {
  MerchantDropForm,
  MERCHANT_DROP_FORM_ID,
  useMerchantDropForm,
} from "@/sections/merchant/merchant-drop-form";
import { MerchantDropPreviewDialog } from "@/sections/merchant/merchant-drop-preview-dialog";

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

function invalidateDropRelatedQueries(): void {
  void queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
  void queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
  void queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
}

function dropToFormValues(drop: Drop): CreateDropForm {
  const redemptionTypeValue = drop.redemptionType || "anytime";
  const availabilityTypeValue = drop.availabilityType || "unlimited";
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
    redemptionDeadline: formatIsoForDatetimeLocalInput(drop.redemptionDeadline),
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
  };
}

export interface MerchantDropSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDrop: Drop | null;
}

export function MerchantDropSheet({
  open,
  onOpenChange,
  editingDrop,
}: MerchantDropSheetProps) {
  const { toast } = useToast();
  const form = useMerchantDropForm();
  const [showPreview, setShowPreview] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [arPlacerOpen, setArPlacerOpen] = useState(false);
  const [mapPickerEpoch, setMapPickerEpoch] = useState(0);

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
      invalidateDropRelatedQueries();
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
      const response = await apiRequest(
        "PATCH",
        `/api/v1/merchants/me/drops/${dropId}`,
        payload,
        { auth: "merchant" }
      );
      return response.json();
    },
    onSuccess: () => {
      invalidateDropRelatedQueries();
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
    const check = validateImageFile(file);
    if (!check.valid) {
      toast({ title: check.message, variant: "destructive" });
      return;
    }
    setIsUploadingLogo(true);
    toast({
      title: "Uploading...",
      description: "Please wait while your logo is being uploaded.",
    });
    try {
      const uploadPath = "/api/v1/s3/upload";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "drops");
      const uploadRes = await apiFetchMaybeRetry("POST", uploadPath, {
        auth: "merchant",
        body: formData,
        json: false,
      });
      await throwIfResNotOk(uploadRes, uploadPath, "merchant");
      const { publicUrl } = (await uploadRes.json()) as { publicUrl: string };
      form.setValue("logoUrl", publicUrl);
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
    </>
  );
}
