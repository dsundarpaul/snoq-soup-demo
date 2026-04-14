export const HUNTER_PHONE_DEFAULT_BOUNDS = { min: 7, max: 15 } as const;

const OVERRIDES: Record<string, { min: number; max: number }> = {
  "+966": { min: 9, max: 9 },
  "+91": { min: 10, max: 10 },
};

export function getHunterNationalNumberBounds(dialCode: string): {
  min: number;
  max: number;
} {
  return OVERRIDES[dialCode] ?? { ...HUNTER_PHONE_DEFAULT_BOUNDS };
}

export const PHONE_DIAL_CODE_CHOICES: readonly string[] = Array.from(
  new Set(Object.keys(OVERRIDES))
).sort((a, b) => a.localeCompare(b));

export function hunterMobileLengthHint(bounds: {
  min: number;
  max: number;
}): string {
  if (bounds.min === bounds.max) {
    return `${bounds.min} digits`;
  }
  return `${bounds.min}–${bounds.max} digits`;
}
