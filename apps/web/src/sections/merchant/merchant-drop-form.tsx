"use client";

import type {
  SubmitErrorHandler,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";
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
} from "lucide-react";
import { MapPickerLazy } from "@/components/map-picker-lazy";
import { DatetimePicker } from "@/components/datetime-picker";
import { GooglePlacesAutocomplete } from "@/components/google-places-autocomplete";
import type { CreateDropForm } from "./create-drop-schema";

export const MERCHANT_DROP_FORM_ID = "merchant-drop-form";

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
}: MerchantDropFormProps) {
  const redemptionType = form.watch("redemptionType");
  const availabilityType = form.watch("availabilityType");

  return (
    <form
      id={MERCHANT_DROP_FORM_ID}
      onSubmit={form.handleSubmit(onSubmitValid, onSubmitInvalid)}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Drop Name</Label>
        <Input
          id="name"
          placeholder="e.g., Golden Cup Challenge"
          maxLength={100}
          {...form.register("name")}
          data-testid="input-drop-name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what users will find..."
          maxLength={250}
          {...form.register("description")}
          data-testid="input-drop-description"
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rewardValue">Reward Value</Label>
        <Input
          id="rewardValue"
          placeholder="e.g., 50% OFF, Free Coffee"
          maxLength={50}
          {...form.register("rewardValue")}
          data-testid="input-drop-reward"
        />
        {form.formState.errors.rewardValue && (
          <p className="text-sm text-destructive">
            {form.formState.errors.rewardValue.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl" className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Merchant Logo (Optional)
        </Label>
        <div className="flex gap-2">
          <Input
            id="logoUrl"
            placeholder="https://example.com/your-logo.png"
            {...form.register("logoUrl")}
            data-testid="input-drop-logo"
            className="flex-1"
          />
          <label
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
            data-testid="button-upload-logo"
          >
            {isUploadingLogo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <input
              type="file"
              accept="image/*"
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
        </div>
        <p className="text-xs text-muted-foreground">
          Click upload icon to select an image, or paste a URL
        </p>
        {form.watch("logoUrl") &&
          (form.watch("logoUrl")?.startsWith("http") ||
            form.watch("logoUrl")?.startsWith("/objects/")) && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <img
                src={form.watch("logoUrl")}
                alt=""
                className="w-8 h-8 object-cover rounded"
              />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {form.watch("logoUrl")}
              </span>
            </div>
          )}
        {form.formState.errors.logoUrl && (
          <p className="text-sm text-destructive">
            {form.formState.errors.logoUrl.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...form.register("latitude")}
            data-testid="input-drop-latitude"
          />
          {form.formState.errors.latitude && (
            <p className="text-sm text-destructive">
              Valid latitude required (-90 to 90)
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...form.register("longitude")}
            data-testid="input-drop-longitude"
          />
          {form.formState.errors.longitude && (
            <p className="text-sm text-destructive">
              Valid longitude required (-180 to 180)
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
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
        <Button
          type="button"
          variant="outline"
          onClick={onOpenArPlacer}
          data-testid="button-ar-placement"
        >
          <Camera className="w-4 h-4 mr-2" />
          AR Placement
        </Button>
      </div>

      <GooglePlacesAutocomplete
        apiKey={googleMapsApiKey}
        onPlaceSelect={(lat, lng) => {
          form.setValue("latitude", parseFloat(lat.toFixed(6)));
          form.setValue("longitude", parseFloat(lng.toFixed(6)));
        }}
        label="Find address (Google)"
        placeholder="Type an address to move the pin…"
      />

      <MapPickerLazy
        remountKey={mapPickerRemountKey}
        latitude={form.watch("latitude") || 24.7136}
        longitude={form.watch("longitude") || 46.6753}
        onLocationChange={(lat, lng) => {
          form.setValue("latitude", parseFloat(lat.toFixed(6)));
          form.setValue("longitude", parseFloat(lng.toFixed(6)));
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="radius">Claim Radius (meters)</Label>
        <Input
          id="radius"
          type="number"
          min={5}
          max={200}
          {...form.register("radius")}
          data-testid="input-drop-radius"
        />
        {form.formState.errors.radius && (
          <p className="text-sm text-destructive">
            {form.formState.errors.radius.message ??
              "Radius must be between 5 and 200 meters"}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          Redemption Rules
        </Label>
        <Select
          value={form.watch("redemptionType")}
          onValueChange={(value: "anytime" | "timer" | "window") =>
            form.setValue("redemptionType", value)
          }
        >
          <SelectTrigger data-testid="select-redemption-type">
            <SelectValue placeholder="Select redemption type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anytime">Anytime (within drop dates)</SelectItem>
            <SelectItem value="timer">Timed (short countdown)</SelectItem>
            <SelectItem value="window">
              Redemption Window (hours/days)
            </SelectItem>
          </SelectContent>
        </Select>
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
          >
            <SelectTrigger data-testid="select-redemption-minutes">
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
          />
          <p className="text-xs text-muted-foreground">
            All vouchers must be redeemed by this date and time
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="availabilityType" className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          Availability Type
        </Label>
        <Select
          value={form.watch("availabilityType")}
          onValueChange={(value: "unlimited" | "captureLimit") => {
            form.setValue("availabilityType", value);
            if (value !== "captureLimit") {
              form.setValue("captureLimit", undefined);
              form.clearErrors("captureLimit");
            }
          }}
        >
          <SelectTrigger data-testid="select-availability-type">
            <SelectValue placeholder="Select availability type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unlimited">Unlimited</SelectItem>
            <SelectItem value="captureLimit">Capture Limit</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {availabilityType === "unlimited" &&
            "Anyone can claim this drop at any time"}
          {availabilityType === "captureLimit" &&
            "Limited number of users can claim this drop"}
        </p>
      </div>

      {availabilityType === "captureLimit" && (
        <div className="space-y-2">
          <Label htmlFor="captureLimit">Maximum Captures</Label>
          <Input
            id="captureLimit"
            type="number"
            min="1"
            placeholder="Enter limit"
            {...form.register("captureLimit", { valueAsNumber: true })}
            data-testid="input-capture-limit"
          />
        </div>
      )}

      <div className="space-y-4 border-t pt-4">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Calendar className="w-4 h-4" />
          Drop Schedule (Optional)
        </Label>
        <p className="text-xs text-muted-foreground">
          Set when this drop becomes available and expires. Leave empty for no
          time restrictions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatetimePicker
            label="Start Date/Time"
            id="startTime"
            value={form.watch("startTime") || ""}
            onChange={(v) => form.setValue("startTime", v)}
            data-testid="input-start-time"
          />
          <DatetimePicker
            label="End Date/Time"
            id="endTime"
            value={form.watch("endTime") || ""}
            onChange={(v) => form.setValue("endTime", v)}
            data-testid="input-end-time"
          />
        </div>
      </div>

    </form>
  );
}
