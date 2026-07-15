# CONTENT-GAPS.md — the honesty ledger

Rule (brief §8): **never invent a number.** The live legacy site and
`tdroneteam.com` were unreachable from this build environment (network policy
403), so everything normally harvested from them is built against the schema
and flagged here. Every `pending` verification state in `content/*.json`
renders as a visible `TBD · PENDING VERIFICATION` chip — closing a gap means
editing the JSON and flipping `verification` to `verified`.

## Brand & site chrome

| ID | Gap | Where | Owner |
|---|---|---|---|
| GAP-001 | `--redline` uses the brief's fallback `#E1231D`. Sample the exact red from `https://tdr-racing.com/assets/logo-b.svg` and update `app/globals.css` + `components/gl/fx/materials.ts`. Note: CTA fills use `color-mix(…80%, black)` of this token for WCAG contrast (QA-REPORT §3) — re-check contrast after resampling | tokens | design |
| GAP-002 | Logo is a placeholder wordmark SVG — replace with production artwork | `components/hud/Logo.tsx` | TDR |
| GAP-003 | WhatsApp number, phone, HQ address — all contact surfaces route to `/contact` pending chips; never a dead link | contact/where-to-buy/PDP | TDR |
| GAP-004 | Social channel URLs (WhatsApp/Instagram/YouTube) | contact | TDR |

## Catalogue (products.json — every SKU)

| ID | Gap | Notes |
|---|---|---|
| GAP-005 | **Part numbers** — all 15 SKUs ship `partNumber: "TBD"` | from TDR's catalogue |
| GAP-006 | **Specs** — every numeric spec value (bore, masses, rates, dimensions) is `pending`; only definitional values (fatbar 28.6mm clamp, 17″ rim, 6-pc roller set, 4-stroke) are `verified` | TDR engineering |
| GAP-007 | **Fitment** — all bike-specific records are name-derived and `pending`; `/fit` shows the pending copy variant until TDR engineering confirms. *Safety-critical: do not flip to verified without sign-off.* | TDR engineering |
| GAP-008 | **SKU list itself** — 15 products drawn from TDR's known lines (CVT sets, bore-up cylinder kits, belts, rollers, cams, ECU, exhaust, shock, fatbar, U-shape rim, disc, mirrors, gloves, oil, tools); verify names/lineup against the real catalogue, add long-tail SKUs | product |
| GAP-009 | Torque specs + per-SKU install guide PDFs (`downloads[].href: null`) | TDR engineering |
| GAP-010 | Dyno data (`dynoData: null` everywhere) — the red telemetry curve component activates when real runs land | dyno cell |
| GAP-011 | Product photography/galleries (`gallery: []`) — PDPs currently use 3D/renders + designed "media pending" panels | TDR |
| GAP-012 | Buy links: Tokopedia/Shopee/TDR HPZ official store URLs (`href: null` → disabled chips). JSON-LD `Offer` intentionally omitted until price+URL exist (priceless Offers fail validation) | commerce |

## 3D & media

| ID | Gap | Notes |
|---|---|---|
| GAP-013 | Commissioned GLBs A-01…A-09 (see ASSETS.md) replace procedural stand-ins; Tier-2 turntable webm renders for long-tail SKUs | TDR + vendor |
| GAP-014 | Track layout is stylised from Sentul International Circuit (4.12km, 11 turns — public figures); verify layout + confirm it may be depicted | One Team |
| GAP-015 | Racing: 2026 calendar, rider lineup, results, team history (all panels show pending states); `tdroneteam.com` content migration + domain redirect | One Team |
| GAP-016 | Dealer/distributor list — `dealers.json` holds only the Jakarta HQ (address pending); map arcs are labelled *coverage*, not dealers | sales |
| GAP-017 | Marketplace official-store URLs for the where-to-buy page | commerce |

## Copy & i18n

| ID | Gap | Notes |
|---|---|---|
| GAP-018 | Warranty terms, authenticity-check procedure (support page describes the process generically and says so) | TDR legal |
| GAP-019 | Technology Center: equipment lists, machining/coating tolerances, dyno spec — station chapters carry pending chips instead of invented values | TDR engineering |
| GAP-020 | Legacy URL crawl for exact one-to-one product redirects (see REDIRECTS.md) | SEO |
| GAP-021 | Bahasa Indonesia copy is complete for UI chrome + all shipped pages but authored in-house; native review recommended before launch | TDR marketing |
| GAP-022 | About: company history detail, facility data, group structure beyond "founded 2003, Jakarta, TDR Industries Group" (from the brief) | TDR |

## Verification workflow

1. TDR supplies the value (spec sheet, part number, URL, GLB…).
2. Edit the relevant `content/*.json`; set `verification: "verified"`.
3. `npm run build` — zod fails the build on malformed data.
4. The chip disappears and the value renders in measured mono, sitewide.
