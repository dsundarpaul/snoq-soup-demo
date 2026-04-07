"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Copy, Check, Share2, Loader2 } from "lucide-react";
import { publicUrls } from "@/lib/app-config";
import { useToast } from "@/hooks/use-toast";
import {
  useMerchantScannerTokenQuery,
} from "@/hooks/api/merchant/use-merchant";
import { useMerchantScannerTokenMutation } from "@/hooks/api/scanner/use-scanner";

export function StaffScannerLink() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: tokenData, isLoading } = useMerchantScannerTokenQuery();

  const generateMutation = useMerchantScannerTokenMutation({
    onSuccess: () => {
      toast({
        title: "Scanner link generated",
        description: "You can now share this link with your staff.",
      });
    },
  });

  const scannerToken =
    typeof tokenData?.token === "string" ? tokenData.token : null;

  const scannerUrl = scannerToken
    ? publicUrls.staffScan(scannerToken)
    : null;

  const handleCopy = async () => {
    if (!scannerUrl) return;
    await navigator.clipboard.writeText(scannerUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin" />;

  if (!scannerToken) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        data-testid="button-generate-scanner-link"
      >
        {generateMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <QrCode className="w-3 h-3" />
        )}
        Generate Scanner Link
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Input
          value={scannerUrl || ""}
          readOnly
          className="text-xs h-8 font-mono"
          data-testid="input-scanner-link"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="shrink-0 h-8 w-8 p-0"
          data-testid="button-copy-scanner-link"
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-xs"
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        data-testid="button-regenerate-scanner-link"
      >
        {generateMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Share2 className="w-3 h-3" />
        )}
        Regenerate Link
      </Button>
    </div>
  );
}
