"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { safeRelativeNextPath } from "@/lib/safe-next-path";
import { useTreasureHunterProfileQuery } from "@/hooks/api/treasure-hunter";
import { useHasRoleCredentials } from "@/hooks/use-role-credentials";

export function RequireTreasureHunterSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHunterAuth = useHasRoleCredentials("hunter");

  const { data: profile, isLoading } = useTreasureHunterProfileQuery();

  useEffect(() => {
    if (!hasHunterAuth) {
      const next = safeRelativeNextPath(pathname || "/");
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (isLoading) return;
    if (!profile?.email) {
      const next = safeRelativeNextPath(pathname || "/");
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [hasHunterAuth, isLoading, profile?.email, pathname, router]);

  if (!hasHunterAuth || isLoading || !profile?.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
