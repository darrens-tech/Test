# tdr-racing.com v2 — MACHINE OS

Cinematic WebGL rebuild of TDR's global site: a dark machine-shop environment
rendered live behind a floating glass HUD, tiered at runtime so a mid-range
Android on 4G gets the same content as a gaming desktop — never a broken
viewport, never an invented number.

## Run

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

Force a tier for testing: `?tier=1|2|3` (session-sticky).
QA hooks (sessionStorage): `tdr-watchdog=off`, `tdr-qa-pose=1`, `tdr-intro=1`.

## QA / media pipeline (against `next start` on :3010)

```bash
npm run media:render   # re-render Tier 2/3 posters + exploded stills from the live scenes
npm run qa:axe         # WCAG 2.2 AA sweep (36 page-tier runs)
npm run qa:screens     # 72-screenshot matrix (widths × tiers)
npm run qa:capture     # 15s scroll captures of Home + Technology
```

## Map

| | |
|---|---|
| `DESIGN-PLAN.md` | art direction, four scenes, storyboards, §12.2 critique |
| `MOTION.md` | timing tokens + every ScrollTrigger chapter |
| `ASSETS.md` | 3D inventory, budgets, Blender/gltf-transform settings |
| `REDIRECTS.md` | legacy `/products-2` migration, `?page=INF` kill |
| `CONTENT-GAPS.md` | the honesty ledger — every TBD, who closes it |
| `QA-REPORT.md` | Lighthouse, axe, bundles, tiers, §12.4 removal |
| `components/gl/` | scenes (Machine/Workshop/Track/Archipelago), procedural parts, materialise/dust fx |
| `components/product/ExplodedViewer*` | the signature scroll-disassembly viewport |
| `lib/tier.tsx` | pre-paint tier detection, GPU bench, FPS watchdog, self-healing |
| `content/` | zod-validated catalogue with per-value verification states |

Deploy target: Netlify (Next 15 App Router runtime). i18n: `/` = EN,
`/id/*` = Bahasa Indonesia.
