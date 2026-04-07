"use client";

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  setTokenBundle,
  setStoredUser,
  clearTokenBundle,
  getRefreshToken,
} from "@/lib/auth-tokens";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
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

export const merchantQueryKeys = {
  me: ["/api/v1/merchants/me"] as const,
  drops: ["/api/v1/merchants/me/drops"] as const,
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
      const local = data.email.split("@")[0] ?? "merchant";
      const username = local
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .slice(0, 30)
        .toLowerCase();
      const response = await apiRequest(
        "POST",
        "/api/v1/auth/merchant/register",
        {
          email: data.email,
          password: data.password,
          username: username || "merchant",
          businessName: data.businessName,
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
      const response = await apiRequest(
        "POST",
        "/api/v1/auth/merchant/forgot-password",
        data,
        { auth: undefined }
      );
      return response.json();
    },
  });
}

export function useMerchantResetPasswordMutation(token: string) {
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/v1/auth/merchant/reset-password/${token}`,
        data,
        { auth: undefined }
      );
      return response.json();
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
      clearTokenBundle("merchant");
    }
  }
  clearTokenBundle("merchant");
}

export function useMerchantAnalyticsQuery(
  from: string,
  to: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: merchantQueryKeys.analytics(from, to),
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        `/api/v1/merchants/me/analytics`,
        { auth: "merchant" }
      );
      await throwIfResNotOk(res);
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
      const res = await apiFetch(
        "GET",
        `/api/v1/merchants/me/drops/${dropId}/codes`,
        { auth: "merchant" }
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as Record<string, unknown>;
      return mapPromoListToLegacy(json);
    },
    enabled: !!dropId,
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

export function useMerchantMeQuery() {
  return useQuery({
    queryKey: merchantQueryKeys.me,
    queryFn: async () => {
      const res = await apiFetch("GET", "/api/v1/merchants/me", {
        auth: "merchant",
      });
      await throwIfResNotOk(res);
      const json = (await res.json()) as Record<string, unknown>;
      return mapMerchantMeToLegacy(json);
    },
  });
}

export function useMerchantDropsListQuery() {
  return useQuery({
    queryKey: merchantQueryKeys.drops,
    queryFn: async () => {
      const res = await apiFetch(
        "GET",
        "/api/v1/merchants/me/drops?page=1&limit=100",
        { auth: "merchant" }
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        drops?: Record<string, unknown>[];
      };
      return (json.drops ?? []).map((d) => mapNestDropToLegacy(d));
    },
  });
}

export function useMerchantScannerTokenQuery() {
  return useQuery({
    queryKey: merchantQueryKeys.scannerToken,
    queryFn: async () => {
      const res = await apiFetch("GET", "/api/v1/merchants/me/scanner-token", {
        auth: "merchant",
      });
      if (res.status === 404) return null;
      await throwIfResNotOk(res);
      return res.json() as Promise<Record<string, unknown> | null>;
    },
  });
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
