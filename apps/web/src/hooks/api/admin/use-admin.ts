"use client";

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
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
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
import {
  mapAdminAnalyticsToLegacy,
  mapAdminDropItem,
  mapAdminMerchantItem,
  mapAdminStatsToPlatform,
  mapAdminUserItem,
  mapPromoListToLegacy,
} from "@/lib/nest-mappers";

const ADMIN_LIST_LIMIT = 500;

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
      const res = await apiFetch(
        "GET",
        `/api/v1/admin/drops/${dropId}/codes`,
        { auth: "admin" }
      );
      if (res.status === 404) {
        return {
          codes: [] as { code: string; status: string }[],
          stats: { total: 0, available: 0, assigned: 0 },
        };
      }
      await throwIfResNotOk(res);
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
      const res = await apiFetch("GET", "/api/v1/admin/stats", {
        auth: "admin",
      });
      await throwIfResNotOk(res);
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
      const res = await apiFetch(
        "GET",
        `/api/v1/admin/analytics?${qs.toString()}`,
        { auth: "admin" }
      );
      await throwIfResNotOk(res);
      return mapAdminAnalyticsToLegacy(
        (await res.json()) as Record<string, unknown>
      );
    },
  });
}

export function useAdminMerchantsListQuery(enabled: boolean) {
  return useQuery({
    queryKey: [...adminQueryKeys.merchants, ADMIN_LIST_LIMIT] as const,
    enabled,
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        `/api/v1/admin/merchants?page=1&limit=${ADMIN_LIST_LIMIT}`,
        { auth: "admin" }
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        items?: Record<string, unknown>[];
      };
      return (json.items ?? []).map(mapAdminMerchantItem);
    },
  });
}

export function useAdminDropsListQuery(enabled: boolean) {
  return useQuery({
    queryKey: [...adminQueryKeys.drops, ADMIN_LIST_LIMIT] as const,
    enabled,
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        `/api/v1/admin/drops?page=1&limit=${ADMIN_LIST_LIMIT}`,
        { auth: "admin" }
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        items?: Record<string, unknown>[];
      };
      return (json.items ?? []).map((row) => mapAdminDropItem(row));
    },
  });
}

export function useAdminUsersListQuery(enabled: boolean) {
  return useQuery({
    queryKey: [...adminQueryKeys.users, ADMIN_LIST_LIMIT] as const,
    enabled,
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        `/api/v1/admin/users?page=1&limit=${ADMIN_LIST_LIMIT}`,
        { auth: "admin" }
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        items?: Record<string, unknown>[];
      };
      return (json.items ?? []).map(mapAdminUserItem);
    },
  });
}
