# MOTION.md — timing tokens, easing curves, every ScrollTrigger chapter

The motion system implements brief §6: one continuous cinematic take per page,
mass-and-deceleration easing only, one hero motion moment per viewport.

## 1. Tokens (source: `app/globals.css` + `lib/gsap.ts`)

| Token | Value | Use |
|---|---|---|
| `--dur-micro` / `DUR.micro` | 0.25s · `power2.out` | hover, toggles — one property family per hover |
| `--dur-ui` / `DUR.ui` | 0.7s (band 0.6–0.8s) · `power3.out` | panel entrances, docks, Reveal |
| `--dur-scene` / `DUR.scene` | 1.1s (band 0.9–1.2s) · `power4.out` / `expo.out` | headlines, materialise moments |
| camera | scroll-bound, `SCRUB = 0.8` | all dollies/scrubs |
| `--ease-machined` | `cubic-bezier(0.16, 1, 0.3, 1)` | the signature "machined glide" (CSS transitions) |
| `STAGGER_LINES` | 0.06s | headline line rises |
| number count-up | 0.9s · `power2.out` · once per view | `CountUp` |

Nothing except micro-interactions moves faster than 0.6s; nothing except
scrubbed cameras takes longer than 1.2s. No bounce, no elastic, no snapping.

## 2. Scroll infrastructure

- **Lenis** (`components/motion/LenisProvider.tsx`): `lerp 0.09`,
  `wheelMultiplier 1.0`, Tier 1 only, driven from GSAP's ticker with
  `lagSmoothing(0)`; `lenis.on("scroll", ScrollTrigger.update)`. Keyboard
  scrolling (space/PgDn/arrows) and focus scrolls stay native; anchor links
  route through `lenis.scrollTo` (offset −96px for the dock).
- **Tiers 2/3**: native scroll. Every ScrollTrigger below behaves identically
  on Tier 2; on Tier 3 (`data-motion="static"`) pins unwind into normal flow
  and the static variants render instead.
- **Scroll → GL bridge** (`lib/scrollBus.ts`): DOM triggers emit
  `{scene, progress, chapter}`; scenes read in `useFrame`. No React re-renders
  on the scroll path. QA/pipeline hook: `window.__tdrEmit`.

## 3. Session choreography

**Load sequence** (`components/home/HeroMachine.tsx`, once per session,
skippable by wheel/touch/key):

```
t=0.00  void + poster (LCP)
t=0.35  timeline starts: resolve 0→1 over 2.4s, power2.inOut
        ├ 0.00–0.45 wireframe draws  (dash offset, Materialise)
        ├ 0.30–0.85 clip-plane sweep bottom→top (clay)
        └ 0.55–1.00 env lighting resolves (full PBR)
        boot log flips on real milestones: BOOT → GEOMETRY·DRAWING →
        MATERIALS·RESOLVING → TELEMETRY·LINKED → READY (no fake %, §11)
t≈1.9   headline lines rise (0.9s, power4.out, 0.06 stagger)
t≈3.2   READY — sessionStorage["tdr-intro"]=1, never repeats
```

**Route changes**: the background canvas persists across scene routes; the
incoming scene runs its own entry materialise (wireframe handshake) while DOM
content reveals — no reload feel. PDP routes sleep the background canvas and
wake their inline viewer (one live GL context at a time).

**Wireframe handshake**: `components/gl/fx/Materialise.tsx` — a single
`resolve` scalar drives dash-draw → clip sweep → lighting. Scenes animate it on
entry (`1−e^(−1.8t)`), the hero timeline scrubs it, QA poses clamp it at 0.94.

## 4. ScrollTrigger chapter inventory

| # | Trigger (file) | Pin | Scrub | What it drives |
|---|---|---|---|---|
| ST-1 | Home · `PillarsChapter` | 480vh sticky | 0.8 | 4 pillar beats: panel crossfades (0.28s in / 0.34s out per beat, power3), Tier-2 poster crossfades, bus `chapter` 0–3 → machine yields left, pillar prop orbits in (GL) |
| ST-2 | Home · `Reveal`s (beats 3–5) | — | — | quiet 0.7s rises at `top 90%`, once |
| ST-3 | Technology · `TechnologyChapters` | 480vh sticky | 0.8 | camera dolly (bus progress → Catmull-Rom `CAM_PATH`/`LOOK_PATH`), 4 station panels dock R→L→R→L; ch04 (QC) intentionally near-still |
| ST-4 | Racing · `LapChapters` | 420vh sticky | 0.8 | racing line drawRange 0→1, telemetry reveal, chase camera; DIST/TURN readouts computed live from lap progress × 4,120m |
| ST-5 | Where-to-buy · `EmitScrollProgress` | — | 0.8 | archipelago camera drift (no pin — deliberately the quietest scene) |
| ST-6 | PDP · `ExplodedViewer` | 280vh sticky | 0.8 | explode vectors per part band `[0.06+0.1·order, +0.38]` (smoothstep), camera pull-back, callout line/label alphas, Tier-2 still crossfade at p=⅓/⅔ |
| ST-7 | every page · `SplitHeadline` | — | — | masked line rise on view (or immediate post-intro) |
| ST-8 | every page · `CountUp` | — | — | mono count-up 0.9s, once |

Layered parallax exists only inside pinned chapters (scene 0.3× implicit via
camera / content 1.0×) — never on flowing sections.

## 5. Discipline & reduced motion

- One hero motion moment per viewport; everything else `Reveal` (opacity/24px)
  or nothing.
- Hover: border→`--hud` + 4px lift, 0.25s (`.lift`). One property family.
- One scanline per viewport (hero boot panel only). Glass ≤3/viewport
  (dev-enforced by `GlassBudget`).
- `prefers-reduced-motion` → Tier 3 at the init script, before paint: Lenis
  never constructs, pins render as stacked static variants, scenes are
  posters, `[data-reveal]` never hides content. CSS safety animation un-hides
  anything JS misses after 2.8s (`reveal-safety`).
- FPS watchdog: sustained <24fps over a full 3s window on Tier 1 → live demote
  to Tier 2 (canvas → poster crossfade 0.6s, HUD toast `RENDER TIER → MOTION`,
  session-sticky). WebGL context loss: one silent recovery, then demote.
