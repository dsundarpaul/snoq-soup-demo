"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useDeviceId } from "@/hooks/use-device-id";
import { safeRelativeNextPath } from "@/lib/safe-next-path";
import { useTreasureHunterProfileQuery } from "@/hooks/api/treasure-hunter";

export function RequireTreasureHunterSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const deviceId = useDeviceId();

  const { data: profile, isLoading } = useTreasureHunterProfileQuery(deviceId);

  useEffect(() => {
    if (!deviceId || isLoading) return;
    if (!profile?.email) {
      const next = safeRelativeNextPath(pathname || "/");
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [deviceId, isLoading, profile?.email, pathname, router]);

  if (!deviceId || isLoading || !profile?.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
