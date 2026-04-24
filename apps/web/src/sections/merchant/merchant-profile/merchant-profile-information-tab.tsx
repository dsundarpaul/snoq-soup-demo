"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Camera,
  Copy,
  MapPin,
  AlertTriangle,
  Phone,
  Clock,
  Loader2,
  Check,
} from "lucide-react";
import type { Merchant } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { APP_NAME } from "@/lib/app-brand";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import {
  merchantQueryKeys,
  useMerchantProfileMutation,
} from "@/hooks/api/merchant/use-merchant";
import { publicUrls } from "@/lib/app-config";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import {
  validateImageFile,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/upload-validation";
import { StaffScannerLink } from "@/sections/merchant/staff-scanner-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MerchantStoreLocationSheet } from "./merchant-store-location-sheet";
import {
  PHONE_DIAL_CODE_CHOICES,
  getHunterNationalNumberBounds,
  hunterMobileLengthHint,
} from "@/lib/hunter-phone-bounds";

function parsePhoneToDialAndNational(
  phone: string | null | undefined
): { dial: string; national: string } {
  if (!phone) return { dial: "+966", national: "" };
  const cleaned = phone.replace(/[\s\-()]/g, "");
  for (const code of PHONE_DIAL_CODE_CHOICES) {
    if (cleaned.startsWith(code)) {
      return { dial: code, national: cleaned.slice(code.length) };
    }
  }
  if (cleaned.startsWith("+")) {
    return { dial: "+966", national: cleaned };
  }
  return { dial: "+966", national: cleaned };
}

export interface MerchantProfileInformationTabProps {
  merchant: Merchant | undefined;
}

export function MerchantProfileInformationTab({
  merchant,
}: MerchantProfileInformationTabProps) {
  const { toast } = useToast();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const hasStoreLocation = Boolean(merchant?.storeLocation?.lat);

  const [editingContact, setEditingContact] = useState(false);
  const parsedPhone = parsePhoneToDialAndNational(merchant?.businessPhone);
  const [phoneDialCode, setPhoneDialCode] = useState(parsedPhone.dial);
  const [phoneNational, setPhoneNational] = useState(parsedPhone.national);
  const [businessHours, setBusinessHours] = useState(
    merchant?.businessHours ?? ""
  );

  const phoneBounds = getHunterNationalNumberBounds(phoneDialCode);
  const phoneValid =
    phoneNational.length >= phoneBounds.min &&
    phoneNational.length <= phoneBounds.max;

  const profileMutation = useMerchantProfileMutation({
    onSuccess: () => {
      toast({ title: "Business info saved!" });
      setEditingContact(false);
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const logoUploader = useUpload({
    namespace: "merchants",
    auth: "merchant",
  });

  return (
    <div className="space-y-6 max-w-2xl">
      {!hasStoreLocation && merchant && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Complete your onboarding</p>
              <p className="text-xs text-muted-foreground">
                Set your store location so customers can find you after claiming
                a voucher.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => setLocationSheetOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              Set location
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Your business identity on {APP_NAME}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <span className="text-muted-foreground">Business: </span>
            <span>{merchant?.businessName ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Company slug: </span>
            <span className="font-mono">@{merchant?.username ?? "—"}</span>
          </div>
          {merchant?.email && (
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span>{merchant.email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business logo</CardTitle>
          <CardDescription>
            This logo appears on your store page and drops.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {merchant?.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt="Business logo"
                className="w-16 h-16 object-cover rounded-lg border"
                data-testid="img-merchant-logo-preview"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border">
                <Camera className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <label className="cursor-pointer inline-block">
                <Button size="sm" variant="outline" asChild>
                  <span>
                    <Upload className="w-3 h-3 mr-1" />
                    {merchant?.logoUrl ? "Change logo" : "Upload logo"}
                  </span>
                </Button>
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  className="hidden"
                  data-testid="input-merchant-logo-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const check = validateImageFile(file);
                    if (!check.valid) {
                      toast({ title: check.message, variant: "destructive" });
                      e.target.value = "";
                      return;
                    }
                    try {
                      toast({ title: "Uploading…" });
                      const result = await logoUploader.uploadFile(file);
                      if (!result) {
                        toast({
                          title: "Upload failed",
                          description: logoUploader.error?.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      const logoPath = "/api/v1/merchants/me/logo";
                      const saveRes = await apiFetchMaybeRetry(
                        "PATCH",
                        logoPath,
                        {
                          auth: "merchant",
                          body: { logoUrl: result.publicUrl },
                        }
                      );
                      await throwIfResNotOk(saveRes, logoPath, "merchant");
                      queryClient.invalidateQueries({
                        queryKey: merchantQueryKeys.me,
                      });
                      toast({ title: "Logo updated!" });
                    } catch {
                      toast({
                        title: "Upload failed",
                        variant: "destructive",
                      });
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared staff scanner link</CardTitle>
          <CardDescription>
            One link for your team: staff open it on a device to scan customer
            voucher QR codes without logging into this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffScannerLink />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store location</CardTitle>
          <CardDescription>
            Your physical store location shown to customers on claimed vouchers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasStoreLocation ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {merchant!.storeLocation!.lat.toFixed(4)},{" "}
                  {merchant!.storeLocation!.lng.toFixed(4)}
                </Badge>
              </div>
              {merchant!.storeLocation!.address && (
                <p className="text-sm text-muted-foreground">
                  {merchant!.storeLocation!.address}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setLocationSheetOpen(true)}
              >
                <MapPin className="h-3.5 w-3.5" />
                Update location
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setLocationSheetOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              Set store location
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business contact</CardTitle>
          <CardDescription>
            Phone number and operating hours displayed on claimed vouchers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editingContact ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Business phone</Label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={phoneDialCode}
                    onValueChange={(v) => {
                      setPhoneDialCode(v);
                      setPhoneNational("");
                    }}
                  >
                    <SelectTrigger className="h-10 w-[118px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {PHONE_DIAL_CODE_CHOICES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder={`Phone (${hunterMobileLengthHint(phoneBounds)})`}
                    value={phoneNational}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setPhoneNational(digits.slice(0, phoneBounds.max));
                    }}
                    className="flex-1"
                  />
                </div>
                {phoneNational.length > 0 && !phoneValid && (
                  <p className="text-xs text-destructive">
                    Enter {hunterMobileLengthHint(phoneBounds)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="biz-hours">Business hours</Label>
                <Input
                  id="biz-hours"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="Sun-Thu 9AM-10PM, Fri 2PM-10PM"
                  maxLength={100}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={
                    profileMutation.isPending ||
                    (phoneNational.length > 0 && !phoneValid)
                  }
                  onClick={() => {
                    const fullPhone = phoneNational
                      ? `${phoneDialCode}${phoneNational}`
                      : undefined;
                    profileMutation.mutate({
                      businessPhone: fullPhone,
                      businessHours: businessHours.trim() || undefined,
                    });
                  }}
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingContact(false);
                    const p = parsePhoneToDialAndNational(
                      merchant?.businessPhone
                    );
                    setPhoneDialCode(p.dial);
                    setPhoneNational(p.national);
                    setBusinessHours(merchant?.businessHours ?? "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{merchant?.businessPhone || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{merchant?.businessHours || "Not set"}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 mt-1"
                onClick={() => {
                  const p = parsePhoneToDialAndNational(
                    merchant?.businessPhone
                  );
                  setPhoneDialCode(p.dial);
                  setPhoneNational(p.national);
                  setBusinessHours(merchant?.businessHours ?? "");
                  setEditingContact(true);
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {merchant?.username && (
        <Card>
          <CardHeader>
            <CardTitle>Store page link</CardTitle>
            <CardDescription>
              Share this link on social media. Customers see all your active
              rewards in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                readOnly
                value={publicUrls.store(merchant.username)}
                className="flex-1 text-sm bg-muted px-3 py-2 rounded-md border font-mono truncate"
                data-testid="input-store-link"
              />
              <Button
                size="icon"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    publicUrls.store(merchant.username)
                  );
                  toast({ title: "Store link copied!" });
                }}
                data-testid="button-copy-store-link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <MerchantStoreLocationSheet
        open={locationSheetOpen}
        onOpenChange={setLocationSheetOpen}
        currentLocation={merchant?.storeLocation}
      />
    </div>
  );
}
