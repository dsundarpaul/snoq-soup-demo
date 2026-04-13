import {
  clearTokenBundle,
  type AuthRole,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth-tokens";

const HUNTER_SUPPRESS_DEVICE_LOGIN_KEY = "souqsnap_hunter_suppress_device_login";

const LOGIN_PATHS: Record<AuthRole, string> = {
  merchant: "/merchant",
  hunter: "/login",
  admin: "/admin",
};

export function hadAuthCredentials(role: AuthRole): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getAccessToken(role) || getRefreshToken(role));
}

export function invalidateAuthSession(role: AuthRole): void {
  if (typeof window === "undefined") return;
  clearTokenBundle(role);
  window.location.assign(LOGIN_PATHS[role]);
}

export function clearSessionsExcept(targetRole: AuthRole): void {
  (["merchant", "hunter", "admin"] as const).forEach((r) => {
    if (r !== targetRole) {
      clearTokenBundle(r);
    }
  });
}

export function setHunterSuppressDeviceLoginAfterLogout(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HUNTER_SUPPRESS_DEVICE_LOGIN_KEY, "1");
}

export function clearHunterSuppressDeviceLogin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HUNTER_SUPPRESS_DEVICE_LOGIN_KEY);
}

export function isHunterDeviceLoginSuppressed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HUNTER_SUPPRESS_DEVICE_LOGIN_KEY) === "1";
}
