"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export type RouteErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
};

export function RouteErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again or return to the previous screen.",
}: RouteErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">{description}</p>

          {process.env.NODE_ENV === "development" && error.message ? (
            <pre className="mt-4 p-3 text-xs bg-muted rounded-md overflow-auto max-h-32 text-left">
              {error.message}
            </pre>
          ) : null}

          <Button className="mt-6 w-full" onClick={() => reset()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
