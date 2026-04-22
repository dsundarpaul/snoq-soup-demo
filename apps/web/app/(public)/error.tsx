"use client";

import { RouteErrorFallback } from "@/sections/common/route-error-fallback";

export default function PublicError({
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
      title="Something went wrong"
      description="We could not load this page. Try again or go back."
    />
  );
}
