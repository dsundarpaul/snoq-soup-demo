"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { safeRelativeNextPath } from "@/lib/safe-next-path";
import { hadAuthCredentials } from "@/lib/auth-session";
import { useHasRoleCredentials } from "@/hooks/use-role-credentials";
import { useMerchantMeQuery } from "@/hooks/api/merchant/use-merchant";

export function RequireMerchantSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasCreds = useHasRoleCredentials("merchant");
  const { data: merchant, isLoading, isError } = useMerchantMeQuery({
    enabled: hasCreds,
  });

  useEffect(() => {
    const redirectIfMissing = () => {
      if (!hadAuthCredentials("merchant")) {
        const next = safeRelativeNextPath(pathname || "/merchant/dashboard");
        router.replace(`/merchant?next=${encodeURIComponent(next)}`);
      }
    };
    redirectIfMissing();
    window.addEventListener("souqsnap-auth-changed", redirectIfMissing);
    return () =>
      window.removeEventListener("souqsnap-auth-changed", redirectIfMissing);
  }, [pathname, router]);

  useEffect(() => {
    if (hasCreds && !isLoading && (isError || !merchant?.emailVerified)) {
      const next = safeRelativeNextPath(pathname || "/merchant/dashboard");
      router.replace(`/merchant?next=${encodeURIComponent(next)}`);
    }
  }, [
    hasCreds,
    isLoading,
    isError,
    merchant?.emailVerified,
    pathname,
    router,
  ]);

  if (!hasCreds) {
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
