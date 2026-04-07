"use client";

import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setLanguage(language === "en" ? "ar" : "en")}
      data-testid="button-language-toggle"
      title={language === "en" ? "العربية" : "English"}
    >
      <span className="text-xs font-bold">
        {language === "en" ? "ع" : "EN"}
      </span>
    </Button>
  );
}
