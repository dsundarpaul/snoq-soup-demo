function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

export const API_ORIGIN = rawApiUrl ? trimTrailingSlash(rawApiUrl) : "";

export function getPublicSiteUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  }

  return trimTrailingSlash(baseUrl);
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
