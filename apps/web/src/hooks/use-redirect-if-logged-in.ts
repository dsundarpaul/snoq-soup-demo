"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDeviceId } from "@/hooks/use-device-id";
import { fetchTreasureHunterProfile } from "@/hooks/api/treasure-hunter";

export function useRedirectIfTreasureHunterLoggedIn(nextPath: string) {
  const deviceId = useDeviceId();
  const router = useRouter();

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchTreasureHunterProfile(deviceId);
        if (!profile || cancelled) return;
        if (profile?.email && !cancelled) {
          router.replace(nextPath);
        }
      } catch {
        /* stay */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, router, nextPath]);
}
