"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuthRole } from "@/lib/auth-tokens";
import { merchantQueryKeys } from "@/hooks/api/merchant/use-merchant";
import { adminQueryKeys } from "@/hooks/api/admin/use-admin";
import { treasureHunterQueryKeys } from "@/hooks/api/treasure-hunter/treasure-hunter.query-keys";
import { credentialQueryFn } from "@/hooks/auth-role-queries";

const CREDENTIAL_QUERY_KEY: Record<AuthRole, readonly unknown[]> = {
  merchant: merchantQueryKeys.me,
  admin: adminQueryKeys.session,
  hunter: treasureHunterQueryKeys.profile,
};

export function useRoleCredentialState(role: AuthRole): {
  hasCredentials: boolean;
  isLoading: boolean;
} {
  const q = useQuery<unknown>({
    queryKey: CREDENTIAL_QUERY_KEY[role],
    queryFn: credentialQueryFn(role) as () => Promise<unknown>,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const hasCredentials = Boolean(q.data);
  const isLoading = q.isPending || q.isFetching;
  return { hasCredentials, isLoading };
}

export function useHasRoleCredentials(role: AuthRole): boolean {
  const { hasCredentials } = useRoleCredentialState(role);
  return hasCredentials;
}
