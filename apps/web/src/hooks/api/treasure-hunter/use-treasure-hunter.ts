"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  clearAuthSessionHint,
  clearHunterSuppressDeviceLogin,
  clearSessionsExcept,
  hadAuthSessionHint,
  invalidateAuthSession,
  setAuthSessionHint,
  setHunterSuppressDeviceLoginAfterLogout,
} from "@/lib/auth-session";
import { useDeviceId } from "@/hooks/use-device-id";
import {
  apiFetch,
  apiFetchMaybeRetry,
  throwIfResNotOk,
} from "@/lib/api-client";
import { clearTokenBundle } from "@/lib/auth-tokens";
import {
  mapHunterHistoryToVoucherRows,
  mapHunterVoucherBundleToLegacy,
  mapHunterVouchersBucketsToLegacy,
  type HunterVoucherMerchantDisplay,
} from "@/lib/nest-mappers";
import type { Drop, Voucher } from "@shared/schema";
import type {
  HunterLoginInput,
  HunterSignupInput,
} from "./treasure-hunter.api-types";
import { fetchHunterMeCredential } from "@/hooks/auth-role-queries";
import {
  treasureHunterQueryKeys,
  type HunterVoucherStatus,
} from "./treasure-hunter.query-keys";

export { treasureHunterQueryKeys, type HunterVoucherStatus };

export type HunterVoucherRow = {
  voucher: Voucher;
  drop: Drop;
} & HunterVoucherMerchantDisplay;

export function useHunterVouchersQuery(options?: {
  unredeemedLimit?: number;
  redeemedLimit?: number;
}) {
  const deviceId = useDeviceId();
  const deviceReady = Boolean(deviceId);
  const { unredeemedLimit, redeemedLimit } = options ?? {};
  return useQuery({
    queryKey: treasureHunterQueryKeys.vouchersSummary(
      unredeemedLimit,
      redeemedLimit
    ),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unredeemedLimit) {
        params.set("unredeemedLimit", String(unredeemedLimit));
      }
      if (redeemedLimit) {
        params.set("redeemedLimit", String(redeemedLimit));
      }
      const query = params.toString();
      const path = "/api/v1/hunters/me/vouchers" + (query ? `?${query}` : "");
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "hunter",
      });
      if (res.status === 401) {
        if (hadAuthSessionHint()) {
          invalidateAuthSession("hunter");
        }
        return {
          unredeemed: [],
          redeemed: [],
          unredeemedTotal: 0,
          redeemedTotal: 0,
          claimedDropIds: [],
        };
      }
      await throwIfResNotOk(res, path, "hunter");
      const json = (await res.json()) as Record<string, unknown>;
      return mapHunterVouchersBucketsToLegacy(json);
    },
    enabled: deviceReady,
  });
}

export function useHunterVouchersInfiniteQuery(
  status: HunterVoucherStatus = "all",
  pageSize = 10
) {
  const deviceId = useDeviceId();
  const deviceReady = Boolean(deviceId);
  return useInfiniteQuery({
    queryKey: treasureHunterQueryKeys.vouchersList(status, pageSize),
    enabled: deviceReady,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("page", String(pageParam));
      params.set("limit", String(pageSize));
      const path = `/api/v1/hunters/me/vouchers/list?${params.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "hunter" });
      if (res.status === 401) {
        if (hadAuthSessionHint()) {
          invalidateAuthSession("hunter");
        }
        return {
          items: [] as HunterVoucherRow[],
          page: Number(pageParam),
          totalPages: 0,
          total: 0,
        };
      }
      await throwIfResNotOk(res, path, "hunter");
      const json = (await res.json()) as {
        items: Record<string, unknown>[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      const items = (json.items ?? []).map((row) =>
        mapHunterVoucherBundleToLegacy(
          row as {
            voucher: Record<string, unknown>;
            drop: Record<string, unknown>;
            merchant?: Record<string, unknown>;
          }
        )
      );
      return {
        items,
        page: Number(json.page ?? pageParam),
        totalPages: Number(json.totalPages ?? 0),
        total: Number(json.total ?? 0),
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
  });
}

export function useTreasureHunterProfileQuery() {
  return useQuery({
    queryKey: treasureHunterQueryKeys.profile,
    queryFn: fetchHunterMeCredential,
  });
}

export function useTreasureHunterLoginMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, HunterLoginInput & { deviceId: string }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: HunterLoginInput & { deviceId: string }) => {
      const res = await apiRequest(
        "POST",
        "/api/v1/auth/hunter/login",
        {
          email: data.email,
          password: data.password,
          deviceId: data.deviceId,
        },
        { auth: undefined }
      );
      const body = (await res.json()) as {
        user: Record<string, unknown>;
      };
      setAuthSessionHint();
      return body;
    },
    onSuccess: (...args) => {
      clearHunterSuppressDeviceLogin();
      clearSessionsExcept("hunter");
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.vouchers,
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useTreasureHunterSignupMutation(
  options?: Omit<
    UseMutationOptions<
      unknown,
      Error,
      HunterSignupInput & { deviceId: string }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: HunterSignupInput & { deviceId: string }) => {
      const res = await apiRequest(
        "POST",
        "/api/v1/auth/hunter/register",
        {
          email: data.email,
          password: data.password,
          deviceId: data.deviceId,
          nickname: data.nickname,
        },
        { auth: undefined }
      );
      await res.json();
      setAuthSessionHint();
      const patchPath = "/api/v1/hunters/me/profile";
      const patch = await apiFetchMaybeRetry("PATCH", patchPath, {
        auth: "hunter",
        body: {
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          mobileCountryCode: data.mobileCountryCode,
          mobileNumber: data.mobileNumber,
        },
      });
      if (!patch.ok) {
        await throwIfResNotOk(patch, patchPath, "hunter");
      } else {
        await patch.json().catch(() => null);
      }
      return { ok: true };
    },
    onSuccess: (...args) => {
      clearHunterSuppressDeviceLogin();
      clearSessionsExcept("hunter");
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.vouchers,
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useTreasureHunterLogoutMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, { deviceId: string }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async ({ deviceId }: { deviceId: string }) => {
      setHunterSuppressDeviceLoginAfterLogout();
      try {
        await apiRequest(
          "POST",
          "/api/v1/auth/logout",
          {},
          { auth: "hunter", deviceId }
        );
      } catch {
        clearTokenBundle("hunter");
      }
      clearAuthSessionHint();
      clearTokenBundle("hunter");
      return { ok: true };
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.vouchers,
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useTreasureHunterPatchProfileMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, Record<string, unknown>>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest(
        "PATCH",
        "/api/v1/hunters/me/profile",
        data,
        {
          auth: "hunter",
        }
      );
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useTreasureHunterForgotPasswordMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, { email: string }>,
    "mutationFn"
  >
) {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      await apiRequest("POST", "/api/v1/auth/hunter/forgot-password", data, {
        auth: undefined,
      });
    },
    ...options,
  });
}

export function useTreasureHunterResetPasswordMutation(token: string) {
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      await apiRequest(
        "POST",
        `/api/v1/auth/hunter/reset-password/${token}`,
        data,
        { auth: undefined }
      );
    },
  });
}

export function useTreasureHunterHistoryQuery() {
  const deviceId = useDeviceId();
  const deviceReady = Boolean(deviceId);
  return useQuery({
    queryKey: treasureHunterQueryKeys.history,
    queryFn: async () => {
      const path = "/api/v1/hunters/me/history";
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "hunter",
      });
      if (res.status === 401) {
        if (hadAuthSessionHint()) {
          invalidateAuthSession("hunter");
        }
        return mapHunterHistoryToVoucherRows({});
      }
      await throwIfResNotOk(res, path, "hunter");
      const json = (await res.json()) as Record<string, unknown>;
      return mapHunterHistoryToVoucherRows(json);
    },
    enabled: deviceReady,
  });
}

export function useLeaderboardQuery(limit = 50) {
  return useQuery({
    queryKey: treasureHunterQueryKeys.leaderboard(limit),
    queryFn: async () => {
      const res = await apiFetch("GET", `/api/v1/leaderboard?limit=${limit}`);
      await throwIfResNotOk(res);
      const rows = (await res.json()) as {
        nickname?: string;
        totalClaims?: number;
        totalRedemptions?: number;
      }[];
      return rows.map((r) => ({
        nickname: r.nickname ?? null,
        totalClaims: Number(r.totalClaims ?? 0),
        totalRedemptions: Number(r.totalRedemptions ?? 0),
      }));
    },
  });
}

export async function fetchTreasureHunterProfile() {
  try {
    return await fetchHunterMeCredential();
  } catch {
    return null;
  }
}
