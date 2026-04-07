"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MerchantScannerFab() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-end rtl:justify-start"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
      }}
    >
      <div className="pointer-events-auto sm:pb-1 sm:pe-1">
        <Button
          asChild
          size="icon"
          className="h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] shrink-0 touch-manipulation rounded-full border border-primary-border shadow-lg [&_svg]:size-7"
          data-testid="fab-merchant-scanner"
          title="Open scanner"
        >
          <Link
            href="/scan"
            aria-label="Open voucher scanner"
            className="!gap-0 p-0"
          >
            <QrCode className="h-7 w-7 shrink-0" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>,
    document.body
  );
}
