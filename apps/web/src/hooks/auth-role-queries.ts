import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import { clearAuthSessionHint } from "@/lib/auth-session";
import { clearTokenBundle, type AuthRole } from "@/lib/auth-tokens";
import {
  mapHunterProfileToLegacy,
  mapMerchantMeToLegacy,
} from "@/lib/nest-mappers";

export const CREDENTIAL_PATH: Record<AuthRole, string> = {
  merchant: "/api/v1/merchants/me",
  admin: "/api/v1/admin/me",
  hunter: "/api/v1/hunters/me",
};

export async function fetchMerchantMeCredential() {
  const path = CREDENTIAL_PATH.merchant;
  const res = await apiFetchMaybeRetry("GET", path, { auth: "merchant" });
  if (res.status === 401) return null;
  await throwIfResNotOk(res, path, "merchant");
  const json = (await res.json()) as Record<string, unknown>;
  return mapMerchantMeToLegacy(json);
}

export async function fetchHunterMeCredential() {
  const path = CREDENTIAL_PATH.hunter;
  const res = await apiFetchMaybeRetry("GET", path, { auth: "hunter" });
  if (res.status === 401) return null;
  await throwIfResNotOk(res, path, "hunter");
  const json = (await res.json()) as Record<string, unknown>;
  return mapHunterProfileToLegacy(json);
}

export async function fetchAdminMeCredential() {
  const path = CREDENTIAL_PATH.admin;
  const res = await apiFetchMaybeRetry("GET", path, { auth: "admin" });
  if (res.status === 401 || res.status === 403) {
    clearAuthSessionHint();
    clearTokenBundle("admin");
    return null;
  }
  await throwIfResNotOk(res, path, "admin");
  return (await res.json()) as {
    admin: { id: string; email: string; name: string };
  };
}

export function credentialQueryFn(role: AuthRole) {
  if (role === "merchant") return fetchMerchantMeCredential;
  if (role === "hunter") return fetchHunterMeCredential;
  return fetchAdminMeCredential;
}
