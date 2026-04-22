"use client";

import { RouteErrorFallback } from "@/sections/common/route-error-fallback";

export default function TreasureHunterError({
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
      title="Hunter — something went wrong"
      description="We could not load this page. Try again or go back."
    />
  );
}
