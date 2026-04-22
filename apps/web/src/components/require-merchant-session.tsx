"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { safeRelativeNextPath } from "@/lib/safe-next-path";
import { useRoleCredentialState } from "@/hooks/use-role-credentials";
import { useMerchantMeQuery } from "@/hooks/api/merchant/use-merchant";

export function RequireMerchantSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasCredentials, isLoading: credLoading } =
    useRoleCredentialState("merchant");
  const { data: merchant, isLoading, isError } = useMerchantMeQuery({
    enabled: hasCredentials,
  });

  useEffect(() => {
    if (credLoading) return;
    if (hasCredentials) return;
    const next = safeRelativeNextPath(pathname || "/merchant/dashboard");
    router.replace(`/merchant?next=${encodeURIComponent(next)}`);
  }, [credLoading, hasCredentials, pathname, router]);

  useEffect(() => {
    if (hasCredentials && !isLoading && (isError || !merchant?.emailVerified)) {
      const next = safeRelativeNextPath(pathname || "/merchant/dashboard");
      router.replace(`/merchant?next=${encodeURIComponent(next)}`);
    }
  }, [
    hasCredentials,
    isLoading,
    isError,
    merchant?.emailVerified,
    pathname,
    router,
  ]);

  if (credLoading || !hasCredentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading || isError || !merchant?.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
