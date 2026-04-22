"use client";

import { RouteErrorFallback } from "@/sections/common/route-error-fallback";

export default function AdminError({
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
      title="Admin — something went wrong"
      description="We could not load this admin page. Try again or go back."
    />
  );
}
