"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Floating glass dock — the nav. One of the ≤3 blurred panels allowed per
 * viewport (DESIGN-PLAN §3). Mobile opens a solid-steel overlay (no blur
 * stacking), focus-trapped, Esc to close.
 */
export function Dock({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const links: Array<[string, string]> = [
    ["/fit", dict.nav.fit],
    ["/products", dict.nav.products],
    ["/technology", dict.nav.technology],
    ["/racing", dict.nav.racing],
    ["/news", dict.nav.news],
    ["/support", dict.nav.support],
    ["/where-to-buy", dict.nav.whereToBuy],
  ];

  const isActive = (path: string) => {
    const p = pathname.replace(/^\/id(?=\/|$)/, "") || "/";
    return path === "/" ? p === "/" : p.startsWith(path);
  };

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    const focusables = overlay?.querySelectorAll<HTMLElement>("a, button");
    focusables?.[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const switchLocalePath = () => {
    const bare = pathname.replace(/^\/id(?=\/|$)/, "") || "/";
    return locale === "en" ? (bare === "/" ? "/id" : `/id${bare}`) : bare;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
      <nav
        aria-label="Primary"
        className="panel pointer-events-auto mx-auto mt-4 flex w-[min(96vw,1200px)] items-center justify-between gap-4 !rounded-full px-5 py-2.5"
      >
        <Link
          href={localeHref(locale, "/")}
          className="flex items-center gap-2"
          aria-label="TDR — home"
        >
          <Logo className="h-6 w-auto" />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map(([path, label]) => (
            <li key={path}>
              <Link
                href={localeHref(locale, path)}
                aria-current={isActive(path) ? "page" : undefined}
                className={`micro relative rounded-full px-3 py-2 transition-colors duration-200 hover:text-white ${
                  isActive(path) ? "text-white" : ""
                }`}
              >
                {isActive(path) && (
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-0.5 h-0.5 w-3 -translate-x-1/2 bg-hud"
                  />
                )}
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href={switchLocalePath()}
            className="micro rounded-full border border-(--glass-brd) px-3 py-2 hover:text-white"
            aria-label={locale === "en" ? "ID — Bahasa Indonesia" : "EN — English"}
          >
            {locale === "en" ? "ID" : "EN"}
          </Link>
          <Link
            href={localeHref(locale, "/fit")}
            className="btn btn-primary hidden !py-2 sm:inline-flex"
          >
            {dict.nav.fit}
          </Link>
          <button
            type="button"
            className="micro rounded-full border border-(--glass-brd) px-3 py-2 lg:hidden"
            aria-expanded={open}
            aria-controls="dock-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? dict.nav.close : dict.nav.menu}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="dock-menu"
          ref={overlayRef}
          className="pointer-events-auto fixed inset-0 z-40 bg-void/95 pt-24 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={dict.a11y.openMenu}
        >
          <ul className="mx-auto flex w-[min(92vw,480px)] flex-col gap-1">
            {links.map(([path, label], i) => (
              <li key={path}>
                <Link
                  href={localeHref(locale, path)}
                  className="panel panel--solid ticks block px-6 py-4 font-(family-name:--font-display) text-2xl"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex gap-2">
              <Link href={localeHref(locale, "/about")} className="btn btn-ghost flex-1 justify-center">
                {dict.nav.about}
              </Link>
              <Link href={localeHref(locale, "/contact")} className="btn btn-ghost flex-1 justify-center">
                {dict.nav.contact}
              </Link>
            </li>
          </ul>
          <button
            type="button"
            className="btn btn-ghost absolute right-5 top-5"
            onClick={() => setOpen(false)}
          >
            {dict.nav.close}
          </button>
        </div>
      )}
    </header>
  );
}
