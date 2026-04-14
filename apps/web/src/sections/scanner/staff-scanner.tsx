"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  CheckCircle,
  XCircle,
  Camera,
  RefreshCw,
  Loader2,
  Gift,
  ShieldAlert,
  Store,
} from "lucide-react";
import type { Voucher, Drop } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  useStaffScannerValidateQuery,
  useStaffScannerRedeemMutation,
} from "@/hooks/api/scanner/use-scanner";
import { parseVoucherQrPayload } from "@/lib/parse-voucher-qr";
import { mapStaffScannerRedeemToLegacy } from "@/lib/nest-mappers";

type ScanResult =
  | { status: "success"; voucher: Voucher; drop: Drop }
  | { status: "invalid"; message: string }
  | { status: "already_redeemed"; voucher: Voucher }
  | null;

export default function StaffScannerPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { t } = useLanguage();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const tokenStr = token ?? "";
  const {
    data: validation,
    isLoading: validating,
    error: validationError,
  } = useStaffScannerValidateQuery(tokenStr);

  const redeemMutation = useStaffScannerRedeemMutation(tokenStr, {
    onSuccess: (data) => {
      if (data.success === false) {
        setScanResult({
          status: "invalid",
          message:
            (data.message as string) || t("scanner.invalidVoucher"),
        });
        return;
      }
      const { voucher, drop } = mapStaffScannerRedeemToLegacy(data);
      setScanResult({
        status: "success",
        voucher,
        drop,
      });
      toast({
        title: t("scanner.success"),
        description: t("scanner.redeemSuccess"),
      });
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes("already been redeemed")) {
        setScanResult({
          status: "invalid",
          message: t("scanner.alreadyRedeemed"),
        });
        return;
      }
      setScanResult({ status: "invalid", message: msg });
    },
  });

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr: any) {
        if (permErr.name === "NotAllowedError") {
          setError(t("scanner.cameraDenied"));
        } else if (permErr.name === "NotFoundError") {
          setError(t("scanner.noCamera"));
        } else {
          setError(
            `${t("scanner.cameraError")}: ${
              permErr.message || t("scanner.unknownError")
            }`
          );
        }
        setScanning(false);
        return;
      }

      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode("staff-qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText: string) => {
          html5QrCode.stop();
          setScanning(false);
          const { voucherId, magicToken } =
            parseVoucherQrPayload(decodedText);
          redeemMutation.mutate({ voucherId, magicToken });
        },
        () => {}
      );

      setScanning(true);
      setError(null);
    } catch (err: any) {
      setError(
        `${t("scanner.scannerError")}: ${
          err.message || t("scanner.couldNotStartCamera")
        }`
      );
      setScanning(false);
    }
  }, [redeemMutation]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
    }
    setScanning(false);
  }, []);

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    startScanner();
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("scanner.verifyingLink")}</p>
        </div>
      </div>
    );
  }

  if (validationError || !validation?.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                {t("scanner.invalidLink")}
              </h2>
              <p className="text-muted-foreground">
                {t("scanner.invalidLinkDesc")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h1
              className="font-bold text-foreground"
              data-testid="text-business-name"
            >
              {validation.businessName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("scanner.staffTitle")}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {scanResult ? (
          <div className="space-y-6">
            {scanResult.status === "success" && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    <h2
                      className="text-3xl font-bold text-green-500 mb-2"
                      data-testid="text-scan-success"
                    >
                      {t("scanner.success")}
                    </h2>
                    <p className="text-lg text-foreground mb-4">
                      {t("scanner.redeemSuccess")}
                    </p>
                    <div className="bg-card rounded-lg p-4 mb-4 border border-border">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-muted-foreground">
                          {t("voucher.reward")}
                        </span>
                        <Badge className="bg-teal text-teal-foreground">
                          {scanResult.drop.rewardValue}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-muted-foreground">
                          {t("voucher.dropName")}
                        </span>
                        <span className="font-medium">
                          {scanResult.drop.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          {t("voucher.voucherId")}
                        </span>
                        <span className="font-mono text-sm">
                          {scanResult.voucher.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    {scanResult.drop.termsAndConditions?.trim() ? (
                      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-left">
                        <p className="text-xs font-semibold text-foreground mb-1">
                          {t("voucher.termsTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {scanResult.drop.termsAndConditions}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {scanResult.status === "already_redeemed" && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-6">
                      <Gift className="w-12 h-12 text-white" />
                    </div>
                    <h2
                      className="text-3xl font-bold text-amber-500 mb-2"
                      data-testid="text-already-redeemed"
                    >
                      {t("scanner.alreadyRedeemed")}
                    </h2>
                    <p className="text-lg text-foreground mb-4">
                      {t("scanner.alreadyUsed")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {scanResult.status === "invalid" && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
                      <XCircle className="w-12 h-12 text-white" />
                    </div>
                    <h2
                      className="text-3xl font-bold text-red-500 mb-2"
                      data-testid="text-scan-invalid"
                    >
                      {t("scanner.invalid")}
                    </h2>
                    <p className="text-lg text-foreground mb-4">
                      {scanResult.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={resetScanner}
              className="w-full gap-2"
              data-testid="button-scan-another"
            >
              <RefreshCw className="w-4 h-4" />
              {t("scanner.scanAnother")}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  {t("scanner.scanCustomerQr")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={scannerRef}
                  className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-primary/30"
                >
                  <div id="staff-qr-reader" className="w-full h-full" />

                  {!scanning && !error && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
                      <QrCode className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center mb-4">
                        {t("scanner.tapToStart")}
                      </p>
                      <Button
                        onClick={startScanner}
                        className="gap-2"
                        data-testid="button-start-staff-scan"
                      >
                        <Camera className="w-4 h-4" />
                        {t("scanner.startScanner")}
                      </Button>
                    </div>
                  )}

                  {scanning && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-teal rounded-tl-lg" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-teal rounded-tr-lg" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-teal rounded-bl-lg" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-teal rounded-br-lg" />
                    </div>
                  )}

                  {redeemMutation.isPending && (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-white">{t("scanner.verifying")}</p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                    <p className="text-red-500">{error}</p>
                    <Button
                      variant="outline"
                      onClick={startScanner}
                      className="mt-2"
                      data-testid="button-retry-staff-scan"
                    >
                      {t("scanner.tryAgain")}
                    </Button>
                  </div>
                )}

                {scanning && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {t("scanner.scannerActive")}
                    </p>
                    <Button
                      variant="ghost"
                      onClick={stopScanner}
                      className="mt-2"
                      data-testid="button-stop-staff-scan"
                    >
                      {t("scanner.stopScanner")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">{t("scanner.howToScan")}</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      1
                    </span>
                    {t("scanner.step1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      2
                    </span>
                    {t("scanner.step2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      3
                    </span>
                    {t("scanner.step3")}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      4
                    </span>
                    {t("scanner.step4")}
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
