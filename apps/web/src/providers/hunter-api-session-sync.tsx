"use client";

import { useEffect } from "react";
import { API_ORIGIN } from "@/lib/app-config";
import { useDeviceId } from "@/hooks/use-device-id";
import { treasureHunterQueryKeys } from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { queryClient } from "@/lib/queryClient";
import { isHunterDeviceLoginSuppressed } from "@/lib/auth-session";
import { getAccessToken, setTokenBundle } from "@/lib/auth-tokens";

export function HunterApiSessionSync() {
  const deviceId = useDeviceId();

  useEffect(() => {
    const tryDeviceLogin = () => {
      if (
        !deviceId ||
        getAccessToken("hunter") ||
        isHunterDeviceLoginSuppressed()
      ) {
        return;
      }
      void (async () => {
        try {
          const res = await fetch(
            `${API_ORIGIN}/api/v1/auth/hunter/device-login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "omit",
              body: JSON.stringify({ deviceId }),
            }
          );
          if (!res.ok) return;
          const body = (await res.json()) as {
            accessToken: string;
            refreshToken: string;
          };
          setTokenBundle("hunter", {
            accessToken: body.accessToken,
            refreshToken: body.refreshToken,
          });
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
    tryDeviceLogin();
  }, [deviceId]);

  return null;
}
