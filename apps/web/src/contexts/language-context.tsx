"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "@/locales/en";
import ar from "@/locales/ar";
import type { TranslationKey } from "@/locales/en";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const translations = { en, ar };

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("souq-snap-lang") as Language) || "en";
    }
    return "en";
  });

  const isRTL = language === "ar";

  useEffect(() => {
    localStorage.setItem("souq-snap-lang", language);
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = String(translations[language]?.[key] ?? translations.en[key] ?? key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
