"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Camera,
  RefreshCw,
  Loader2,
  Gift,
} from "lucide-react";
import type { Voucher, Drop } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { useRedeemVoucherMutation } from "@/hooks/api/voucher/use-voucher";
import { parseVoucherQrPayload } from "@/lib/parse-voucher-qr";
import { mapRedeemResultToLegacy } from "@/lib/nest-mappers";

type ScanResult =
  | { status: "success"; voucher: Voucher; drop: Drop }
  | { status: "invalid"; message: string }
  | { status: "already_redeemed"; voucher: Voucher }
  | null;

export default function ScannerPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const lastScanRef = useRef<{ voucherId: string } | null>(null);

  const redeemMutation = useRedeemVoucherMutation({
    onSuccess: (data) => {
      if (data.success === false) {
        setScanResult({
          status: "invalid",
          message:
            (data.message as string) || t("scanner.invalidVoucher"),
        });
        return;
      }
      const { voucher, drop } = mapRedeemResultToLegacy(data);
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
        const id = lastScanRef.current?.voucherId ?? "";
        setScanResult({
          status: "already_redeemed",
          voucher: { id } as Voucher,
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
        console.error("Camera permission error:", permErr);
        if (permErr.name === "NotAllowedError") {
          setError(t("scanner.cameraDenied"));
        } else if (permErr.name === "NotFoundError") {
          setError(t("scanner.noCamera"));
        } else if (permErr.name === "NotReadableError") {
          setError(t("scanner.cameraInUse"));
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
        } catch (e) {
          // Ignore stop errors
        }
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          html5QrCode.stop();
          setScanning(false);
          const parsed = parseVoucherQrPayload(decodedText);
          lastScanRef.current = { voucherId: parsed.voucherId };
          redeemMutation.mutate({
            voucherId: parsed.voucherId,
            magicToken: parsed.magicToken,
          });
        },
        () => {
          // QR scan failure - ignore (will keep scanning)
        }
      );

      setScanning(true);
      setError(null);
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (err.message?.includes("permission")) {
        setError(t("scanner.cameraPermissionDenied"));
      } else {
        setError(
          `${t("scanner.scannerError")}: ${
            err.message || t("scanner.couldNotStartCamera")
          }`
        );
      }
      setScanning(false);
    }
  }, [redeemMutation]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/merchant/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground font-[Poppins]">
                {t("scanner.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("scanner.scanToRedeem")}
              </p>
            </div>
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
                    <h2 className="text-3xl font-bold text-green-500 mb-2 font-[Poppins]">
                      {t("scanner.success")}
                    </h2>
                    <p className="text-lg text-foreground mb-4">
                      {t("scanner.redeemSuccess")}
                    </p>

                    <div className="bg-card rounded-lg p-4 mb-4 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">
                          {t("voucher.reward")}
                        </span>
                        <Badge className="bg-teal text-teal-foreground">
                          {scanResult.drop.rewardValue}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">
                          {t("voucher.dropName")}
                        </span>
                        <span className="font-medium">
                          {scanResult.drop.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("voucher.voucherId")}
                        </span>
                        <span className="font-mono text-sm">
                          {scanResult.voucher.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
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
                    <h2 className="text-3xl font-bold text-amber-500 mb-2 font-[Poppins]">
                      {t("scanner.alreadyRedeemed")}
                    </h2>
                    <p className="text-lg text-foreground mb-4">
                      {t("scanner.alreadyUsed")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("voucher.voucherId")}:{" "}
                      {scanResult.voucher.id.slice(0, 8)}...
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
                    <h2 className="text-3xl font-bold text-red-500 mb-2 font-[Poppins]">
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
                  {t("scanner.cameraViewfinder")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={scannerRef}
                  className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-primary/30"
                >
                  <div id="qr-reader" className="w-full h-full" />

                  {!scanning && !error && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
                      <QrCode className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center mb-4">
                        {t("scanner.clickToStart")}
                      </p>
                      <Button
                        onClick={startScanner}
                        className="gap-2"
                        data-testid="button-start-scan"
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
                      data-testid="button-retry"
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
                      data-testid="button-stop-scan"
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
