"use client";

import { RouteErrorFallback } from "@/sections/common/route-error-fallback";

export default function MerchantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Merchant — something went wrong"
      description="We could not load this merchant page. Try again or go back."
    />
  );
}
