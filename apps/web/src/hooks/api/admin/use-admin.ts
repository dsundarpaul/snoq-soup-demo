"use client";

import {
  useMutation,
  useQuery,
  keepPreviousData,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { clearSessionsExcept } from "@/lib/auth-session";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AdminLoginInput } from "./admin.api-types";
import {
  setTokenBundle,
  setStoredUser,
  clearTokenBundle,
  getRefreshToken,
  getStoredUser,
  getAccessToken,
} from "@/lib/auth-tokens";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import {
  mapAdminAnalyticsToLegacy,
  mapAdminDropItem,
  mapAdminMerchantItem,
  mapAdminStatsToPlatform,
  mapAdminUserItem,
  mapPromoListToLegacy,
  toNestBulkPromoPayload,
} from "@/lib/nest-mappers";
import type { PromoCodesResponse } from "@/sections/merchant/merchant-dashboard.types";

export const ADMIN_TABLE_PAGE_SIZE = 20;
export const ADMIN_DROPS_PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type AdminDropsListData = PagedResult<
  ReturnType<typeof mapAdminDropItem>
>;
export type AdminMerchantsListData = PagedResult<
  ReturnType<typeof mapAdminMerchantItem>
>;
export type AdminUsersListData = PagedResult<
  ReturnType<typeof mapAdminUserItem>
>;

export type AdminDropsListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  merchantId?: string;
};

export type AdminMerchantsListParams = {
  page: number;
  limit: number;
  search?: string;
  isVerified?: boolean;
};

export type AdminUsersListParams = {
  page: number;
  limit: number;
  search?: string;
  minClaims?: number;
};

export const adminQueryKeys = {
  session: ["/api/v1/admin/session"] as const,
  stats: ["/api/v1/admin/stats"] as const,
  analytics: ["/api/v1/admin/analytics"] as const,
  merchants: ["/api/v1/admin/merchants"] as const,
  drops: ["/api/v1/admin/drops"] as const,
  users: ["/api/v1/admin/users"] as const,
  dropCodes: (dropId: string) =>
    ["/api/v1/admin/drops", dropId, "codes"] as const,
};

async function adminGet<T>(path: string): Promise<T> {
  const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
  await throwIfResNotOk(res, path, "admin");
  return (await res.json()) as T;
}

type RawPagedJson = {
  items?: Record<string, unknown>[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

function toPagedResult<T>(
  raw: RawPagedJson,
  mapItem: (r: Record<string, unknown>) => T
): PagedResult<T> {
  const total = raw.total ?? 0;
  const totalPages = Math.max(1, raw.totalPages ?? 1);
  return {
    items: (raw.items ?? []).map(mapItem),
    total,
    page: raw.page ?? 1,
    limit: raw.limit ?? 20,
    totalPages,
    hasNextPage: raw.hasNextPage ?? false,
    hasPrevPage: raw.hasPrevPage ?? false,
  };
}

function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "")
      searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

// ── Auth ──

export function useAdminLoginMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, AdminLoginInput>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: AdminLoginInput) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/auth/admin/login",
        data,
        {
          auth: undefined,
        }
      );
      const body = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name?: string };
      };
      setTokenBundle("admin", {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });
      setStoredUser("admin", {
        id: body.user.id,
        email: body.user.email,
        name: body.user.name ?? body.user.email,
      });
      return body;
    },
    onSuccess: (...args) => {
      clearSessionsExcept("admin");
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminLogoutMutation(
  options?: Omit<UseMutationOptions<void, Error, void>, "mutationFn">
) {
  return useMutation({
    ...options,
    mutationFn: async () => {
      const refresh = getRefreshToken("admin");
      if (refresh) {
        try {
          await apiRequest(
            "POST",
            "/api/v1/auth/logout",
            { refreshToken: refresh },
            {
              auth: "admin",
            }
          );
        } catch {
          clearTokenBundle("admin");
        }
      }
      clearTokenBundle("admin");
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.session });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminSessionQuery(enabled = true) {
  return useQuery<{
    admin: { id: string; email: string; name: string };
  } | null>({
    queryKey: adminQueryKeys.session,
    retry: false,
    enabled,
    queryFn: async () => {
      const token = getAccessToken("admin");
      if (!token) return null;
      const user = getStoredUser<{ id: string; email: string; name: string }>(
        "admin"
      );
      if (!user) return null;
      return { admin: { id: user.id, email: user.email, name: user.name } };
    },
  });
}

// ── Mutations ──

export type AdminUpdateMerchantInput =
  | { id: string; isVerified: true }
  | { id: string; suspended: true }
  | { id: string; suspended: false };

export function useAdminUpdateMerchantMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, AdminUpdateMerchantInput>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (input) => {
      const { id, ...body } = input;
      const res = await apiRequest(
        "PATCH",
        `/api/v1/admin/merchants/${id}`,
        body,
        { auth: "admin" }
      );
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.merchants });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminUpdateDropMutation(
  options?: Omit<
    UseMutationOptions<
      unknown,
      Error,
      { id: string } & Record<string, unknown>
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async ({ id, ...updates }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/v1/admin/drops/${id}`,
        updates,
        {
          auth: "admin",
        }
      );
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminCreateDropMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, Record<string, unknown>>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/v1/admin/drops", data, {
        auth: "admin",
      });
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminDeleteDropMutation(
  options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">
) {
  return useMutation({
    ...options,
    mutationFn: async (id: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/v1/admin/drops/${id}`,
        undefined,
        {
          auth: "admin",
        }
      );
      if (res.status === 204) return { ok: true };
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminDropCodesQuery(dropId: string | null) {
  return useQuery<PromoCodesResponse>({
    queryKey: dropId
      ? adminQueryKeys.dropCodes(dropId)
      : ["admin-drop-codes-off"],
    queryFn: async () => {
      const path = `/api/v1/admin/drops/${dropId}/codes`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      if (res.status === 404) {
        const empty: PromoCodesResponse = {
          codes: [],
          stats: { total: 0, available: 0, assigned: 0 },
        };
        return empty;
      }
      await throwIfResNotOk(res, path, "admin");
      return mapPromoListToLegacy(
        (await res.json()) as Record<string, unknown>
      );
    },
    enabled: !!dropId,
  });
}

export function useAdminUploadDropCodesMutation(
  dropIdForInvalidate: string | null,
  options?: Omit<
    UseMutationOptions<unknown, Error, { dropId: string; codes: string[] }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async ({ dropId, codes }) => {
      const res = await apiRequest(
        "POST",
        `/api/v1/admin/drops/${dropId}/codes`,
        toNestBulkPromoPayload(codes),
        {
          auth: "admin",
        }
      );
      return res.json();
    },
    onSuccess: (...args) => {
      if (dropIdForInvalidate) {
        queryClient.invalidateQueries({
          queryKey: adminQueryKeys.dropCodes(dropIdForInvalidate),
        });
      }
      options?.onSuccess?.(...args);
    },
  });
}

// ── Stats & Analytics ──

export function useAdminStatsQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.stats,
    enabled,
    queryFn: () =>
      adminGet<Record<string, unknown>>("/api/v1/admin/stats").then(
        mapAdminStatsToPlatform
      ),
  });
}

export function useAdminAnalyticsQuery(
  enabled: boolean,
  days = 30,
  granularity: "hourly" | "daily" | "weekly" | "monthly" = "daily"
) {
  return useQuery({
    queryKey: [...adminQueryKeys.analytics, days, granularity] as const,
    enabled,
    queryFn: () => {
      const queryString = buildQueryString({ days, granularity });
      return adminGet<Record<string, unknown>>(
        `/api/v1/admin/analytics?${queryString}`
      ).then(mapAdminAnalyticsToLegacy);
    },
  });
}

// ── Paginated lists ──
//
// Key design decisions for server-side pagination:
// - staleTime: 0  → cached data is always "stale", so React Query refetches on mount
// - gcTime: 0     → old page data is garbage-collected immediately when key changes
//   (this is the critical one — without it, going page 1→2→1→2 serves stale cache)
// - placeholderData: keepPreviousData → shows old page while new one loads (no flash)

export function useAdminMerchantsListQuery(
  enabled: boolean,
  params: AdminMerchantsListParams
) {
  const { page, limit, search, isVerified } = params;
  const queryString = buildQueryString({ page, limit, search, isVerified });

  return useQuery({
    queryKey: [
      ...adminQueryKeys.merchants,
      "list",
      page,
      limit,
      search ?? "",
      String(isVerified ?? "all"),
    ] as const,
    enabled,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminMerchantsListData> => {
      const raw = await adminGet<RawPagedJson>(`/api/v1/admin/merchants?${queryString}`);
      return toPagedResult(raw, mapAdminMerchantItem);
    },
  });
}

export function useAdminDropsListQuery(
  enabled: boolean,
  params: AdminDropsListParams
) {
  const { page, limit, search, status, merchantId } = params;
  const queryString = buildQueryString({
    page,
    limit,
    search,
    status: status && status !== "all" ? status : undefined,
    merchantId,
  });

  return useQuery({
    queryKey: [
      ...adminQueryKeys.drops,
      "list",
      page,
      limit,
      search ?? "",
      status ?? "",
      merchantId ?? "",
    ] as const,
    enabled,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminDropsListData> => {
      const raw = await adminGet<RawPagedJson>(`/api/v1/admin/drops?${queryString}`);
      return toPagedResult(raw, mapAdminDropItem);
    },
  });
}

export function useAdminUsersListQuery(
  enabled: boolean,
  params: AdminUsersListParams
) {
  const { page, limit, search, minClaims } = params;
  const queryString = buildQueryString({
    page,
    limit,
    search,
    minClaims: minClaims !== undefined && minClaims > 0 ? minClaims : undefined,
  });

  return useQuery({
    queryKey: [
      ...adminQueryKeys.users,
      "list",
      page,
      limit,
      search ?? "",
      String(minClaims ?? ""),
    ] as const,
    enabled,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminUsersListData> => {
      const raw = await adminGet<RawPagedJson>(`/api/v1/admin/users?${queryString}`);
      return toPagedResult(raw, mapAdminUserItem);
    },
  });
}
