import type { Metadata, Viewport } from "next";
import "../globals.css";
import { inter, jetbrainsMono, spaceGrotesk } from "@/lib/fonts";
import { TIER_INIT_SCRIPT, TierProvider } from "@/lib/tier";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { GLMount } from "@/components/gl/GLMount";
import { Dock } from "@/components/hud/Dock";
import { Footer } from "@/components/hud/Footer";
import { Filament } from "@/components/hud/Filament";
import { GlassBudget } from "@/components/hud/GlassBudget";
import { getDictionary, isLocale, LOCALES, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TDR — High-performance motorcycle parts. Jakarta, since 2003.",
    template: "%s · TDR",
  },
  description:
    "TDR engineers, dyno-tests and manufactures high-performance motorcycle parts in Jakarta. Power, Handling, Style and Maintenance — with verified specs and fitment.",
};

export const viewport: Viewport = {
  themeColor: "#07090B",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  // middleware only routes en|id here; anything else falls back to en
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      data-tier="3"
      data-motion="static"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Runs before paint: no tier/motion flash. No-JS stays Tier 3 = fully legible. */}
        <script dangerouslySetInnerHTML={{ __html: TIER_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#content" className="skip-link">
          {dict.a11y.skipToContent}
        </a>
        <TierProvider>
          <LenisProvider>
            <GLMount />
            <Dock locale={locale} dict={dict} />
            <main id="content" className="relative z-10">
              {children}
            </main>
            <Footer locale={locale} dict={dict} />
            <Filament />
            {process.env.NODE_ENV !== "production" && <GlassBudget />}
          </LenisProvider>
        </TierProvider>
      </body>
    </html>
  );
}
