function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const DEFAULT_PUBLIC_SITE_URL = "https://souq-snap.com";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

export const API_ORIGIN = rawApiUrl ? trimTrailingSlash(rawApiUrl) : "";

export function getPublicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return trimTrailingSlash(fromEnv);
  }
  return DEFAULT_PUBLIC_SITE_URL;
}

export function publicPageUrl(path: string): string {
  const base = getPublicSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export const publicUrls = {
  staffScan: (token: string) =>
    publicPageUrl(`/scan/${encodeURIComponent(token)}`),
  drop: (id: string) => publicPageUrl(`/drop/${encodeURIComponent(id)}`),
  store: (username: string) =>
    publicPageUrl(`/store/${encodeURIComponent(username)}`),
  voucher: (magicToken: string) =>
    publicPageUrl(`/voucher/${encodeURIComponent(magicToken)}`),
} as const;
