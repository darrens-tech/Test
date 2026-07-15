# REDIRECTS.md — legacy URL migration

Implemented in `next.config.ts` (`redirects()`) + `middleware.ts`. All
category redirects are **301 (permanent)**; `/en/*` canonicalisation is 308.

## 1. The `?page=INF` bug — dead

`middleware.ts` 301s any `/products*` or `/products-2*` URL carrying a `page`
query parameter to the same URL without it. The new catalogue does not
paginate by query string, so `?page=INF` (and every other value) dies at the
edge before rendering.

## 2. Legacy catalogue → new tree

| Legacy (CMS leftover) | New | Type |
|---|---|---|
| `/products-2` | `/products` | 301 |
| `/products-2/power` (+handling/style/maintenance) | `/products/{pillar}` | 301 |
| `/products-2/engine` | `/products/power/engine` | 301 |
| `/products-2/electrical` | `/products/power/electrical` | 301 |
| `/products-2/clutch-transmission-cvt` | `/products/power/clutch-transmission-cvt` | 301 |
| `/products-2/induction-exhaust` | `/products/power/induction-exhaust` | 301 |
| `/products-2/suspension-chassis` | `/products/handling/suspension-chassis` | 301 |
| `/products-2/wheel` | `/products/handling/wheel` | 301 |
| `/products-2/brake` | `/products/handling/brake` | 301 |
| `/products-2/body` | `/products/style/body` | 301 |
| `/products-2/riding-gears` | `/products/style/riding-gears` | 301 |
| `/products-2/lubricants` | `/products/maintenance/lubricants` | 301 |
| `/products-2/tools-equipment` | `/products/maintenance/tools-equipment` | 301 |
| `/products-2/{subcategory}/{product}` | `/products/{pillar}/{subcategory}/{product}` | 301 |
| `/products-2/*` (anything unmapped) | `/products` | 301 (safety net) |

**GAP-020:** the legacy site is unreachable from this build environment, so
the exact legacy product-slug list could not be crawled. The subcategory
vocabulary above is the four-pillar taxonomy the brief confirms is carried
over verbatim; per-product one-to-one mappings should be verified against a
crawl of the legacy sitemap before launch and added as explicit rules above
the wildcard. The wildcard guarantees no legacy URL 404s in the meantime.

## 3. Locale canonicalisation

| Pattern | Behaviour |
|---|---|
| `/en/:path*` | 308 → `/:path*` (English is unprefixed and canonical) |
| `/:path*` (non-locale) | internal rewrite → `/en/:path*` (no visible redirect) |
| `/id/:path*` | served directly (Bahasa Indonesia) |

`hreflang` alternates (`en`, `id`, `x-default`) are emitted on every route and
in `sitemap.xml`.

## 4. Other legacy paths

Racing content from `tdroneteam.com` is absorbed at `/racing` (brief §7).
A domain-level redirect `tdroneteam.com/* → tdr-racing.com/racing` must be
configured at the DNS/host of that domain — outside this repo, logged GAP-015.
