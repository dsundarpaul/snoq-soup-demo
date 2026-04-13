"use client";

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import { apiFetch, apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import {
  mapClaimResponseToLegacy,
  mapNestVoucherToLegacy,
} from "@/lib/nest-mappers";
import { treasureHunterQueryKeys } from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import type { AuthRole } from "@/lib/auth-tokens";
import type { Drop, Voucher } from "@shared/schema";

type ClaimResult = { voucher: Voucher; drop: Drop };

export function useClaimVoucherMutation(
  options?: Omit<
    UseMutationOptions<
      ClaimResult,
      Error,
      { dropId: string; deviceId: string; hunterId?: string }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: {
      dropId: string;
      deviceId: string;
      hunterId?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/vouchers/claim",
        {
          dropId: data.dropId,
          deviceId: data.deviceId,
          ...(data.hunterId ? { hunterId: data.hunterId } : {}),
        },
        { auth: undefined, deviceId: data.deviceId }
      );
      const json = (await response.json()) as Record<string, unknown>;
      return mapClaimResponseToLegacy(json);
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.history,
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useRedeemVoucherMutation(
  options?: Omit<
    UseMutationOptions<
      Record<string, unknown>,
      Error,
      { voucherId: string; magicToken: string; auth?: AuthRole }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: {
      voucherId: string;
      magicToken: string;
      auth?: AuthRole;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/vouchers/redeem",
        {
          voucherId: data.voucherId,
          magicToken: data.magicToken,
        },
        { auth: data.auth ?? "merchant" }
      );
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.history,
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useVoucherByMagicTokenQuery(token: string) {
  return useQuery({
    queryKey: ["/api/v1/vouchers/magic", token],
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        `/api/v1/vouchers/magic/${encodeURIComponent(token)}`
      );
      await throwIfResNotOk(res);
      return res.json() as Promise<Record<string, unknown>>;
    },
    enabled: !!token,
  });
}

export const merchantVouchersQueryKeys = {
  list: (page: number, limit: number) =>
    ["/api/v1/merchants/me/vouchers", page, limit] as const,
};

export function useMerchantVouchersQuery(page = 1, limit = 20) {
  return useQuery({
    queryKey: merchantVouchersQueryKeys.list(page, limit),
    queryFn: async () => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const path = `/api/v1/merchants/me/vouchers?${qs.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "merchant" });
      await throwIfResNotOk(res, path, "merchant");
      const json = (await res.json()) as {
        vouchers?: Record<string, unknown>[];
        total?: number;
      };
      const vouchers = (json.vouchers ?? []).map((v) => {
        const drop = v.drop as { name?: string } | undefined;
        const claimedBy = v.claimedBy as
          | { name?: string | null; email?: string | null }
          | undefined;
        return {
          voucher: mapNestVoucherToLegacy(v),
          dropName: String(drop?.name ?? ""),
          claimerName:
            claimedBy?.name != null && String(claimedBy.name).trim() !== ""
              ? String(claimedBy.name).trim()
              : null,
          claimerEmail:
            claimedBy?.email != null && String(claimedBy.email).trim() !== ""
              ? String(claimedBy.email).trim()
              : null,
        };
      });
      return { vouchers, total: Number(json.total ?? 0) };
    },
  });
}
