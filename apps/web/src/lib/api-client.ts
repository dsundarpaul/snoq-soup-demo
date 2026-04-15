import { API_ORIGIN } from "@/lib/app-config";
import {
  hadAuthCredentials,
  invalidateAuthSession,
} from "@/lib/auth-session";
import {
  type AuthRole,
  getAccessToken,
  getRefreshToken,
  setTokenBundle,
} from "@/lib/auth-tokens";

export type { AuthRole };

function formatApiErrorPayload(text: string): string {
  try {
    const j = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(j.message)) {
      return j.message.join(", ");
    }
    if (typeof j.message === "string" && j.message.length > 0) {
      return j.message;
    }
  } catch {
    /* keep raw text */
  }
  return text;
}

export function getUserFacingApiErrorMessage(error: unknown): string | null {
  if (error == null) {
    return null;
  }
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const withStatus = /^(\d{3}):\s*(.+)$/.exec(trimmed);
  if (withStatus) {
    const body = withStatus[2].trim();
    return body.length > 0 ? body : trimmed;
  }
  return trimmed;
}

export async function throwIfResNotOk(
  res: Response,
  requestPathFor401?: string,
  explicitRoleFor401?: AuthRole
): Promise<void> {
  if (!res.ok) {
    if (res.status === 401) {
      const role =
        explicitRoleFor401 ??
        (requestPathFor401
          ? inferAuthRoleFromPath(requestPathFor401)
          : undefined);
      if (role && hadAuthCredentials(role)) {
        invalidateAuthSession(role);
      }
    }
    const text = (await res.text()) || res.statusText;
    const detail = formatApiErrorPayload(text);
    throw new Error(`${res.status}: ${detail}`);
  }
}

export function inferAuthRoleFromPath(path: string): AuthRole | undefined {
  if (path.includes("/hunters/me")) return "hunter";
  if (path.includes("/admin/")) return "admin";
  if (path.includes("/merchants/me") || path.includes("/s3/")) {
    return "merchant";
  }
  return undefined;
}

type ApiFetchInit = {
  body?: unknown;
  auth?: AuthRole;
  deviceId?: string;
  json?: boolean;
};

export async function apiFetch(
  method: string,
  path: string,
  init?: ApiFetchInit
): Promise<Response> {
  const url = `${API_ORIGIN}${path}`;
  const headers: Record<string, string> = {};
  if (init?.body !== undefined && init?.json !== false) {
    headers["Content-Type"] = "application/json";
  }
  const role = init?.auth ?? inferAuthRoleFromPath(path);
  const access = role ? getAccessToken(role) : null;
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }
  if (init?.deviceId) {
    headers["X-Device-Id"] = init.deviceId;
  }
  return fetch(url, {
    method,
    headers,
    credentials: "omit",
    body:
      init?.body !== undefined && init?.json !== false
        ? JSON.stringify(init.body)
        : (init?.body as BodyInit | null | undefined),
  });
}

export async function apiFetchMaybeRetry(
  method: string,
  path: string,
  init?: ApiFetchInit
): Promise<Response> {
  const role = init?.auth ?? inferAuthRoleFromPath(path);
  const merged: ApiFetchInit = { ...init, auth: role };
  let res = await apiFetch(method, path, merged);
  if (res.status === 401 && role && (await tryRefreshAuth(role))) {
    res = await apiFetch(method, path, merged);
  }
  return res;
}

export async function tryRefreshAuth(role: AuthRole): Promise<boolean> {
  const refresh = getRefreshToken(role);
  if (!refresh) return false;
  const res = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  setTokenBundle(role, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return true;
}
