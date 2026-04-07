"use client";

import { useEffect } from "react";
import { API_ORIGIN } from "@/lib/app-config";
import { useDeviceId } from "@/hooks/use-device-id";
import { getAccessToken, setTokenBundle } from "@/lib/auth-tokens";

export function HunterApiSessionSync() {
  const deviceId = useDeviceId();

  useEffect(() => {
    const tryDeviceLogin = () => {
      if (!deviceId || getAccessToken("hunter")) return;
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
        } catch {
          /* ignore */
        }
      })();
    };
    tryDeviceLogin();
    window.addEventListener("souqsnap-auth-changed", tryDeviceLogin);
    return () =>
      window.removeEventListener("souqsnap-auth-changed", tryDeviceLogin);
  }, [deviceId]);

  return null;
}
