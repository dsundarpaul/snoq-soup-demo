"use client";

import { useEffect } from "react";
import { captureException, captureMessage } from "@/lib/observability";

export function ObservabilityClientInit() {
  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      if (reason instanceof Error) {
        captureException(reason);
      } else {
        const msg =
          typeof reason === "string"
            ? reason
            : (() => {
                try {
                  return JSON.stringify(reason);
                } catch {
                  return String(reason);
                }
              })();
        captureMessage(msg, {
          level: "error",
          tags: { mechanism: "onunhandledrejection" },
        });
      }
      if (process.env.NODE_ENV === "development") {
        console.error("Unhandled rejection:", reason);
      }
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
  return null;
}
