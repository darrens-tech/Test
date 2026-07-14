import en from "@/content/dictionaries/en.json";
import id from "@/content/dictionaries/id.json";

export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, id: id as Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** English is unprefixed (canonical); Bahasa lives under /id. */
export function localeHref(locale: Locale, path: string): string {
  if (locale === "en") return path;
  return path === "/" ? "/id" : `/id${path}`;
}

export function altLanguages(path: string): Record<string, string> {
  return {
    en: path,
    id: path === "/" ? "/id" : `/id${path}`,
    "x-default": path,
  };
}
