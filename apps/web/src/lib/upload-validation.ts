const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(
  file: File
): { valid: true } | { valid: false; message: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      message: `Invalid file type "${file.type || "unknown"}". Allowed: JPEG, PNG, WebP, SVG.`,
    };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      message: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 5MB.`,
    };
  }
  return { valid: true };
}

export const ACCEPTED_IMAGE_TYPES = ALLOWED_IMAGE_TYPES.join(",");
