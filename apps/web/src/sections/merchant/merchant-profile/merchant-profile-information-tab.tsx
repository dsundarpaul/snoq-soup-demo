"use client";

import { Button } from "@/components/ui/button";
import { Upload, Camera, Copy } from "lucide-react";
import type { Merchant } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import { merchantQueryKeys } from "@/hooks/api/merchant/use-merchant";
import { publicUrls } from "@/lib/app-config";
import { useToast } from "@/hooks/use-toast";
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

export interface MerchantProfileInformationTabProps {
  merchant: Merchant | undefined;
}

export function MerchantProfileInformationTab({
  merchant,
}: MerchantProfileInformationTabProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your business identity on Souq-Snap</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <span className="text-muted-foreground">Business: </span>
            <span>{merchant?.businessName ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Username: </span>
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
                      const uploadPath = "/api/v1/s3/upload";
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("namespace", "merchants");
                      const uploadRes = await apiFetchMaybeRetry(
                        "POST",
                        uploadPath,
                        { auth: "merchant", body: formData, json: false }
                      );
                      await throwIfResNotOk(uploadRes, uploadPath, "merchant");
                      const { publicUrl: logoUrl } =
                        (await uploadRes.json()) as { publicUrl: string };
                      const logoPath = "/api/v1/merchants/me/logo";
                      const saveRes = await apiFetchMaybeRetry(
                        "PATCH",
                        logoPath,
                        {
                          auth: "merchant",
                          body: { logoUrl },
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
    </div>
  );
}
