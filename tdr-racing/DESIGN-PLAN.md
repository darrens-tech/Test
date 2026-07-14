# DESIGN-PLAN — tdr-racing.com v2 · MACHINE OS

Status: approved for build after the §12.2 critique at the end of this file.
Scope: cinematic WebGL rebuild of tdr-racing.com per the v2 brief. This document is the
single source of truth for art direction, scenes, budgets and tier fallbacks.
Companion docs: `MOTION.md` (every timing token and ScrollTrigger chapter),
`ASSETS.md` (3D inventory + export settings), `REDIRECTS.md`, `CONTENT-GAPS.md`.

---

## 0. Thesis

The site behaves like TDR's own diagnostic operating system. A dark machine-shop
environment runs live in WebGL behind a floating glass HUD. Cyan is data. Red is TDR.
Every number on screen is measured or it is marked `TBD · PENDING VERIFICATION` —
the HUD aesthetic makes honesty visible instead of hiding it.

The live site is unreachable from this build environment (network policy 403), so:

- `--redline` uses the brief's sanctioned fallback `#E1231D`. Sampling the exact red
  from `https://tdr-racing.com/assets/logo-b.svg` is logged in `CONTENT-GAPS.md` (GAP-001).
- All SKUs, specs, fitment, dealers, buy-links are built against the §8 schema with
  per-field verification flags. **No number is invented.** Products are drawn from
  TDR's known catalogue lines (cylinder bore-up kits, CVT sets, belts, handlebars,
  brake products, lubricants) and the two supplied product renders (cylinder kit,
  CVT clutch/pulley set), each flagged for verification.

---

## 1. Tokens

```css
:root {
  /* environment */
  --void:      #07090B;  /* base — deep graphite, never pure black */
  --bay:       #0D1116;  /* workshop fog, section floors */
  --steel:     #1A2129;  /* panel bodies under glass */

  /* glass HUD */
  --glass:     rgba(16, 22, 28, 0.55);
  --glass-brd: rgba(255, 255, 255, 0.08);

  /* accent lights — strict roles */
  --hud:       #8FE3FF;  /* cyan: telemetry, wireframes, scan lines, live data, focus */
  --redline:   #E1231D;  /* TDR red: brand mark, primary CTA, dyno redline, warnings.
                            GAP-001: resample from logo-b.svg before launch. */

  /* type */
  --white:     #F2F5F7;
  --chrome:    #7C8792;

  /* derived (kept few, all traceable to the six above) */
  --hud-08:      rgba(143, 227, 255, 0.08);   /* scan fills, focus halos */
  --hud-25:      rgba(143, 227, 255, 0.25);   /* wireframe strokes at rest */
  --redline-12:  rgba(225, 35, 29, 0.12);     /* warning fills */
  --tick:        rgba(242, 245, 247, 0.22);   /* HUD furniture strokes */
}
```

**Accent discipline (acceptance-gated):** cyan draws wireframes, scan sweeps, particle
telemetry, gauges, links-in-data-context, focus rings. Red appears only as: logo,
primary CTA, dyno redline, warning/error states, the racing line. If a red element is
not one of those five, it ships cyan or white.

**Pending-data state:** unverified values render in `--chrome` mono with a 1px dashed
`--tick` chip reading `TBD · PENDING VERIFICATION`. Not amber, not red — pending is
quiet, warnings are red, and no third accent is introduced.

## 2. Type system

| Role | Face | Size | Leading | Tracking |
|---|---|---|---|---|
| display-1 (hero) | Space Grotesk 600 | `clamp(3.5rem, 9vw, 9rem)` | 0.95 | −0.03em |
| display-2 (chapter H2) | Space Grotesk 600 | `clamp(2.5rem, 5.5vw, 4.75rem)` | 1.00 | −0.02em |
| h3 (panel titles) | Space Grotesk 500 | `clamp(1.375rem, 2.2vw, 2rem)` | 1.15 | −0.01em |
| body | Inter 400 | 1rem (1.0625rem ≥1440px) | 1.65 | 0 |
| claim (spec-led lede) | Inter 500 | `clamp(1.125rem, 1.6vw, 1.375rem)` | 1.45 | 0 |
| readout (measured values) | JetBrains Mono 500 | 0.9375–1.25rem | 1.4 | 0 |
| micro (HUD labels, eyebrows) | JetBrains Mono 500 | 0.6875rem | 1 | +0.14em, uppercase |

Rules: every measured value is mono; if it isn't measured it isn't mono. Headlines are
split to lines, masked, and rise from `y:110%`, stagger 0.06s, 0.9s, `power4.out`.
Oversized headline + mono eyebrow + negative space; the space is the layout.
Fonts self-hosted via npm (`@fontsource`) wired through `next/font/local` for
zero-CLS fallback metrics. Nothing loads from third-party CDNs.

## 3. Layout & HUD furniture

- 12-col fluid grid, max 1560px, gutters `clamp(16px, 2.5vw, 40px)`. UI floats above
  the canvas on three parallax planes (bg scene 0.3× / content 0.6× / HUD 1.0× — only
  inside pinned chapters).
- `Panel`: `--glass` fill, `backdrop-filter: blur(18px) saturate(140%)`, 1px
  `--glass-brd`, radius 24px, inner top-light (`inset 0 1px 0 rgba(255,255,255,.06)`),
  40px soft drop shadow into the scene.
- Furniture per panel: corner ticks (1px, `--tick`, 12px arms), one mono micro-label
  (`SYS · POWER/ENGINE`, `TELEMETRY · RPM`), optional single scan line (2.4s linear
  sweep, `--hud` at 12%, one per viewport max).
- **Glass budget: ≤3 blurred panels per viewport.** Enforced by a dev-mode
  `GlassBudget` counter that throws in development when exceeded. Tier 2/3 and any
  panel past the budget render `--steel` at 92% opacity, no blur. Blur never stacks
  on blur.
- Nav = floating glass dock, top center-right; mono labels; active route gets a cyan
  tick. A 2px cyan **filament** runs the right viewport edge showing scroll progress
  like a system gauge (`position: fixed`, scaleY by scroll).
- Footer = "system tray": mono build tag, locale switch, sitemap links, WhatsApp CTA
  (self-hosted icon).

## 4. Tier system (runtime, all scenes ship all tiers on day one)

```
detect() — inline <head> script, before paint, sets <html data-tier>:
  T3  prefers-reduced-motion  OR  no WebGL2
  T2  hardwareConcurrency < 4  OR  deviceMemory < 4  OR  Save-Data on
  T1  otherwise, provisionally — confirmed by a 300ms GPU micro-benchmark
      (offscreen WebGL2, instanced fill-rate loop) run post-load; a weak
      score demotes to T2 before any scene mounts.
Session-sticky: sessionStorage['tdr-tier'], overridable via ?tier=1|2|3 (QA).
```

- **T1 CINEMATIC** — persistent R3F `<Canvas>` (one WebGL context for the whole app,
  scenes swap inside it), Lenis smooth scroll, particles, scrubbed cameras, selective
  bloom (desktop only), DPR ≤ 1.75, no shadow maps on mobile.
- **T2 MOTION** — no live Three.js. Each scene's pre-rendered poster / frame sequence
  (scrubbed by scroll) or ambient loop video. Full GSAP typography + panel motion on
  native scroll. ScrollTrigger works identically.
- **T3 STILL** — poster frames, pins unwound to normal flow, instant states,
  everything legible. Complete site, minus motion.
- **FPS watchdog (T1, production-on):** rolling 3s window; avg < 24fps for a full
  window → demote to T2 live: canvas crossfades to the scene poster (0.6s), HUD toast
  `RENDER TIER → MOTION`, sessionStorage updated so navigation stays demoted.
- WebGL context loss → poster swap instantly, one silent restore attempt, else T2.

All copy/specs/fitment live in the DOM on every tier. Canvas is `aria-hidden`.
The 3D is the theatre, never the only copy of the information.

## 5. The four scenes — storyboards

Geometry strategy: every scene ships now with **code-authored placeholder geometry of
real TDR subjects** (lathe/tube/extrude primitives shaped as the actual parts — piston,
finned cylinder, CVT pulley train, scooter silhouette) so all tiers, budgets and
choreography are real today. Each placeholder has a commissioned GLTF line item in
`ASSETS.md` + `CONTENT-GAPS.md`; the loaders resolve `/models/*.glb` first and fall
back to procedural, so TDR's scanned assets drop in without code changes. No abstract
cubes anywhere — placeholders are dimensionally plausible part shapes.

### S1 · THE MACHINE — Home hero

TDR-spec sport scooter (the market: Aerox/NMAX/Vario class) floating in the void.
Load sequence (once per session, skippable by scroll): void → cyan grid floor fades
in → wireframe bike draws (1.2s) → clay → PBR resolve → headline lines rise → dock
slides in. ~3.2s. Idle: slow yaw drift, cursor parallax ±3° damped (`lerp 0.06`).

```
CAMERA: fixed at (0, 0.9, 4.2) looking at bike origin; bike yaws, camera never cuts.
                                                      ┌────────────┐
   ┌───────────────────────────────────────┐          │ DOCK (glass)│  ← top right
   │                                       │          └────────────┘
   │        ELEV 12°   ┌─────────┐         │   micro-label: SYS·MACHINE/READY
   │      ╭─────────╮  │ wire →  │         │
   │   ◉──┤ SCOOTER ├──│ clay →  │         │   TDR ────────────────────
   │      ╰─────────╯  │ pbr     │         │   PRECISION IS
   │     cyan grid floor└─────────┘        │   THE PRODUCT.          ← display-1
   │  dust ≤6k instanced points            │   mono sub: EST 2003 · JAKARTA
   └───────────────────────────────────────┘   [ FIND PARTS FOR YOUR BIKE ] ← red CTA
HUD: headline block left 55%, hero readout panel bottom-right (RPM-style boot log),
     filament right edge. ≤2 glass panels in view.
```

Beats: `0.0–0.3` grid+wireframe · `0.3–0.6` materials resolve · `0.6–1.0` type+dock.
**T2:** ambient turntable loop (webm/mp4, rendered from this exact scene) behind the
same DOM headline; poster is the LCP element. **T3:** poster AVIF + static type.

### S2 · THE WORKSHOP — /technology

Scroll-driven camera dolly on a Catmull-Rom spline through four stations of the
Technology Center. One continuous take; each station is a pinned chapter (~120vh).

```
DOLLY PATH (plan view, spline through 4 stations):

   [01 CNC BAY]──────╮
        ●            │      ● camera keyframe   ─ spline
                 ╭───╯
   [02 DYNO CELL]●          station chapters:
                 │           01 CNC BAY      5-axis machining, tolerance story
                 ╰───╮       02 DYNO CELL    roller drum, red redline sweep
   [03 COATING]──────●      03 COATING LINE  piston racks, surface treatment
                 ╭───╯       04 QC LAB       granite table, measurement story
   [04 QC LAB]───●
CHAPTER LAYOUT (alternating dock sides):
  ch01 panel RIGHT  (SYS·TECH/CNC)     — camera eases in L→R past spindle
  ch02 panel LEFT   (TELEMETRY·DYNO)   — drum spins, rpm readout counts (real scene
                                          value: drum angular velocity, not fake hp)
  ch03 panel RIGHT  (SYS·TECH/COATING) — light shafts (billboard gradients), rack pans
  ch04 panel LEFT   (SYS·TECH/QC)      — scene stills to near-freeze; only the
                                          scan line moves. Quietest chapter last.
```

Scrub 0.8; dust ≤8k instanced; light shafts are 3 billboarded gradient planes, no
raymarching. Wireframe handshake into/out of neighbouring sections.
**T2:** pre-rendered frame sequence along the same spline, scrubbed by scroll (canvas
`drawImage`); same DOM chapters/panels. **T3:** 4 station stills, normal flow.

### S3 · THE TRACK — /racing (One Team)

Stylised low-poly night circuit modelled on Sentul International Circuit's layout
(TDR One Team's home track; layout flagged GAP-014 for verification). Racing line =
red emissive tube drawn along the lap as you scroll; telemetry particles stream along
it (≤10k). Camera sweeps a low chase arc, sector by sector.

```
LAP (plan):     ╭────────T2──────╮          HUD PANELS (populate per sector):
             T1─╯                ╰─T3         S1 top-left    DIST readout (live,
              │     ● cam arc      │                         computed from spline: m of 4,120m)
              ╰──╮            ╭────╯          S2 top-right   ONE TEAM chapter copy
   start/finish ─┴────────────╯               S3 bottom-left season/results panel
   red line draws 0→1 with scroll             (results data TBD — GAP-015, renders
                                               PENDING chip, never fake times)
```

Distance/turn readouts are computed live from the camera's spline position against
the track's real published length (4.12 km) — measured-in-scene, not invented.
**T2:** 2D SVG track map, racing line drawn via stroke-dashoffset scrub, same panels.
**T3:** still map render + copy.

### S4 · THE ARCHIPELAGO — /where-to-buy

Dark cartographic 3D map of Indonesia + SEA built from real coastline data
(`world-atlas` topojson → line geometry, no texture). HQ node (Jakarta — TDR
Technology Center) pulses cyan; coverage arcs sweep Jakarta → Surabaya, Medan,
Makassar, Bangkok, Manila (labelled as *shipping/coverage*, not dealers, until the
dealer list lands — GAP-016). Panel stack: dealer locator (search UI bound to
`dealers.json`, honest empty state), marketplace links (Tokopedia/Shopee official
store URLs TBD — GAP-017), WhatsApp CTA.

```
   ~~~~~ SEA coastline in --hud-25 line work ~~~~~     ┌──────────────────┐
        ·Bangkok            ·Manila                    │ WHERE TO BUY      │ RIGHT
          ╲                 ╱                          │ [locator search]  │ 40vw
       ────╳── arcs ───────╳────                       │ [marketplaces]    │
        ·Medan   ◉ JAKARTA (HQ, pulse)                 │ [WhatsApp — red]  │
                    ╲ ·Surabaya  ·Makassar             └──────────────────┘
CAMERA: 35° tilt, slow lateral drift with scroll (no pin — single quiet scene).
```

**T2:** pre-rendered map still + CSS pulse on HQ node, DOM panels identical.
**T3:** map still, panels stacked, no pulse.

### S5 · PDP exploded views (the signature interaction)

Flagship SKUs embed a part in a glass viewport pinned through ~250vh. Scroll
disassembles along authored explode vectors; HUD callout lines (GL) connect to DOM
annotation labels (SEO/a11y-live) that dock beside the viewport.

```
scroll p=0        p=0.5                p=1.0
 [assembled]   [separating]        [exploded + annotated]
  ┌───────┐     ┌───────┐           bell ───────────● "CLUTCH BELL — TBD alloy"
  │ CVT   │     │ ○ ○   │           carrier ────────● "3-shoe carrier"
  │ SET   │     │  ▢    │           spring ─────────● torque spring
  └───────┘     └───────┘           pulley/rollers ─● "roller mass: TBD (GAP)"
 annotations stagger in per part band (p 0.15/0.3/0.45/0.6/0.75), mono labels.
```

Flagships now: **CVT clutch + pulley set** and **53mm-class cylinder/piston kit**
(subjects of the two supplied renders; naming/part numbers flagged in gaps).
Long-tail SKUs: turntable frame-sequence viewport (T2 treatment) or poster — an empty
or broken 3D viewport is a build error, enforced by the PDP template (it requires
`model3d ?? turntable ?? gallery[0]`).
**T2:** scrubbed pre-rendered explode sequence (same authored animation, offline
render). **T3:** three stills — assembled / exploded / annotated diagram.

### Home page structure — five beats, no sixth

1. THE MACHINE hero (S1)
2. FOUR PILLARS — pinned chapter; each pillar takes the stage (Power piston · Handling
   brake disc · Style helmet · Maintenance oil bottle orbit in as wireframe→solid),
   subcategory links dock alongside. Panel alternates R/L/R/L.
3. TECHNOLOGY teaser — 25vh dolly snippet of S2 station 02, red redline sweep, link.
4. LATEST NEWS — three glass cards, no scene, quiet.
5. WHERE-TO-BUY strip — archipelago line-map render + dealer/marketplace CTAs.

## 6. Motion system (summary — full spec in MOTION.md)

```
micro        0.25s  power2.out         hover, toggles — one property family per hover
ui           0.6–0.8s power3.out       panel entrances, docks
scene/type   0.9–1.2s power4.out/expo  headlines, materialise moments
camera       scroll-bound, scrub: 0.8
signature    cubic-bezier(0.16, 1, 0.3, 1)  "machined glide"
stagger      0.06s (headline lines), 0.08s (panel groups)
```

Lenis `lerp 0.09, wheelMultiplier 1.0`, Tier 1 only, synced to GSAP ticker; native
keyboard/anchor/focus scrolling verified explicitly. Numbers count up once, 0.9s,
mono. Route changes: canvas persists, content crossfades 0.6s, camera repositions —
no reload feel. Per viewport: **one hero motion moment** + quiet reveals; everything
else is `opacity 0→1` or nothing. No bounce, no elastic, no snapping, no wheel
hijacking beyond Lenis.

**Wireframe handshake** (the transition signature): outgoing chapter's geometry
de-resolves to cyan wireframe while the incoming chapter's geometry resolves from
wireframe — implemented as a shared shader uniform (`uResolve` 0↔1) crossfaded by
ScrollTrigger at chapter boundaries, T1 only; T2 gets a 0.6s poster crossfade.

## 7. IA / sitemap / SEO

Sitemap exactly as briefed (`/`, `/fit`, `/products/{pillar}/{sub}/{product}`,
`/technology`, `/racing`, `/news`, `/downloads`, `/support`, `/where-to-buy`,
`/about`, `/contact`). Four-pillar taxonomy preserved verbatim.

- **/fit** — Brand → Model → Year progressive selectors (glass columns), deep links
  `/fit/{brand}/{model}/{year}`, cyan wireframe scooter silhouette (2D SVG, all
  tiers) with fitment zones pulsing per matched pillar. Result: "N TDR parts fit…"
  with per-part verification chips. Bike registry (`bikes.json`) holds public bike
  facts; **compatibility comes only from product fitment records** — name-derived
  entries ship flagged `PENDING VERIFICATION`, absent data renders an honest empty
  state. Wrong fitment is a safety liability; we do not guess.
- **Redirects:** `/products-2/:path*` → `/products/…` 301 one-to-one where mappable,
  wildcard to the pillar index otherwise; every `?page=` query on legacy paths dies
  (stripped in middleware). Full table in `REDIRECTS.md`.
- i18n: `en` (x-default) + `id` under `/id/*`, `hreflang` alternates on every route,
  locale switch in dock+footer. All UI chrome translated; product/technical copy EN
  now with ID slots tracked in gaps.
- JSON-LD `Product` (+`Offer` activated per-SKU when price/marketplace URLs are
  verified — emitting priceless Offers fails validation; decision logged),
  `sitemap.xml`, `robots.txt`, clean canonicals, zero third-party asset origins,
  no `javascript:void(0)` anywhere (lint rule).

## 8. Stack & repo layout

Next.js 15 App Router · TypeScript strict · React 19 · R3F + drei (selective
imports) + three · GSAP + ScrollTrigger (SplitText equivalent hand-rolled: masked
line splitter, ~40 lines, no layout thrash) · Lenis · Tailwind v4 (`@theme` maps §1
tokens) · zod-validated JSON content layer (CMS-ready: same schema for Payload/Sanity
later) · deploy target Netlify.

```
tdr-racing/
  app/[locale]/(site)/…routes        content/{products,news,dictionaries}/…
  components/{hud,gl,motion,product} content/{bikes,dealers}.json
  lib/{tier,lenis,content,seo}.ts    public/{media,models,posters}/…
  qa/ (scripts + report)             docs: DESIGN-PLAN, MOTION, ASSETS,
                                     REDIRECTS, CONTENT-GAPS, QA-REPORT
```

## 9. Performance budgets (hard gates)

| Budget | Target |
|---|---|
| Initial JS (any route, before 3D chunk) | < 300KB gz — three/R3F only in dynamic, route-keyed chunks |
| GLTF total / hero | ≤ 9MB / ≤ 2.5MB compressed (procedural = ~0 today; commissioned budgets in ASSETS.md) |
| LCP | T2/3 mid-Android < 2.5s (poster = LCP); T1 desktop < 2.0s |
| CLS / INP | < 0.05 / < 200ms |
| FPS | 60 T1 desktop, ≥30 T1 mobile, watchdog demotion < 24fps sustained 3s |
| Particles | ≤30k T1 (6k hero / 8k workshop / 10k track), 0 on T2/3 (CSS noise gradient) |
| Glass | ≤3 blurred panels per viewport, dev-enforced |
| Posters | ≤120KB AVIF (+JPEG fallback) each; hero loop ≤1.5MB webm |

## 10. Asset list & per-file budgets (summary — full inventory in ASSETS.md)

| Asset | Now (this build) | Commissioned (TDR) | Budget |
|---|---|---|---|
| Hero machine | procedural scooter (code) | photoscan/CAD GLB | ≤2.5MB |
| CVT set (7 parts) | procedural lathe/extrude | CAD-derived GLB | ≤0.9MB |
| Cylinder kit (7 parts) | procedural | CAD-derived GLB | ≤0.7MB |
| Workshop env (4 stations) | procedural vignettes | authored GLB | ≤2.0MB |
| Track | spline ribbon (code) | surveyed layout GLB | ≤1.2MB |
| Archipelago | world-atlas topojson → lines | — (data, not model) | ≤400KB |
| Posters ×~10, hero loop, PDP sequences | rendered in-pipeline from these scenes | reshoot optional | table above |

Blender export settings, DRACO/KTX2 flags and per-part polycount ceilings: `ASSETS.md`.

## 11. Build order (§12.3–4)

1. **Vertical slice:** scaffold → tokens/type/HUD kit → tier system → GL root →
   S1 hero + load sequence → flagship CVT PDP with exploded viewport → T2/T3 media
   rendered from the real scenes → measure against §10.
2. Scale out: /fit, products tree, /technology, /racing, /where-to-buy, news,
   downloads, support, about, contact, i18n, redirects, JSON-LD.
3. QA: Lighthouse + axe + FPS traces per tier, screenshots 390/768/1440/1920 ×
   T1/T2/T3, 15s scroll captures (Home, Technology). Fix, re-run.
4. **Remove one effect** (§12.4) — chosen at review time, documented in QA-REPORT.

## 12. Do-not list (enforced)

Everything in brief §11, mechanically checked where possible: no `#000` (stylelint
token check), no `javascript:void(0)` (grep gate in QA script), no custom cursor, no
carousel, no fake loading percentage (the loader reports real asset-resolve progress
only), no scroll-snapping, no blur-on-blur, no invented specs (content zod schema
requires `verification` field on every numeric spec).

---

# §12.2 CRITIQUE — is any of this shippable for a generic automotive client?

Each choice audited for TDR-specificity. Findings and revisions applied above:

**1. Hero copy.** First draft was "ENGINEERED TO WIN" — could ship for any brand.
Revised to **"PRECISION IS THE PRODUCT."** + mono strapline `EST 2003 · JAKARTA ·
TDR INDUSTRIES GROUP` — states the §3 voice thesis (tolerances, not speed) in the
first viewport. The hero CTA is not "Explore" but **"Find parts for your bike"** —
the #1 rider job, straight to `/fit`.

**2. The hero vehicle.** "A motorcycle" is generic; TDR's market is the SEA sport-
scooter segment (Vario/Aerox/NMAX riders are the fitment finder's primary users).
Revision: the machine is explicitly a **sport scooter**, and the pillars chapter
orbits scooter-specific parts (CVT hardware — a category that *only* exists in this
world; no car-site could reuse it).

**3. Workshop stations.** First pass had "R&D / assembly / testing / warehouse" —
interchangeable with any factory tour. Revised to TDR's actual value chain from the
brief: **CNC bay → dyno cell → coating line → QC bench**, with the dyno chapter's
readout being the site-wide red-means-redline moment. The QC chapter deliberately
ends the dolly in near-stillness — tolerances land in silence, which is the §3 voice
performed by the camera.

**4. The track.** A generic glowing circuit is an Awwwards cliché. Revision: the
layout follows **Sentul International Circuit** (One Team's home track, flagged for
verification) and every readout is computed from the scene against Sentul's real
4.12km length — the HUD shows *measured* values or PENDING chips, never invented
sector times. The track is also the only scene where red is allowed to dominate.

**5. The map.** "Dots on a world map" is every logistics site. Revision: real
coastline data of **the archipelago specifically**, camera framing biased to
Indonesia with SEA at the edges (mirrors the brief's market order), HQ node =
the actual Technology Center in Jakarta, and arcs are honestly labelled *coverage*
until the dealer list is verified. The map doubles as the /fit empty-state artwork.

**6. Exploded PDP subjects.** Any site can explode "a part". Ours are the two parts
TDR supplied renders for — the **CVT clutch/pulley train** (the defining component
of this market's bikes) and a **bore-up cylinder kit** (TDR's best-known line).
Annotation labels carry the honest-data system (verified mono values vs PENDING
chips), which no generic template would dare ship.

**7. Wireframes.** Rule already in brief; enforcement added — every wireframe is one
of the five real assets above (scooter, CVT, cylinder kit, workshop station, track).
The load sequence draws the *hero scooter*, not a decorative mesh. No abstract
geometry exists in the codebase to regress to.

**8. Type/motion.** Space Grotesk + machined-glide easing could ship anywhere —
acknowledged. What binds them here: mono is reserved for *measured* values (a
content-schema rule, not a style choice), and the motion grammar's one signature
(wireframe handshake = design→machined-reality) is TDR's manufacturing story told
as a transition. Both are enforced in code, not vibes.

**9. Honesty as UI.** The PENDING-chip system was added *because* of this critique:
with the live site unreachable, a generic build would quietly fake specs. Making
verification state a first-class HUD element is the most TDR-specific decision in
the plan — a parts manufacturer's credibility is the spec sheet.

Verdict: revised plan is specific to TDR's world (scooter CVT hardware, Sentul,
the archipelago, Jakarta HQ, tolerances-first voice). Proceed to §12.3.
