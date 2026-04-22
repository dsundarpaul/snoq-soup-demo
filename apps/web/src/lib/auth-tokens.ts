export type AuthRole = "merchant" | "admin" | "hunter";

const LEGACY_KEYS = [
  "souqsnap_tokens_merchant",
  "souqsnap_tokens_admin",
  "souqsnap_tokens_hunter",
  "souqsnap_user_merchant",
  "souqsnap_user_admin",
  "souqsnap_user_hunter",
] as const;

export function emitAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("souqsnap-auth-changed"));
}

export function clearTokenBundle(role: AuthRole): void {
  void role;
  emitAuthChanged();
}

export function clearAllAuth(): void {
  emitAuthChanged();
}

export function purgeLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  for (const k of LEGACY_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}
