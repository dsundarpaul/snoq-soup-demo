"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMerchantMeQuery } from "@/hooks/api/merchant/use-merchant";
import { useHasRoleCredentials } from "@/hooks/use-role-credentials";

export function useRedirectIfMerchantLoggedIn(): void {
  const router = useRouter();
  const hasCreds = useHasRoleCredentials("merchant");
  const { data, isLoading, isSuccess, isError } = useMerchantMeQuery({
    enabled: hasCreds,
  });

  useEffect(() => {
    if (!hasCreds || isLoading) return;
    if (isError) return;
    if (isSuccess && data?.emailVerified) {
      router.replace("/merchant/dashboard");
    }
  }, [hasCreds, isLoading, isSuccess, isError, data?.emailVerified, router]);
}
