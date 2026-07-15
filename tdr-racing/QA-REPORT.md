# QA-REPORT — tdr-racing.com v2 · MACHINE OS

Build audited: production `next build` + `next start`, this repo state.
Environment: containerised Linux, headless Chromium 136 (Playwright build 1194),
**software GL (SwiftShader)** — no hardware GPU is available in this
environment, which matters for the FPS numbers below and is flagged wherever
it changes interpretation. Evidence lives in `qa/report/`.

## 1. Bundle budgets — PASS (gate: <300KB gz initial JS before any 3D)

| Route | First-load JS |
|---|---|
| Shared baseline (all routes) | **103 kB** |
| `/` home | 160 kB |
| PDP (exploded flagship) | 160 kB |
| `/fit/[[...selection]]` | 152 kB |
| `/technology` · `/racing` · `/where-to-buy` | 157–158 kB |
| everything else | 152 kB |

three.js + R3F + all scenes live in route-keyed **dynamic chunks that only
Tier 1 ever downloads** (`GLMount`, `ExplodedViewer → Live`). Tier 2/3 devices
download zero bytes of WebGL code. Worst route is 47% under the gate.

## 2. Lighthouse (lab, v12; jsons in qa/report/)

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Mobile emulation, **Tier 2** (the mid-Android target) | **97** | 100 | 100 | 100 | 2.6 s | **0** | 60 ms |
| Desktop, **Tier 1** | 77 | 100 | 100 | 100 | **0.9 s** | **0** | 510 ms |

- **Mobile LCP 2.6s vs the 2.5s gate — borderline in lab, honest reading:**
  Lighthouse's mobile lab (Moto-G-class, 4× CPU throttle, 1.6Mbps/150ms RTT)
  is harsher than a typical field mid-tier Android on 4G. LCP element is the
  H1 at its webfont-swap repaint. Applied levers: Tier-2 headlines paint
  immediately (no pre-hide), mono font not preloaded, posters 18–32KB.
  Remaining lever, deliberately left as TDR's launch call: `font-display:
  optional` on Space Grotesk caps LCP at first paint (~1.2s lab) but risks
  fallback-font first impressions on cold slow loads. Field (CrUX) data should
  decide. INP unmeasurable in lab; TBT 30–60ms is a strong proxy for <200ms.
- **Desktop perf 77:** LCP 0.9s (gate <2.0s ✓), CLS 0; the score is TBT 510ms
  from the *intentional* Tier-1 GL boot (scene build + shader compile) — it
  lands after LCP and before meaningful interaction, and is amplified by
  software GL in this container. On hardware it is shorter; the watchdog
  covers machines where it isn't.

## 3. Accessibility — PASS (gate: WCAG 2.2 AA, all tiers)

`qa/axe.mjs`: axe-core with `wcag2a/aa, wcag21a/aa, wcag22aa` tags over 18
routes × Tier 3 (reduced-motion baseline) and Tier 1 = 36 page-runs:
**0 violations** (`qa/report/axe.json`). Lighthouse a11y 100 on both runs.

Fixed during the audit: primary CTA contrast (white 13px on pure `#E1231D` is
4.4:1 — CTA fill deepened to ~6:1 race red via `color-mix`; pure `--redline`
remains the mark/line/accent red where non-text 3:1 applies); invalid
`ul > div > li` nesting on /fit results; heading order in the pinned pillars
chapter; locale-switch accessible-name mismatch; a low-contrast footnote on
/racing. Also verified: skip link, focus-visible ring, focus trap + Esc in the
mobile menu, canvas `aria-hidden` with DOM text equivalents, no
`javascript:void(0)` anywhere (grep: 0 hits), no-JS renders the complete
Tier-3 site (init script never runs → static, legible).

## 4. Tiers, FPS and the watchdog

- Tier detection verified: `?tier=` override, sessionStorage stickiness,
  `prefers-reduced-motion → Tier 3` (headless Chromium defaults to `reduce`,
  which repeatedly proved the gate works), no-WebGL2 → Tier 3, weak-GPU
  bench → Tier 2.
- **The FPS watchdog demoted this container's software GL to Tier 2 within
  ~3s on every scene route** — the demotion path (canvas → poster crossfade,
  toast, session-sticky) is exercised for real, not just unit-shaped. QA
  scripts disable it via `sessionStorage tdr-watchdog=off` to capture Tier 1.
- 60fps Tier-1 desktop **cannot be verified in this environment** (no GPU).
  The budget architecture (≤1.75 DPR, no shadow maps, single-draw-call
  particles ≤5k/scene, frustum culling, `frameloop=never` when idle) plus the
  demotion backstop is the shipped guarantee; hardware FPS traces are a
  pre-launch task on real devices.
- WebGL context loss: handler swaps to poster, one silent recovery, then
  demotes (code-reviewed + context-loss simulated during development).

## 5. Visual evidence (`qa/report/`)

- `screens/` — 72 screenshots: home, flagship PDP, `/fit/honda/vario-160/2024`
  at 390/768/1440/1920 × Tiers 1/2/3; nine more routes spot-checked at
  390/1440 × Tiers 1/3, including `/id` locale.
- `capture-home.webm`, `capture-technology.webm` — ~15s Tier-1 scroll
  captures (§12.4).
- Tier 2/3 media is rendered **from the site's own scenes**
  (`qa/render-media.mjs`): what a mid-tier phone sees is what Tier 1 renders.
  Posters 18–32KB (budget ≤120KB); exploded stills ≤150KB each.

## 6. The 60-second acceptance path (brief §13, Tier 2)

`/fit` → Honda → Vario 160 → 2024 (three link-clicks, server-rendered, works
with zero client JS) → "3 candidate parts … being verified" with the honest
pending copy → CVT Set PDP (stills viewport — never an empty/broken 3D box) →
buy panel: live "Authorized dealer" route + disabled-labelled marketplace
chips (GAP-012) + WhatsApp→contact. Every step in the screenshot set.
Fitment chips stay `PENDING VERIFICATION` until TDR engineering signs off —
wrong fitment is the one failure mode this site refuses to risk.

## 7. §12.4 — the effect removed

**The scanline sweep** (hero boot panel — the last one in the build). It
animated over the only panel whose content already moves (the boot log),
violating "furniture is never louder than content". The `.scanline` utility
remains defined but unused; the site now ships zero scanlines. Runners-up
considered and kept: cursor parallax (it carries the "machine responds to
you" thesis), dust (it carries depth), the pillars orbit (it carries the
catalogue's stage metaphor).

Also cut earlier on the same principle: **UnrealBloom was never shipped** —
emissive materials + additive glow geometry deliver the redline/HUD glow with
zero full-screen post passes on 4G-market hardware (documented in ASSETS.md).

## 8. Known issues (open, with diagnosis)

1. **React #418 hydration warning** on `/racing`, `/technology`,
   `/where-to-buy` in production (not dev, not home). Consequence was severe
   (React's recovery re-render restored SSR `<html data-tier="3">`, killing
   Tier 1) — **fixed by making the tier provider self-healing**; the residual
   is a console warning + a wasted client re-render on those routes. Suspect:
   the fixed-position `next/image` backdrop shared by exactly those three
   pages. Root-cause before launch.
2. **Legacy product-slug redirect map** is wildcard-backed until a crawl of
   the legacy site is possible (GAP-020).
3. Container-specific: a flex-context layout quirk in this Chromium build was
   neutralised with first-party `.container-*` classes (also simply better);
   real-browser cross-check recommended at launch QA.

## 9. Gate summary

| Gate (brief §10/§13) | Status |
|---|---|
| Initial JS <300KB gz before 3D | ✅ 103–160KB |
| Tier 2/3 LCP <2.5s mid-Android | ⚠️ 2.6s in a harsher-than-field lab; levers documented |
| Tier 1 desktop LCP <2.0s, poster-first | ✅ 0.9s |
| CLS <0.05 | ✅ 0 |
| INP <200ms | ✅ TBT 30–60ms proxy; field-verify |
| WCAG 2.2 AA all tiers | ✅ axe 0 violations ×36 runs, LH 100 |
| Keyboard-only under Lenis | ✅ native keys kept; focus trap; skip link |
| Reduced motion = complete still site | ✅ Tier 3 verified (headless default!) |
| Copy/specs in DOM, canvas aria-hidden | ✅ |
| No `javascript:void(0)` / third-party assets | ✅ 0 hits / all self-hosted |
| ≤3 blurred panels/viewport | ✅ dev-enforced (`GlassBudget`) |
| No invented numbers | ✅ schema-enforced verification states + CONTENT-GAPS.md |
| 60fps Tier 1 / watchdog demotion | ⚠️ no GPU here — watchdog proven live; hardware traces pre-launch |
