"use client";

import { useEffect, useMemo, useState } from "react";
import { startOfDay, max } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import type {
  Resolver,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Image as ImageIcon,
  Upload,
  Loader2,
  Camera,
  Timer,
  Target,
  Calendar,
  Info,
  Lock,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPickerLazy } from "@/components/map-picker-lazy";
import { DatetimePicker } from "@/components/datetime-picker";
import { GooglePlacesAutocomplete } from "@/components/google-places-autocomplete";
import {
  createDropSchema,
  DROP_LOCATION_REQUIRED_MESSAGE_EN,
  getCreateDropEmptyValues,
  type CreateDropForm,
} from "./create-drop-schema";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-validation";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { isValidMapPosition } from "@/components/map-picker";

export const MERCHANT_DROP_FORM_ID = "merchant-drop-form";

const DROP_MAP_DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 } as const;

export function useMerchantDropForm(): UseFormReturn<CreateDropForm> {
  return useForm<CreateDropForm>({
    resolver: zodResolver(
      createDropSchema as never
    ) as Resolver<CreateDropForm, unknown, CreateDropForm>,
    defaultValues: getCreateDropEmptyValues(),
  });
}

function FieldTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Info"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function parseFormScheduleDate(isoOrLocal: string): Date | undefined {
  if (!isoOrLocal?.trim()) return undefined;
  const d = new Date(isoOrLocal);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface MerchantDropFormProps {
  form: UseFormReturn<CreateDropForm>;
  mapPickerRemountKey: number;
  isUploadingLogo: boolean;
  isGettingLocation: boolean;
  googleMapsApiKey: string | undefined;
  onLogoFile: (file: File) => void;
  onUseCurrentLocation: () => void;
  onOpenArPlacer: () => void;
  onSubmitValid: SubmitHandler<CreateDropForm>;
  onSubmitInvalid?: SubmitErrorHandler<CreateDropForm>;
  captureCount?: number;
  originalAvailabilityType?: "unlimited" | "captureLimit";
  originalCaptureLimit?: number;
  isEditingDrop?: boolean;
  originalDropStartTimeIso?: string;
}

export function MerchantDropForm({
  form,
  mapPickerRemountKey,
  isUploadingLogo,
  isGettingLocation,
  googleMapsApiKey,
  onLogoFile,
  onUseCurrentLocation,
  onOpenArPlacer,
  onSubmitValid,
  onSubmitInvalid,
  captureCount = 0,
  originalAvailabilityType,
  originalCaptureLimit,
  isEditingDrop = false,
  originalDropStartTimeIso,
}: MerchantDropFormProps) {
  const { t } = useLanguage();
  const [selectedAddress, setSelectedAddress] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);

  useEffect(() => {
    setSelectedAddress(null);
  }, [mapPickerRemountKey]);

  const redemptionType = form.watch("redemptionType");
  const availabilityTypeRaw = form.watch("availabilityType");
  const startTimeValue = form.watch("startTime");
  const hasClaims = captureCount > 0;
  const lockToUnlimitedOnly =
    hasClaims && originalAvailabilityType === "unlimited";
  const minCaptureLimit =
    hasClaims && originalAvailabilityType === "captureLimit"
      ? Math.max(originalCaptureLimit ?? 0, captureCount)
      : 1;
  const availabilitySelectValue =
    availabilityTypeRaw === "captureLimit" ? "captureLimit" : "unlimited";
  const err = form.formState.errors;
  const logoUrl = form.watch("logoUrl");
  const latitudeWatch = form.watch("latitude");
  const longitudeWatch = form.watch("longitude");
  const hasDropPin = isValidMapPosition(latitudeWatch, longitudeWatch);
  const addressMatchesPin =
    !!selectedAddress &&
    typeof latitudeWatch === "number" &&
    typeof longitudeWatch === "number" &&
    Math.abs(selectedAddress.lat - latitudeWatch) < 1e-4 &&
    Math.abs(selectedAddress.lng - longitudeWatch) < 1e-4;
  const formattedCoords =
    typeof latitudeWatch === "number" && typeof longitudeWatch === "number"
      ? `${latitudeWatch.toFixed(6)}, ${longitudeWatch.toFixed(6)}`
      : "";

  const scheduleDayMin = useMemo(() => {
    const todayStart = startOfDay(new Date());
    if (!isEditingDrop || !originalDropStartTimeIso?.trim()) {
      return todayStart;
    }
    const original = new Date(originalDropStartTimeIso);
    if (Number.isNaN(original.getTime())) {
      return todayStart;
    }
    return startOfDay(original);
  }, [isEditingDrop, originalDropStartTimeIso]);

  const endScheduleDayMin = useMemo(() => {
    const startParsed = parseFormScheduleDate(startTimeValue || "");
    if (!startParsed) {
      return scheduleDayMin;
    }
    return max([scheduleDayMin, startOfDay(startParsed)]);
  }, [scheduleDayMin, startTimeValue]);

  const scheduleDisabledBefore = useMemo(
    () => ({ before: scheduleDayMin }),
    [scheduleDayMin]
  );
  const endScheduleDisabledBefore = useMemo(
    () => ({ before: endScheduleDayMin }),
    [endScheduleDayMin]
  );

  return (
    <form
      id={MERCHANT_DROP_FORM_ID}
      onSubmit={form.handleSubmit(onSubmitValid, onSubmitInvalid)}
      className="space-y-4"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="name">Drop Name</Label>
          <FieldTip text={t("merchant.form.tooltip.name")} />
        </div>
        <Input
          id="name"
          placeholder="e.g., Golden Cup Challenge"
          maxLength={100}
          className={cn(err.name && "border-destructive")}
          {...form.register("name")}
          data-testid="input-drop-name"
        />
        {err.name && (
          <p className="text-sm text-destructive">{err.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="description">Description</Label>
          <FieldTip text={t("merchant.form.tooltip.description")} />
        </div>
        <Textarea
          id="description"
          placeholder="Describe what users will find..."
          maxLength={250}
          className={cn(err.description && "border-destructive")}
          {...form.register("description")}
          data-testid="input-drop-description"
        />
        {err.description && (
          <p className="text-sm text-destructive">{err.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="rewardValue">Reward Value</Label>
          <FieldTip text={t("merchant.form.tooltip.reward")} />
        </div>
        <Input
          id="rewardValue"
          placeholder="e.g., 50% OFF"
          maxLength={20}
          className={cn(err.rewardValue && "border-destructive")}
          {...form.register("rewardValue")}
          data-testid="input-drop-reward"
        />
        {err.rewardValue && (
          <p className="text-sm text-destructive">{err.rewardValue.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Drop Card (Optional)
          </Label>
          <FieldTip text={t("merchant.form.tooltip.logo")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer gap-2 text-sm"
            data-testid="button-upload-logo"
          >
            {isUploadingLogo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload image
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLogoFile(file);
                e.target.value = "";
              }}
              className="sr-only"
              disabled={isUploadingLogo}
              data-testid="input-logo-file"
            />
          </label>
          {logoUrl?.startsWith("http") ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                form.setValue("logoUrl", "");
                form.clearErrors("logoUrl");
              }}
            >
              {t("merchant.form.logo.remove")}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("merchant.form.logo.uploadHint")}
        </p>
        {logoUrl?.startsWith("http") ? (
          <div className="flex items-center gap-2 p-2 bg-muted rounded w-fit">
            <img
              src={logoUrl}
              alt=""
              className="w-10 h-10 object-cover rounded"
            />
          </div>
        ) : null}
        {err.logoUrl && (
          <p className="text-sm text-destructive">{err.logoUrl.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t("merchant.form.location.sectionTitle")}
          </h3>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-md border border-border/80 bg-muted/15 p-3 md:rounded-e-none md:border-e-0">
          <p className="text-sm font-medium text-foreground">
            {t("merchant.form.location.searchTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("merchant.form.location.searchDesc")}
          </p>
          <GooglePlacesAutocomplete
            apiKey={googleMapsApiKey}
            onPlaceSelect={(lat, lng, address) => {
              const lat6 = parseFloat(lat.toFixed(6));
              const lng6 = parseFloat(lng.toFixed(6));
              form.setValue("latitude", lat6);
              form.setValue("longitude", lng6);
              form.clearErrors(["latitude", "longitude"]);
              const trimmed = (address ?? "").trim();
              setSelectedAddress(
                trimmed ? { lat: lat6, lng: lng6, address: trimmed } : null
              );
            }}
            label={t("merchant.form.location.searchInputLabel")}
            placeholder="Type an address to move the pin…"
          />
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 py-2">
          <Separator className="flex-1" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("merchant.form.location.or")}
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="flex flex-col gap-0 md:flex-row md:items-stretch md:gap-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-md border border-border/80 bg-muted/15 p-3 md:rounded-e-none md:border-e-0">
            <p className="text-sm font-medium text-foreground">
              {t("merchant.form.location.gpsTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("merchant.form.location.gpsDesc")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={onUseCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Use My GPS
                </>
              )}
            </Button>
          </div>

          <div className="flex shrink-0 items-center py-2 md:w-11 md:flex-col md:justify-center md:bg-muted/10 md:py-0">
            <div className="flex w-full items-center gap-2 md:hidden">
              <Separator className="flex-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("merchant.form.location.or")}
              </span>
              <Separator className="flex-1" />
            </div>
            <div className="relative hidden h-full min-h-[5.5rem] w-full md:flex md:flex-col md:items-center md:justify-center">
              <Separator
                orientation="vertical"
                className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2"
              />
              <span className="relative z-[1] bg-background px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("merchant.form.location.or")}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-md border border-border/80 bg-muted/15 p-3 md:rounded-s-none md:border-s-0">
            <p className="text-sm font-medium text-foreground">
              {t("merchant.form.location.arTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("merchant.form.location.arDesc")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={onOpenArPlacer}
              data-testid="button-ar-placement"
            >
              <Camera className="w-4 h-4 mr-2" />
              AR Placement
            </Button>
          </div>
        </div>
      </div>

      {hasDropPin && (
        <div
          className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2"
          role="status"
          data-testid="drop-location-summary"
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {addressMatchesPin
                ? t("merchant.form.location.pinnedAddressLabel")
                : t("merchant.form.location.pinnedCoordsLabel")}
            </p>
            {addressMatchesPin ? (
              <>
                <p
                  className="break-words text-sm text-foreground"
                  data-testid="drop-location-address"
                >
                  {selectedAddress!.address}
                </p>
                {/* {formattedCoords && (
                  <p className="text-xs text-muted-foreground">
                    {formattedCoords}
                  </p>
                )} */}
              </>
            ) : (
              <>
                <p
                  className="break-words text-sm text-foreground"
                  data-testid="drop-location-coords"
                >
                  {formattedCoords}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("merchant.form.location.pinnedNoAddress")}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="radius">Claim Radius (meters)</Label>
          <FieldTip text={t("merchant.form.tooltip.radius")} />
        </div>
        <Controller
          control={form.control}
          name="radius"
          render={({ field, fieldState }) => {
            const n = field.value;
            const display =
              typeof n === "number" && Number.isFinite(n) ? String(n) : "";
            return (
              <>
                <Input
                  id="radius"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                  value={display}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4);
                    if (digits === "") {
                      field.onChange("");
                      return;
                    }
                    field.onChange(Number(digits));
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className={cn(fieldState.error && "border-destructive")}
                  data-testid="input-drop-radius"
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            );
          }}
        />
      </div>

      <div
        className={cn(
          err.latitude &&
            "rounded-md ring-2 ring-destructive ring-offset-2 ring-offset-background"
        )}
      >
        <MapPickerLazy
          remountKey={mapPickerRemountKey}
          apiKey={googleMapsApiKey}
          latitude={hasDropPin ? latitudeWatch : undefined}
          longitude={hasDropPin ? longitudeWatch : undefined}
          defaultCenter={DROP_MAP_DEFAULT_CENTER}
          radiusMeters={Number(form.watch("radius")) || 15}
          onLocationChange={(lat, lng) => {
            form.setValue("latitude", parseFloat(lat.toFixed(6)));
            form.setValue("longitude", parseFloat(lng.toFixed(6)));
            form.clearErrors(["latitude", "longitude"]);
            setSelectedAddress(null);
          }}
        />
      </div>
      {err.latitude && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="drop-map-location-error"
        >
          {err.latitude.message === DROP_LOCATION_REQUIRED_MESSAGE_EN
            ? t("merchant.form.location.mapBelowError")
            : err.latitude.message}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Redemption Rules
          </Label>
          <FieldTip text={t("merchant.form.tooltip.redemption")} />
        </div>
        <Controller
          control={form.control}
          name="redemptionType"
          render={({ field, fieldState }) => (
            <>
              <Select
                value={field.value}
                onValueChange={(value: "anytime" | "timer" | "window") => {
                  field.onChange(value);
                  form.clearErrors("redemptionType");
                }}
                disabled={hasClaims}
              >
                <SelectTrigger
                  className={cn(fieldState.error && "border-destructive")}
                  data-testid="select-redemption-type"
                  disabled={hasClaims}
                >
                  <SelectValue placeholder="Select redemption type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">
                    Anytime (within drop dates)
                  </SelectItem>
                  <SelectItem value="timer">Timed (short countdown)</SelectItem>
                  <SelectItem value="window">
                    Redemption Window (hours/days)
                  </SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
        {hasClaims && (
          <div
            className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
            role="status"
          >
            <Lock
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden
            />
            <p className="min-w-0 text-sm leading-snug text-foreground">
              <span className="font-medium text-amber-950 dark:text-amber-100">
                Redemption rules are locked.{" "}
              </span>
              {captureCount} voucher{captureCount === 1 ? " has" : "s have"}{" "}
              already been claimed, so this field cannot be edited.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {redemptionType === "anytime" &&
            "Users can redeem anytime within the drop's start and end dates"}
          {redemptionType === "timer" &&
            "Users must redeem within minutes of claiming (creates urgency)"}
          {redemptionType === "window" &&
            "Users have a set number of hours/days after claiming to redeem"}
        </p>
      </div>

      {redemptionType === "timer" && (
        <div className="space-y-2">
          <Label htmlFor="redemptionMinutes">Redemption Time Limit</Label>
          <Select
            value={String(form.watch("redemptionMinutes") || 30)}
            onValueChange={(value) =>
              form.setValue("redemptionMinutes", Number(value))
            }
            disabled={hasClaims}
          >
            <SelectTrigger
              data-testid="select-redemption-minutes"
              disabled={hasClaims}
            >
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {redemptionType === "window" && (
        <div className="space-y-2">
          <DatetimePicker
            label="Redemption Deadline"
            id="redemptionDeadline"
            value={form.watch("redemptionDeadline") || ""}
            onChange={(v) => form.setValue("redemptionDeadline", v)}
            data-testid="input-redemption-deadline"
            disabled={hasClaims}
            disabledDays={scheduleDisabledBefore}
            defaultMonth={scheduleDayMin}
          />
          <p className="text-xs text-muted-foreground">
            {t("merchant.form.datetime.localInputNote")}
          </p>
          <p className="text-xs text-muted-foreground">
            All vouchers must be redeemed by this date and time
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="availabilityType" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Availability Type
          </Label>
          <FieldTip text={t("merchant.form.tooltip.availability")} />
        </div>
        <Controller
          control={form.control}
          name="availabilityType"
          render={({ field, fieldState }) => (
            <>
              <Select
                value={
                  field.value === "captureLimit" ? "captureLimit" : "unlimited"
                }
                onValueChange={(value: "unlimited" | "captureLimit") => {
                  field.onChange(value);
                  if (value !== "captureLimit") {
                    form.setValue("captureLimit", undefined);
                    form.clearErrors("captureLimit");
                  }
                  form.clearErrors("availabilityType");
                }}
              >
                <SelectTrigger
                  className={cn(fieldState.error && "border-destructive")}
                  data-testid="select-availability-type"
                >
                  <SelectValue placeholder="Select availability type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem
                    value="captureLimit"
                    disabled={lockToUnlimitedOnly}
                  >
                    Capture Limit
                  </SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
        <p className="text-xs text-muted-foreground">
          {availabilitySelectValue === "unlimited" &&
            "No cap on the number of people to claim"}
          {availabilitySelectValue === "captureLimit" &&
            "Limited number of users can claim this drop"}
        </p>
        {hasClaims && originalAvailabilityType === "captureLimit" && (
          <p className="text-xs text-muted-foreground">
            {captureCount} claimed. You can only increase the capture limit or
            switch to Unlimited.
          </p>
        )}
        {lockToUnlimitedOnly && (
          <p className="text-xs text-muted-foreground">
            Cannot switch to Capture Limit after vouchers have been claimed.
          </p>
        )}
      </div>

      {availabilitySelectValue === "captureLimit" && (
        <div className="space-y-2">
          <Label htmlFor="captureLimit">Maximum Captures</Label>
          <Input
            id="captureLimit"
            type="number"
            min={minCaptureLimit}
            max={99999}
            placeholder="Enter limit"
            className={cn(err.captureLimit && "border-destructive")}
            {...form.register("captureLimit")}
            data-testid="input-capture-limit"
          />
          {err.captureLimit && (
            <p className="text-sm text-destructive">
              {err.captureLimit.message as string}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="termsAndConditions">
            {t("merchant.form.terms.label")}
          </Label>
          <FieldTip text={t("merchant.form.tooltip.terms")} />
        </div>
        <Textarea
          id="termsAndConditions"
          placeholder={t("merchant.form.terms.placeholder")}
          maxLength={300}
          rows={4}
          className={cn(err.termsAndConditions && "border-destructive")}
          {...form.register("termsAndConditions")}
          data-testid="input-drop-terms"
        />
        {err.termsAndConditions && (
          <p className="text-sm text-destructive">
            {err.termsAndConditions.message}
          </p>
        )}
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Calendar className="w-4 h-4" />
            Drop Schedule (Optional)
          </Label>
          <FieldTip text={t("merchant.form.tooltip.schedule")} />
        </div>
        <p className="text-xs text-muted-foreground">
          Set when this drop becomes available and expires. Leave empty for no
          time restrictions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Date/Time</Label>
            <div className="flex gap-2 items-center">
              <div className="min-w-0 flex-1">
                <DatetimePicker
                  showLabel={false}
                  label="Start Date/Time"
                  id="startTime"
                  value={form.watch("startTime") || ""}
                  onChange={(v) => form.setValue("startTime", v)}
                  data-testid="input-start-time"
                  disabledDays={scheduleDisabledBefore}
                  defaultMonth={scheduleDayMin}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={t("merchant.form.schedule.clearStart")}
                    onClick={() => {
                      form.setValue("startTime", "");
                      form.clearErrors("startTime");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t("merchant.form.schedule.clearStart")}
                </TooltipContent>
              </Tooltip>
            </div>
            {err.startTime && (
              <p className="text-sm text-destructive">
                {err.startTime.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Date/Time</Label>
            <div className="flex gap-2 items-center">
              <div className="min-w-0 flex-1">
                <DatetimePicker
                  showLabel={false}
                  label="End Date/Time"
                  id="endTime"
                  value={form.watch("endTime") || ""}
                  onChange={(v) => form.setValue("endTime", v)}
                  data-testid="input-end-time"
                  disabledDays={endScheduleDisabledBefore}
                  defaultMonth={endScheduleDayMin}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={t("merchant.form.schedule.clearEnd")}
                    onClick={() => {
                      form.setValue("endTime", "");
                      form.clearErrors("endTime");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t("merchant.form.schedule.clearEnd")}
                </TooltipContent>
              </Tooltip>
            </div>
            {err.endTime && (
              <p className="text-sm text-destructive">{err.endTime.message}</p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
