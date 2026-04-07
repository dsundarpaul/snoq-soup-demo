"use client";

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
import { mapClaimResponseToLegacy } from "@/lib/nest-mappers";
import type { Drop, Voucher } from "@shared/schema";

type ClaimResult = { voucher: Voucher; drop: Drop };

export function useClaimVoucherMutation(
  options?: Omit<
    UseMutationOptions<
      ClaimResult,
      Error,
      { dropId: string; deviceId: string }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: { dropId: string; deviceId: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/vouchers/claim",
        {
          dropId: data.dropId,
          deviceId: data.deviceId,
        },
        { auth: undefined, deviceId: data.deviceId }
      );
      const json = (await response.json()) as Record<string, unknown>;
      return mapClaimResponseToLegacy(json);
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useRedeemVoucherMutation(
  options?: Omit<
    UseMutationOptions<
      Record<string, unknown>,
      Error,
      { voucherId: string; magicToken: string }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: { voucherId: string; magicToken: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/vouchers/redeem",
        data,
        { auth: "merchant" }
      );
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: (...args) => {
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
