"use client";

import {
  useMutation,
  useQuery,
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
} from "@/lib/nest-mappers";

export const ADMIN_TABLE_PAGE_SIZE = 20;

export const ADMIN_DROPS_PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

const ADMIN_EXPORT_PAGE_SIZE = 100;

export type AdminDropsListData = {
  items: ReturnType<typeof mapAdminDropItem>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type AdminMerchantsListData = {
  items: ReturnType<typeof mapAdminMerchantItem>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type AdminUsersListData = {
  items: ReturnType<typeof mapAdminUserItem>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type AdminDropsListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  merchantId?: string;
  active?: boolean;
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
        { auth: undefined }
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
            { auth: "admin" }
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
  return useQuery<{ admin: { id: string; email: string; name: string } } | null>(
    {
      queryKey: adminQueryKeys.session,
      retry: false,
      enabled,
      queryFn: async () => {
        const token = getAccessToken("admin");
        if (!token) return null;
        const user = getStoredUser<{
          id: string;
          email: string;
          name: string;
        }>("admin");
        if (!user) return null;
        return {
          admin: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        };
      },
    }
  );
}

export function useAdminUpdateMerchantMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, { id: string; emailVerified: boolean }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async ({ id, emailVerified }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/admin/merchants/${id}`,
        { isVerified: emailVerified },
        { auth: "admin" }
      );
      return response.json();
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
      const response = await apiRequest(
        "PATCH",
        `/api/v1/admin/drops/${id}`,
        updates,
        { auth: "admin" }
      );
      return response.json();
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
      const response = await apiRequest(
        "POST",
        "/api/v1/admin/drops",
        data,
        { auth: "admin" }
      );
      return response.json();
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
      const response = await apiRequest(
        "DELETE",
        `/api/v1/admin/drops/${id}`,
        undefined,
        { auth: "admin" }
      );
      if (response.status === 204) return { ok: true };
      return response.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAdminDropCodesQuery(dropId: string | null) {
  return useQuery({
    queryKey: dropId
      ? adminQueryKeys.dropCodes(dropId)
      : ["admin-drop-codes-off"],
    queryFn: async () => {
      const path = `/api/v1/admin/drops/${dropId}/codes`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      if (res.status === 404) {
        return {
          codes: [] as { code: string; status: string }[],
          stats: { total: 0, available: 0, assigned: 0 },
        };
      }
      await throwIfResNotOk(res, path, "admin");
      const json = (await res.json()) as Record<string, unknown>;
      return mapPromoListToLegacy(json);
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
        { codes },
        { auth: "admin" }
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

export function useAdminStatsQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.stats,
    enabled,
    queryFn: async () => {
      const path = "/api/v1/admin/stats";
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      await throwIfResNotOk(res, path, "admin");
      return mapAdminStatsToPlatform(
        (await res.json()) as Record<string, unknown>
      );
    },
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
    queryFn: async () => {
      const qs = new URLSearchParams({
        days: String(days),
        granularity,
      });
      const path = `/api/v1/admin/analytics?${qs.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      await throwIfResNotOk(res, path, "admin");
      return mapAdminAnalyticsToLegacy(
        (await res.json()) as Record<string, unknown>
      );
    },
  });
}

export function useAdminMerchantsListQuery(
  enabled: boolean,
  params: AdminMerchantsListParams,
) {
  const { page, limit, search, isVerified } = params;
  return useQuery({
    queryKey: [
      ...adminQueryKeys.merchants,
      "paged",
      page,
      limit,
      search ?? "",
      isVerified === undefined ? "all" : String(isVerified),
    ] as const,
    enabled,
    queryFn: async (): Promise<AdminMerchantsListData> => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const q = search?.trim();
      if (q) sp.set("search", q);
      if (isVerified !== undefined) sp.set("isVerified", String(isVerified));
      const path = `/api/v1/admin/merchants?${sp.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      await throwIfResNotOk(res, path, "admin");
      const json = (await res.json()) as {
        items?: Record<string, unknown>[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
      };
      const items = (json.items ?? []).map(mapAdminMerchantItem);
      const total = json.total ?? 0;
      const totalPages = Math.max(1, json.totalPages ?? 1);
      return {
        items,
        total,
        page: json.page ?? page,
        limit: json.limit ?? limit,
        totalPages,
        hasNextPage: json.hasNextPage ?? false,
        hasPrevPage: json.hasPrevPage ?? false,
      };
    },
  });
}

export function useAdminDropsListQuery(
  enabled: boolean,
  listParams: AdminDropsListParams,
) {
  const { page, limit, search, status, merchantId, active } = listParams;
  return useQuery({
    queryKey: [
      ...adminQueryKeys.drops,
      "paged",
      page,
      limit,
      search ?? "",
      status ?? "",
      merchantId ?? "",
      active === undefined ? "" : String(active),
    ] as const,
    enabled,
    queryFn: async (): Promise<AdminDropsListData> => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const q = search?.trim();
      if (q) sp.set("search", q);
      if (status && status !== "all") sp.set("status", status);
      if (merchantId) sp.set("merchantId", merchantId);
      if (active !== undefined) sp.set("active", String(active));
      const path = `/api/v1/admin/drops?${sp.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      await throwIfResNotOk(res, path, "admin");
      const json = (await res.json()) as {
        items?: Record<string, unknown>[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
      };
      const items = (json.items ?? []).map((row) => mapAdminDropItem(row));
      const total = json.total ?? 0;
      const totalPages = Math.max(1, json.totalPages ?? 1);
      return {
        items,
        total,
        page: json.page ?? page,
        limit: json.limit ?? limit,
        totalPages,
        hasNextPage: json.hasNextPage ?? false,
        hasPrevPage: json.hasPrevPage ?? false,
      };
    },
  });
}

export function useAdminUsersListQuery(
  enabled: boolean,
  params: AdminUsersListParams,
) {
  const { page, limit, search, minClaims } = params;
  return useQuery({
    queryKey: [
      ...adminQueryKeys.users,
      "paged",
      page,
      limit,
      search ?? "",
      minClaims ?? "",
    ] as const,
    enabled,
    queryFn: async (): Promise<AdminUsersListData> => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const q = search?.trim();
      if (q) sp.set("search", q);
      if (minClaims !== undefined && minClaims > 0) {
        sp.set("minClaims", String(minClaims));
      }
      const path = `/api/v1/admin/users?${sp.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
      await throwIfResNotOk(res, path, "admin");
      const json = (await res.json()) as {
        items?: Record<string, unknown>[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
      };
      const items = (json.items ?? []).map(mapAdminUserItem);
      const total = json.total ?? 0;
      const totalPages = Math.max(1, json.totalPages ?? 1);
      return {
        items,
        total,
        page: json.page ?? page,
        limit: json.limit ?? limit,
        totalPages,
        hasNextPage: json.hasNextPage ?? false,
        hasPrevPage: json.hasPrevPage ?? false,
      };
    },
  });
}

export async function fetchAllAdminMerchantsForExport(filters: {
  search?: string;
  isVerified?: boolean;
}): Promise<ReturnType<typeof mapAdminMerchantItem>[]> {
  const out: ReturnType<typeof mapAdminMerchantItem>[] = [];
  let page = 1;
  for (;;) {
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(ADMIN_EXPORT_PAGE_SIZE),
    });
    const q = filters.search?.trim();
    if (q) sp.set("search", q);
    if (filters.isVerified !== undefined) {
      sp.set("isVerified", String(filters.isVerified));
    }
    const path = `/api/v1/admin/merchants?${sp.toString()}`;
    const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
    await throwIfResNotOk(res, path, "admin");
    const json = (await res.json()) as {
      items?: Record<string, unknown>[];
      total?: number;
    };
    const batch = (json.items ?? []).map(mapAdminMerchantItem);
    out.push(...batch);
    if (batch.length < ADMIN_EXPORT_PAGE_SIZE) break;
    if (out.length >= (json.total ?? out.length)) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}

export async function fetchAllAdminUsersForExport(filters: {
  search?: string;
  minClaims?: number;
}): Promise<ReturnType<typeof mapAdminUserItem>[]> {
  const out: ReturnType<typeof mapAdminUserItem>[] = [];
  let page = 1;
  for (;;) {
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(ADMIN_EXPORT_PAGE_SIZE),
    });
    const q = filters.search?.trim();
    if (q) sp.set("search", q);
    if (filters.minClaims !== undefined && filters.minClaims > 0) {
      sp.set("minClaims", String(filters.minClaims));
    }
    const path = `/api/v1/admin/users?${sp.toString()}`;
    const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
    await throwIfResNotOk(res, path, "admin");
    const json = (await res.json()) as {
      items?: Record<string, unknown>[];
      total?: number;
    };
    const batch = (json.items ?? []).map(mapAdminUserItem);
    out.push(...batch);
    if (batch.length < ADMIN_EXPORT_PAGE_SIZE) break;
    if (out.length >= (json.total ?? out.length)) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}

export async function fetchAllAdminDropsForExport(
  filters: Omit<AdminDropsListParams, "page" | "limit">,
): Promise<ReturnType<typeof mapAdminDropItem>[]> {
  const out: ReturnType<typeof mapAdminDropItem>[] = [];
  let page = 1;
  for (;;) {
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(ADMIN_EXPORT_PAGE_SIZE),
    });
    const q = filters.search?.trim();
    if (q) sp.set("search", q);
    if (filters.status && filters.status !== "all") {
      sp.set("status", filters.status);
    }
    if (filters.merchantId) sp.set("merchantId", filters.merchantId);
    if (filters.active !== undefined) {
      sp.set("active", String(filters.active));
    }
    const path = `/api/v1/admin/drops?${sp.toString()}`;
    const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
    await throwIfResNotOk(res, path, "admin");
    const json = (await res.json()) as {
      items?: Record<string, unknown>[];
      total?: number;
    };
    const batch = (json.items ?? []).map((row) => mapAdminDropItem(row));
    out.push(...batch);
    if (batch.length < ADMIN_EXPORT_PAGE_SIZE) break;
    if (out.length >= (json.total ?? out.length)) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}
