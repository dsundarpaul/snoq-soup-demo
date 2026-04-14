"use client";

import {
  useMutation,
  useQuery,
  keepPreviousData,
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
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.vouchers,
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
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.vouchers,
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

export type MerchantVoucherStatus = "all" | "active" | "redeemed";

export const MERCHANT_VOUCHERS_PAGE_SIZE = 20;

export type MerchantVouchersListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: MerchantVoucherStatus;
};

export const merchantVouchersQueryKeys = {
  list: (page: number, limit: number, search: string, status: string) =>
    ["/api/v1/merchants/me/vouchers", "list", page, limit, search, status] as const,
};

export type MerchantVoucherRow = {
  voucher: ReturnType<typeof mapNestVoucherToLegacy>;
  dropName: string;
  claimerName: string | null;
  claimerEmail: string | null;
};

function mapVoucherRow(v: Record<string, unknown>): MerchantVoucherRow {
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
}

export function useMerchantVouchersQuery(params: MerchantVouchersListParams) {
  const { page, limit, search, status } = params;
  const searchTrimmed = search?.trim() ?? "";
  const statusKey = status ?? "all";

  return useQuery({
    queryKey: merchantVouchersQueryKeys.list(page, limit, searchTrimmed, statusKey),
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (searchTrimmed) sp.set("search", searchTrimmed);
      if (statusKey !== "all") sp.set("status", statusKey);
      const path = `/api/v1/merchants/me/vouchers?${sp.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "merchant" });
      await throwIfResNotOk(res, path, "merchant");
      const json = (await res.json()) as {
        vouchers?: Record<string, unknown>[];
        total?: number;
        totalPages?: number;
      };
      return {
        vouchers: (json.vouchers ?? []).map(mapVoucherRow),
        total: Number(json.total ?? 0),
        totalPages: Math.max(1, json.totalPages ?? 1),
      };
    },
  });
}

const EXPORT_PAGE_SIZE = 100;

export async function fetchAllMerchantVouchersForExport(filters: {
  search?: string;
  status?: MerchantVoucherStatus;
}): Promise<MerchantVoucherRow[]> {
  const out: MerchantVoucherRow[] = [];
  let page = 1;
  for (;;) {
    const sp = new URLSearchParams({ page: String(page), limit: String(EXPORT_PAGE_SIZE) });
    const s = filters.search?.trim();
    if (s) sp.set("search", s);
    if (filters.status && filters.status !== "all") sp.set("status", filters.status);
    const path = `/api/v1/merchants/me/vouchers?${sp.toString()}`;
    const res = await apiFetchMaybeRetry("GET", path, { auth: "merchant" });
    await throwIfResNotOk(res, path, "merchant");
    const json = (await res.json()) as {
      vouchers?: Record<string, unknown>[];
      total?: number;
    };
    const batch = (json.vouchers ?? []).map(mapVoucherRow);
    out.push(...batch);
    if (batch.length < EXPORT_PAGE_SIZE) break;
    if (out.length >= (json.total ?? out.length)) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}
