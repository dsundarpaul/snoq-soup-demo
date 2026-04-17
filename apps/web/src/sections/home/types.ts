import type { TranslationKey } from "@/locales/en";

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;
