import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import type { AuthRole } from "@/lib/api-client";

function filenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const unquoted = /filename=([^;\s]+)/i.exec(header);
  if (unquoted?.[1]) return unquoted[1].trim().replace(/^["']|["']$/g, "");
  return null;
}

export async function downloadAuthenticatedCsv(options: {
  path: string;
  query: Record<string, string | number | boolean | undefined>;
  fallbackFilename: string;
  auth: AuthRole;
}): Promise<void> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const suffix = qs.toString();
  const fullPath = suffix ? `${options.path}?${suffix}` : options.path;
  const res = await apiFetchMaybeRetry("GET", fullPath, {
    auth: options.auth,
  });
  await throwIfResNotOk(res, fullPath, options.auth);
  const blob = await res.blob();
  const filename =
    filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
    options.fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
