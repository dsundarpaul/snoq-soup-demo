export function slugifyBusinessNameForMerchantUsername(
  businessName: string
): string {
  const trimmed = businessName.trim().toLowerCase();
  let base = trimmed
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
  if (base.length === 0) {
    return "";
  }
  while (base.length < 3) {
    base = `${base}x`;
  }
  return base.slice(0, 30);
}
