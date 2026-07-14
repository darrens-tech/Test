import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["en", "id"] as const;

/**
 * URL policy:
 *  - English is the default and lives unprefixed (`/technology`).
 *  - Bahasa Indonesia lives under `/id/*`.
 *  - `/en/*` is never a public URL — it 308s to the unprefixed canonical.
 *  - The legacy `?page=` parameter (the `?page=INF` bug) dies here with a 301.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Kill the legacy pagination parameter anywhere in the products tree.
  if (searchParams.has("page") && /^\/(id\/)?products(-2)?(\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("page");
    return NextResponse.redirect(url, 301);
  }

  const seg = pathname.split("/")[1];

  // `/en/*` → canonical unprefixed URL.
  if (seg === "en") {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  // `/id/*` matches app/[locale] natively.
  if ((LOCALES as readonly string[]).includes(seg)) return NextResponse.next();

  // Everything else is English: rewrite internally to /en/*.
  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip static assets and Next internals.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
