export function safeRelativeNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/profile";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/profile";
  return trimmed;
}

export function hunterAuthNextQuery(rawNext: string | null): string {
  if (!rawNext) return "";
  const path = safeRelativeNextPath(rawNext);
  return `?next=${encodeURIComponent(path)}`;
}
