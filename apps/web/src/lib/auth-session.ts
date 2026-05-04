import {
  clearTokenBundle,
  emitAuthChanged,
  type AuthRole,
} from "@/lib/auth-tokens";

const SESSION_HINT_KEY = "souqsnap_session_hint";

const HUNTER_SUPPRESS_DEVICE_LOGIN_KEY = "souqsnap_hunter_suppress_device_login";

const LOGIN_PATHS: Record<AuthRole, string> = {
  merchant: "/merchant",
  hunter: "/login",
  admin: "/admin",
};

export function setAuthSessionHint(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_HINT_KEY, "1");
  emitAuthChanged();
}

export function clearAuthSessionHint(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_HINT_KEY);
}

export function hadAuthSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_HINT_KEY) === "1";
}

export function invalidateAuthSession(role: AuthRole): void {
  if (typeof window === "undefined") return;
  clearAuthSessionHint();
  clearTokenBundle(role);
  window.location.assign(LOGIN_PATHS[role]);
}

export function clearSessionsExcept(targetRole: AuthRole): void {
  void targetRole;
  emitAuthChanged();
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
