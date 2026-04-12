"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trophy, MapPin, Target } from "lucide-react";
import type { CreateDropForm } from "./create-drop-schema";
import type { Drop } from "@shared/schema";

function formatPreviewCoordinates(
  latitude: unknown,
  longitude: unknown
): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "—";
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export interface MerchantDropPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<CreateDropForm>;
  editingDrop: Drop | null;
  isSubmitting: boolean;
  onPublish: () => void;
}

export function MerchantDropPreviewDialog({
  open,
  onOpenChange,
  form,
  editingDrop,
  isSubmitting,
  onPublish,
}: MerchantDropPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Drop Preview
          </DialogTitle>
          <DialogDescription>
            See how your drop will appear to treasure hunters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Home Page Card
            </h3>
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-border">
                  {form.watch("logoUrl") ? (
                    <img
                      src={form.watch("logoUrl")}
                      alt="Logo"
                      className="w-12 h-12 object-contain rounded-lg"
                    />
                  ) : (
                    <Trophy className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground truncate">
                      {form.watch("name") || "Drop Name"}
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-teal border-teal shrink-0"
                    >
                      {form.watch("rewardValue") || "Reward"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {form.watch("description") ||
                      "Description will appear here..."}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{form.watch("radius") || 15}m radius</span>
                    {form.watch("availabilityType") === "captureLimit" &&
                      form.watch("captureLimit") && (
                        <>
                          <span className="mx-1">•</span>
                          <Target className="w-3 h-3" />
                          <span>{form.watch("captureLimit")} available</span>
                        </>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              AR View (3D Coin)
            </h3>
            <div
              className="border border-border rounded-lg bg-gradient-to-b from-slate-900 to-slate-800 p-8 flex flex-col items-center justify-center min-h-[200px]"
              style={{ perspective: "500px" }}
            >
              <div
                className="relative w-28 h-28 rounded-full shadow-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, #ffd700 0%, #ffb300 50%, #ffd700 100%)",
                  boxShadow:
                    "0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.3)",
                  animation: "spin3d 3s linear infinite",
                  transformStyle: "preserve-3d",
                }}
              >
                <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                  {form.watch("logoUrl") ? (
                    <img
                      src={form.watch("logoUrl")}
                      alt="Logo"
                      className="w-16 h-16 object-contain rounded-full"
                    />
                  ) : (
                    <Trophy className="w-10 h-10 text-amber-500" />
                  )}
                </div>
              </div>
              <p className="text-white/80 text-sm mt-4 text-center">
                Floating coin as seen in AR camera view
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Redemption:</span>
              <span className="font-medium">
                {form.watch("redemptionType") === "anytime" && "Anytime"}
                {form.watch("redemptionType") === "timer" &&
                  `${form.watch("redemptionMinutes") || 30} min timer`}
                {form.watch("redemptionType") === "window" && "Fixed deadline"}
              </span>
            </div>
            {(form.watch("voucherAbsoluteExpiresAt") ||
              form.watch("voucherTtlHoursAfterClaim")) && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">
                  Voucher expiry:
                </span>
                <span className="font-medium text-right text-xs">
                  {[
                    form.watch("voucherTtlHoursAfterClaim")
                      ? `${form.watch("voucherTtlHoursAfterClaim")}h after claim`
                      : null,
                    form.watch("voucherAbsoluteExpiresAt")
                      ? `Absolute ${form.watch("voucherAbsoluteExpiresAt")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Availability:</span>
              <span className="font-medium">
                {form.watch("availabilityType") === "unlimited" && "Unlimited"}
                {form.watch("availabilityType") === "captureLimit" &&
                  `${form.watch("captureLimit") || 0} captures`}
                {form.watch("availabilityType") === "timeWindow" &&
                  "Time window"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium font-mono text-xs">
                {formatPreviewCoordinates(
                  form.watch("latitude"),
                  form.watch("longitude")
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Back to Edit
          </Button>
          <Button
            className="flex-1"
            onClick={onPublish}
            disabled={isSubmitting}
            data-testid="button-preview-publish"
          >
            {editingDrop ? "Update Drop" : "Publish Drop"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
