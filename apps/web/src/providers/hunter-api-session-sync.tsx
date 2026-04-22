"use client";

import { useEffect } from "react";
import { useDeviceId } from "@/hooks/use-device-id";
import { treasureHunterQueryKeys } from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { queryClient } from "@/lib/queryClient";
import { isHunterDeviceLoginSuppressed } from "@/lib/auth-session";
import { fetchHunterMeCredential } from "@/hooks/auth-role-queries";
import { setAuthSessionHint } from "@/lib/auth-session";

export function HunterApiSessionSync() {
  const deviceId = useDeviceId();

  useEffect(() => {
    const run = () => {
      if (!deviceId || isHunterDeviceLoginSuppressed()) {
        return;
      }
      void (async () => {
        try {
          const existing = await queryClient.fetchQuery({
            queryKey: treasureHunterQueryKeys.profile,
            queryFn: fetchHunterMeCredential,
          });
          if (existing) {
            return;
          }
          const res = await fetch("/api/v1/auth/hunter/device-login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "fetch",
            },
            credentials: "include",
            body: JSON.stringify({ deviceId }),
          });
          if (!res.ok) return;
          setAuthSessionHint();
          void queryClient.invalidateQueries({
            queryKey: treasureHunterQueryKeys.profile,
          });
          void queryClient.invalidateQueries({
            queryKey: treasureHunterQueryKeys.vouchers,
          });
          void queryClient.invalidateQueries({
            queryKey: treasureHunterQueryKeys.history,
          });
        } catch {
          /* ignore */
        }
      })();
    };
    run();
  }, [deviceId]);

  return null;
}
