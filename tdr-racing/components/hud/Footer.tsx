import Link from "next/link";
import { Logo } from "./Logo";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();
  const cols: Array<[string, Array<[string, string]>]> = [
    [
      dict.nav.products,
      [
        ["/products/power", "Power"],
        ["/products/handling", "Handling"],
        ["/products/style", "Style"],
        ["/products/maintenance", "Maintenance"],
      ],
    ],
    [
      dict.footer.sitemap,
      [
        ["/fit", dict.nav.fit],
        ["/technology", dict.nav.technology],
        ["/racing", dict.nav.racing],
        ["/news", dict.nav.news],
        ["/downloads", dict.nav.downloads],
      ],
    ],
    [
      dict.nav.support,
      [
        ["/support", dict.nav.support],
        ["/where-to-buy", dict.nav.whereToBuy],
        ["/about", dict.nav.about],
        ["/contact", dict.nav.contact],
      ],
    ],
  ];

  return (
    <footer className="relative z-10 border-t border-(--glass-brd) bg-bay">
      <div className="container-x grid gap-10 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-7 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-chrome">{dict.footer.tagline}</p>
          <p className="micro mt-6">{dict.footer.build}</p>
        </div>
        {cols.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="micro micro--hud mb-4">{title}</h2>
            <ul className="space-y-2.5">
              {links.map(([path, label]) => (
                <li key={path}>
                  <Link
                    href={localeHref(locale, path)}
                    className="text-sm text-chrome transition-colors duration-200 hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-(--glass-brd)">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="micro">
            © {year} {dict.footer.legal} · Jakarta
          </p>
          <p className="micro">
            {dict.footer.language}:{" "}
            <Link href={locale === "id" ? "/" : "/id"} className="text-white underline-offset-4 hover:underline">
              {locale === "id" ? "English" : "Bahasa Indonesia"}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
