import { API_ORIGIN } from "@/lib/app-config";
import {
  hadAuthSessionHint,
  invalidateAuthSession,
} from "@/lib/auth-session";
import type { AuthRole } from "@/lib/auth-tokens";

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
      if (role && hadAuthSessionHint()) {
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

const defaultHeaders = (): Record<string, string> => ({
  "X-Requested-With": "fetch",
});

export async function apiFetch(
  method: string,
  path: string,
  init?: ApiFetchInit
): Promise<Response> {
  const url = `${API_ORIGIN}${path}`;
  const headers: Record<string, string> = { ...defaultHeaders() };
  if (init?.body !== undefined && init?.json !== false) {
    headers["Content-Type"] = "application/json";
  }
  if (init?.deviceId) {
    headers["X-Device-Id"] = init.deviceId;
  }
  return fetch(url, {
    method,
    headers,
    credentials: "include",
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
  if (res.status === 401 && role && (await tryRefreshAuth())) {
    res = await apiFetch(method, path, merged);
  }
  return res;
}

const S3_SIGNED_URL_PATH = "/api/v1/s3/signed-url";
const shouldSendS3PutAcl =
  process.env.NEXT_PUBLIC_S3_PUT_ACL?.toLowerCase() !== "none";

function resolveUploadContentType(file: File): string {
  if (file.type && file.type.trim().length > 0) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function uploadFileViaS3Presigned(
  file: File,
  options: { namespace: string; auth?: AuthRole }
): Promise<{ publicUrl: string }> {
  const role = options.auth ?? inferAuthRoleFromPath(S3_SIGNED_URL_PATH);
  const contentType = resolveUploadContentType(file);
  const signedRes = await apiFetchMaybeRetry("POST", S3_SIGNED_URL_PATH, {
    auth: role,
    body: {
      fileName: file.name,
      contentType,
      size: file.size,
      namespace: options.namespace,
    },
  });
  await throwIfResNotOk(signedRes, S3_SIGNED_URL_PATH, role);
  const { url, publicUrl } = (await signedRes.json()) as {
    url: string;
    publicUrl: string;
  };
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: contentType });
  const putHeaders: Record<string, string> = {
    "Content-Type": contentType,
  };
  if (shouldSendS3PutAcl) {
    putHeaders["x-amz-acl"] = "public-read";
  }
  const putRes = await fetch(url, {
    method: "PUT",
    body: blob,
    headers: putHeaders,
  });
  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(
      text.trim().length > 0
        ? `S3 upload failed: ${putRes.status}: ${text}`
        : `S3 upload failed: ${putRes.status}`
    );
  }
  return { publicUrl };
}

let inFlightRefresh: Promise<boolean> | null = null;

export async function tryRefreshAuth(): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = doRefreshAuth().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

async function doRefreshAuth(): Promise<boolean> {
  const res = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...defaultHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({}),
  });
  return res.ok;
}
