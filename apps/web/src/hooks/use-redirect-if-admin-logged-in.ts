"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminSessionQuery } from "@/hooks/api/admin/use-admin";
import { useHasRoleCredentials } from "@/hooks/use-role-credentials";

export function useRedirectIfAdminLoggedIn(): void {
  const router = useRouter();
  const hasCreds = useHasRoleCredentials("admin");
  const { data, isSuccess } = useAdminSessionQuery(hasCreds);

  useEffect(() => {
    if (hasCreds && isSuccess && data?.admin) {
      router.replace("/admin/dashboard");
    }
  }, [hasCreds, isSuccess, data?.admin, router]);
}
