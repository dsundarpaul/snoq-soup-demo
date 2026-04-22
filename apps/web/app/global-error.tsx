"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/observability";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center font-sans antialiased">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <button
          type="button"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
