"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Copy, Check, Share2, Loader2 } from "lucide-react";
import { publicUrls } from "@/lib/app-config";
import { useToast } from "@/hooks/use-toast";
import { useMerchantScannerTokenMutation } from "@/hooks/api/scanner/use-scanner";
import {
  readStaffScannerToken,
  writeStaffScannerToken,
} from "@/utils/staff-scanner-token-storage";

export interface StaffScannerLinkProps {
  merchantId: string | undefined;
}

export function StaffScannerLink({ merchantId }: StaffScannerLinkProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setHydrated(true);
      return;
    }
    setStoredToken(readStaffScannerToken(merchantId));
    setHydrated(true);
  }, [merchantId]);

  const applyToken = useCallback(
    (token: string) => {
      if (!merchantId) return;
      writeStaffScannerToken(merchantId, token);
      setStoredToken(token);
    },
    [merchantId]
  );

  const generateMutation = useMerchantScannerTokenMutation({
    onSuccess: (data) => {
      applyToken(data.token);
      toast({
        title: "Scanner link generated",
        description: "You can now share this link with your staff.",
      });
    },
  });

  const scannerToken = storedToken;
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

  if (!merchantId || !hydrated) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

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
