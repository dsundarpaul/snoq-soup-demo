"use client";

import { useEffect, useRef } from "react";
import { useDeviceId } from "@/hooks/use-device-id";
import { treasureHunterQueryKeys } from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { queryClient } from "@/lib/queryClient";
import {
  isHunterDeviceLoginSuppressed,
  setAuthSessionHint,
} from "@/lib/auth-session";
import { fetchHunterMeCredential } from "@/hooks/auth-role-queries";
import { API_ORIGIN } from "@/lib/app-config";

const MAX_DEVICE_LOGIN_ATTEMPTS = 3;

async function hunterRewardsReachable(deviceId: string): Promise<boolean> {
  const probeUrl = `${API_ORIGIN}/api/v1/hunters/me/vouchers?unredeemedLimit=1&redeemedLimit=1`;
  const probeRes = await fetch(probeUrl, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-Requested-With": "fetch",
      "X-Device-Id": deviceId,
    },
  });
  return probeRes.ok;
}

export function HunterApiSessionSync() {
  const deviceId = useDeviceId();
  const deviceLoginAttemptsRef = useRef(0);
  const loggedCapWarningRef = useRef(false);

  useEffect(() => {
    deviceLoginAttemptsRef.current = 0;
    loggedCapWarningRef.current = false;
  }, [deviceId]);

  useEffect(() => {
    const run = () => {
      if (!deviceId || isHunterDeviceLoginSuppressed()) {
        return;
      }
      void (async () => {
        try {
          const registeredProfile = await queryClient.fetchQuery({
            queryKey: treasureHunterQueryKeys.profile,
            queryFn: fetchHunterMeCredential,
          });
          const registeredEmail = String(
            (registeredProfile as { email?: string } | null)?.email ?? "",
          ).trim();
          if (registeredEmail) {
            deviceLoginAttemptsRef.current = 0;
            return;
          }

          if (await hunterRewardsReachable(deviceId)) {
            deviceLoginAttemptsRef.current = 0;
            return;
          }

          if (deviceLoginAttemptsRef.current >= MAX_DEVICE_LOGIN_ATTEMPTS) {
            if (!loggedCapWarningRef.current) {
              loggedCapWarningRef.current = true;
              console.warn(
                "[HunterApiSessionSync] device-login retry cap reached after stale or missing hunter session",
              );
            }
            return;
          }
          deviceLoginAttemptsRef.current += 1;
          const res = await fetch(
            `${API_ORIGIN}/api/v1/auth/hunter/device-login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "fetch",
              },
              credentials: "include",
              body: JSON.stringify({ deviceId }),
            },
          );
          if (!res.ok) return;
          setAuthSessionHint();
          deviceLoginAttemptsRef.current = 0;
          void queryClient.invalidateQueries({
            queryKey: treasureHunterQueryKeys.vouchers,
          });
          void queryClient.invalidateQueries({
            queryKey: treasureHunterQueryKeys.history,
          });
          void queryClient.invalidateQueries({
            queryKey: treasureHunterQueryKeys.profile,
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
