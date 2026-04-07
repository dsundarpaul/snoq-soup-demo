"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export interface StaffScannerQrThumbProps {
  scanUrl: string;
  size?: number;
  label?: string;
  disabled?: boolean;
}

export function StaffScannerQrThumb({
  scanUrl,
  size = 72,
  label = "Scan URL QR",
  disabled = false,
}: StaffScannerQrThumbProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    void import("qrcode").then((QRCode) => {
      QRCode.toDataURL(scanUrl, { width: size, margin: 1 })
        .then((url) => {
          if (!cancelled) setDataUrl(url);
        })
        .catch(() => {
          if (!cancelled) setDataUrl(null);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [scanUrl, size]);

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-md border bg-muted/40 text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-block rounded-md ${
        disabled ? "opacity-40 grayscale" : ""
      }`}
    >
      <img
        src={dataUrl}
        alt={label}
        width={size}
        height={size}
        className="rounded-md border bg-white p-1"
      />
      {disabled && (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60 text-[10px] font-medium text-muted-foreground">
          Off
        </span>
      )}
    </div>
  );
}
