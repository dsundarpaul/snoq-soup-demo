"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchTreasureHunterProfile } from "@/hooks/api/treasure-hunter";
import { useHasRoleCredentials } from "@/hooks/use-role-credentials";

export function useRedirectIfTreasureHunterLoggedIn(nextPath: string) {
  const hasHunterAuth = useHasRoleCredentials("hunter");
  const router = useRouter();

  useEffect(() => {
    if (!hasHunterAuth) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchTreasureHunterProfile();
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
  }, [hasHunterAuth, router, nextPath]);
}
