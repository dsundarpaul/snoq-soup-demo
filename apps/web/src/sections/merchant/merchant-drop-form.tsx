"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type {
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
  ChevronDown,
  X,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  getCreateDropEmptyValues,
  type CreateDropForm,
} from "./create-drop-schema";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-validation";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

export const MERCHANT_DROP_FORM_ID = "merchant-drop-form";

export function useMerchantDropForm(): UseFormReturn<CreateDropForm> {
  return useForm<CreateDropForm>({
    resolver: zodResolver(createDropSchema),
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
}: MerchantDropFormProps) {
  const { t } = useLanguage();
  const [coordsOpen, setCoordsOpen] = useState(false);
  const redemptionType = form.watch("redemptionType");
  const availabilityTypeRaw = form.watch("availabilityType");
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
            onPlaceSelect={(lat, lng) => {
              form.setValue("latitude", parseFloat(lat.toFixed(6)));
              form.setValue("longitude", parseFloat(lng.toFixed(6)));
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

      <Collapsible open={coordsOpen} onOpenChange={setCoordsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-muted-foreground"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                coordsOpen && "rotate-180"
              )}
            />
            {t("merchant.form.location.advancedToggle")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                className={cn(err.latitude && "border-destructive")}
                {...form.register("latitude")}
                data-testid="input-drop-latitude"
              />
              {err.latitude && (
                <p className="text-sm text-destructive">
                  {err.latitude.message ??
                    "Valid latitude required (-90 to 90)"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                className={cn(err.longitude && "border-destructive")}
                {...form.register("longitude")}
                data-testid="input-drop-longitude"
              />
              {err.longitude && (
                <p className="text-sm text-destructive">
                  {err.longitude.message ??
                    "Valid longitude required (-180 to 180)"}
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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

      <MapPickerLazy
        remountKey={mapPickerRemountKey}
        apiKey={googleMapsApiKey}
        latitude={Number(form.watch("latitude")) || 24.7136}
        longitude={Number(form.watch("longitude")) || 46.6753}
        radiusMeters={Number(form.watch("radius")) || 15}
        onLocationChange={(lat, lng) => {
          form.setValue("latitude", parseFloat(lat.toFixed(6)));
          form.setValue("longitude", parseFloat(lng.toFixed(6)));
        }}
      />

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
          <p className="text-xs text-muted-foreground">
            Locked because {captureCount} voucher
            {captureCount === 1 ? " has" : "s have"} already been claimed.
          </p>
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
          />
          <p className="text-xs text-muted-foreground">
            {t("merchant.form.datetime.saudiIntent")}{" "}
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
                  <SelectItem value="captureLimit" disabled={lockToUnlimitedOnly}>
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
        <p className="text-xs text-muted-foreground">
          {t("merchant.form.datetime.saudiIntent")}{" "}
          {t("merchant.form.datetime.localInputNote")}
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
