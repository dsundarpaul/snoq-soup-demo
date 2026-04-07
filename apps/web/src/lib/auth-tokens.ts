export type AuthRole = "merchant" | "admin" | "hunter";

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
};

const STORAGE: Record<AuthRole, string> = {
  merchant: "souqsnap_tokens_merchant",
  admin: "souqsnap_tokens_admin",
  hunter: "souqsnap_tokens_hunter",
};

const USER_STORAGE: Record<AuthRole, string> = {
  merchant: "souqsnap_user_merchant",
  admin: "souqsnap_user_admin",
  hunter: "souqsnap_user_hunter",
};

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getTokenBundle(role: AuthRole): TokenBundle | null {
  if (typeof window === "undefined") return null;
  return readJson<TokenBundle>(localStorage.getItem(STORAGE[role]));
}

export function getAccessToken(role: AuthRole): string | null {
  return getTokenBundle(role)?.accessToken ?? null;
}

export function getRefreshToken(role: AuthRole): string | null {
  return getTokenBundle(role)?.refreshToken ?? null;
}

function emitAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("souqsnap-auth-changed"));
}

export function setTokenBundle(role: AuthRole, tokens: TokenBundle): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE[role], JSON.stringify(tokens));
  emitAuthChanged();
}

export function clearTokenBundle(role: AuthRole): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE[role]);
  localStorage.removeItem(USER_STORAGE[role]);
  emitAuthChanged();
}

export function setStoredUser(role: AuthRole, user: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE[role], JSON.stringify(user));
}

export function getStoredUser<T>(role: AuthRole): T | null {
  if (typeof window === "undefined") return null;
  return readJson<T>(localStorage.getItem(USER_STORAGE[role]));
}

export function clearAllAuth(): void {
  (["merchant", "admin", "hunter"] as const).forEach((r) =>
    clearTokenBundle(r)
  );
}
