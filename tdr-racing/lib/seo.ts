import type { Metadata } from "next";
import { altLanguages, localeHref, type Locale } from "./i18n";

export const SITE_URL = "https://tdr-racing.com";

export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: localeHref(locale, path),
      languages: altLanguages(path),
    },
    openGraph: {
      title,
      description,
      url: localeHref(locale, path),
      siteName: "TDR",
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "website",
    },
  };
}
