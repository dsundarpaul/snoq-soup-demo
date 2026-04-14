"use client";

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clearSessionsExcept } from "@/lib/auth-session";
import {
  setTokenBundle,
  setStoredUser,
  clearTokenBundle,
  getRefreshToken,
} from "@/lib/auth-tokens";
import { apiFetch, apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import {
  mapAuthUserToMerchant,
  mapMerchantMeToLegacy,
  mapMerchantAnalyticsToLegacy,
  mapMerchantPublicToStoreData,
  mapNestDropToLegacy,
  mapPromoListToLegacy,
} from "@/lib/nest-mappers";
import type { Merchant } from "@shared/schema";
import type {
  MerchantLoginInput,
  MerchantSignupInput,
} from "./merchant.api-types";
import { dropQueryKeys } from "@/hooks/api/drop/use-drop";

export type MerchantDropsListStatus =
  | "all"
  | "active"
  | "inactive"
  | "scheduled"
  | "expired";

export function clearMerchantSessionQueries(): void {
  queryClient.removeQueries({
    predicate: (q) => {
      const k0 = q.queryKey[0];
      return (
        typeof k0 === "string" && k0.includes("/api/v1/merchants/")
      );
    },
  });
}

export const merchantQueryKeys = {
  me: ["/api/v1/merchants/me"] as const,
  drops: ["/api/v1/merchants/me/drops"] as const,
  dropsList: (
    page: number,
    limit: number,
    search: string,
    status: MerchantDropsListStatus
  ) =>
    [
      ...merchantQueryKeys.drops,
      page,
      limit,
      search,
      status,
    ] as const,
  stats: ["/api/v1/merchants/me/stats"] as const,
  analytics: (from: string, to: string) =>
    ["/api/v1/merchants/me/analytics", from, to] as const,
  dropCodes: (dropId: string) =>
    ["/api/v1/merchants/me/drops", dropId, "codes"] as const,
  scannerToken: ["/api/v1/merchants/me/scanner-token"] as const,
};

export function useMerchantLoginMutation(
  options?: Omit<
    UseMutationOptions<Merchant, Error, MerchantLoginInput>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: MerchantLoginInput) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/auth/merchant/login",
        {
          email: data.email,
          password: data.password,
        },
        { auth: undefined }
      );
      const body = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: Record<string, unknown>;
      };
      setTokenBundle("merchant", {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });
      setStoredUser("merchant", body.user);
      return mapAuthUserToMerchant(body.user);
    },
    onSuccess: (...args) => {
      clearMerchantSessionQueries();
      clearSessionsExcept("merchant");
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantSignupMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, MerchantSignupInput>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: MerchantSignupInput) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/auth/merchant/register",
        {
          email: data.email,
          password: data.password,
          businessName: data.businessName,
          username: data.username.trim().toLowerCase(),
        },
        { auth: undefined }
      );
      const body = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: Record<string, unknown>;
      };
      setTokenBundle("merchant", {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });
      setStoredUser("merchant", body.user);
      return body;
    },
    onSuccess: (...args) => {
      clearMerchantSessionQueries();
      clearSessionsExcept("merchant");
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantResendVerificationMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, { email: string }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async ({ email }: { email: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/auth/merchant/resend-verification",
        { email },
        { auth: undefined }
      );
      return response.json();
    },
  });
}

export function useMerchantForgotPasswordMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, { email: string }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: { email: string }) => {
      await apiRequest(
        "POST",
        "/api/v1/auth/merchant/forgot-password",
        data,
        { auth: undefined }
      );
    },
  });
}

export function useMerchantResetPasswordMutation(token: string) {
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      await apiRequest(
        "POST",
        `/api/v1/auth/merchant/reset-password/${token}`,
        data,
        { auth: undefined }
      );
    },
  });
}

export async function merchantLogout(): Promise<void> {
  const refresh = getRefreshToken("merchant");
  if (refresh) {
    try {
      await apiRequest(
        "POST",
        "/api/v1/auth/logout",
        { refreshToken: refresh },
        { auth: "merchant" }
      );
    } catch {
      /* tokens cleared below */
    }
  }
  clearTokenBundle("merchant");
  clearMerchantSessionQueries();
}

export function useMerchantAnalyticsQuery(
  from: string,
  to: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: merchantQueryKeys.analytics(from, to),
    queryFn: async () => {
      const path = "/api/v1/merchants/me/analytics";
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "merchant",
      });
      await throwIfResNotOk(res, path, "merchant");
      const json = (await res.json()) as Record<string, unknown>;
      return mapMerchantAnalyticsToLegacy(json);
    },
    enabled,
  });
}

export function useMerchantDropCodesQuery(dropId: string | null) {
  return useQuery({
    queryKey: dropId
      ? merchantQueryKeys.dropCodes(dropId)
      : ["merchant-drop-codes-disabled"],
    queryFn: async () => {
      const path = `/api/v1/merchants/me/drops/${dropId}/codes`;
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "merchant",
      });
      await throwIfResNotOk(res, path, "merchant");
      const json = (await res.json()) as Record<string, unknown>;
      return mapPromoListToLegacy(json);
    },
    enabled: !!dropId,
  });
}

export function useMerchantStoreLocationMutation(
  options?: Omit<
    UseMutationOptions<
      unknown,
      Error,
      {
        storeLocation: {
          lat: number;
          lng: number;
          address?: string;
          city?: string;
          state?: string;
          pincode?: string;
          landmark?: string;
          howToReach?: string;
        };
      }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: {
      storeLocation: {
        lat: number;
        lng: number;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        landmark?: string;
        howToReach?: string;
      };
    }) => {
      const res = await apiRequest(
        "PATCH",
        "/api/v1/merchants/me/store-location",
        data,
        { auth: "merchant" }
      );
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.me });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantLogoMutation(
  options?: Omit<
    UseMutationOptions<unknown, Error, { logoUrl: string }>,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: { logoUrl: string }) => {
      const res = await apiRequest("PATCH", "/api/v1/merchants/me/logo", data, {
        auth: "merchant",
      });
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.me });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantProfileMutation(
  options?: Omit<
    UseMutationOptions<
      unknown,
      Error,
      { businessPhone?: string; businessHours?: string }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: {
      businessPhone?: string;
      businessHours?: string;
    }) => {
      const res = await apiRequest(
        "PATCH",
        "/api/v1/merchants/me",
        data,
        { auth: "merchant" }
      );
      return res.json();
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.me });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantMeQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: merchantQueryKeys.me,
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const path = "/api/v1/merchants/me";
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "merchant",
      });
      await throwIfResNotOk(res, path, "merchant");
      const json = (await res.json()) as Record<string, unknown>;
      return mapMerchantMeToLegacy(json);
    },
  });
}

export function useMerchantDropsListQuery(params: {
  page: number;
  limit: number;
  search: string;
  status: MerchantDropsListStatus;
  enabled?: boolean;
}) {
  const { page, limit, search, status, enabled = true } = params;
  return useQuery({
    queryKey: merchantQueryKeys.dropsList(page, limit, search, status),
    enabled,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const q = search.trim();
      if (q) sp.set("search", q);
      if (status !== "all") sp.set("status", status);
      const path = `/api/v1/merchants/me/drops?${sp.toString()}`;
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "merchant",
      });
      await throwIfResNotOk(res, path, "merchant");
      const json = (await res.json()) as {
        drops?: Record<string, unknown>[];
        total?: number;
        page?: number;
        limit?: number;
      };
      return {
        drops: (json.drops ?? []).map((d) => mapNestDropToLegacy(d)),
        total: json.total ?? 0,
        page: json.page ?? page,
        limit: json.limit ?? limit,
      };
    },
  });
}

export function useMerchantDropActiveMutation(
  options?: Omit<
    UseMutationOptions<
      Record<string, unknown>,
      Error,
      { dropId: string; active: boolean }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async ({
      dropId,
      active,
    }: {
      dropId: string;
      active: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/merchants/me/drops/${dropId}`,
        { active },
        { auth: "merchant" }
      );
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.drops });
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: dropQueryKeys.all });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantScannerTokenQuery() {
  return useQuery({
    queryKey: merchantQueryKeys.scannerToken,
    queryFn: async () => {
      const path = "/api/v1/merchants/me/scanner-token";
      const res = await apiFetchMaybeRetry("GET", path, {
        auth: "merchant",
      });
      if (res.status === 404) return null;
      await throwIfResNotOk(res, path, "merchant");
      return res.json() as Promise<Record<string, unknown> | null>;
    },
  });
}

const EXPORT_PAGE_SIZE = 100;

export async function fetchAllMerchantDropsForExport(filters: {
  search?: string;
  status?: MerchantDropsListStatus;
}): Promise<ReturnType<typeof mapNestDropToLegacy>[]> {
  const out: ReturnType<typeof mapNestDropToLegacy>[] = [];
  let page = 1;
  for (;;) {
    const sp = new URLSearchParams({ page: String(page), limit: String(EXPORT_PAGE_SIZE) });
    const s = filters.search?.trim();
    if (s) sp.set("search", s);
    if (filters.status && filters.status !== "all") sp.set("status", filters.status);
    const path = `/api/v1/merchants/me/drops?${sp.toString()}`;
    const res = await apiFetchMaybeRetry("GET", path, { auth: "merchant" });
    await throwIfResNotOk(res, path, "merchant");
    const json = (await res.json()) as {
      drops?: Record<string, unknown>[];
      total?: number;
    };
    const batch = (json.drops ?? []).map((d) => mapNestDropToLegacy(d));
    out.push(...batch);
    if (batch.length < EXPORT_PAGE_SIZE) break;
    if (out.length >= (json.total ?? out.length)) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}

export function useMerchantPublicStoreQuery(username: string | undefined) {
  return useQuery({
    queryKey: username
      ? ([`/api/v1/merchants/${username}/public`] as const)
      : (["merchant-public-disabled"] as const),
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        `/api/v1/merchants/${encodeURIComponent(username!)}/public`
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as Record<string, unknown>;
      return mapMerchantPublicToStoreData(json);
    },
    enabled: !!username,
  });
}
