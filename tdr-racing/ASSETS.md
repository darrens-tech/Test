# ASSETS.md — 3D inventory, budgets, pipeline

## 0. Current state: procedural stand-ins, zero network cost

Every scene ships today with **code-authored geometry of real TDR subjects**
(lathe/tube/extrude primitives — see `components/gl/parts/*`). Network cost of
"models" is currently ~0KB (it's application code inside the lazy GL chunk),
so the site is far inside the §5 budget. Each stand-in has a commissioned
GLB line item below; loaders resolve real files from `/public/models/*.glb`
first (`model3d.gltf` in the content schema), so TDR's assets drop in without
code changes. **No abstract geometry exists in the codebase** — every mesh is
a scooter, a CVT component, a piston kit, a workshop station, a circuit, or
real coastline data.

## 1. Commissioned GLB inventory (CONTENT-GAPS GAP-010..: TDR to supply)

| ID | Asset | Placeholder today | Budget (compressed) | Poly ceiling |
|---|---|---|---|---|
| A-01 | Hero machine (TDR-equipped sport scooter, CAD/scan) | `parts/scooter.ts` | ≤ 2.5MB | 150k tris |
| A-02 | Workshop environment (CNC bay, dyno cell, coating line, QC lab) | `scenes/WorkshopScene.tsx` vignettes | ≤ 2.0MB | 120k |
| A-03 | CVT set, 7 parts, named nodes + explode pivots | `parts/cvt.ts` | ≤ 0.9MB | 60k |
| A-04 | Cylinder kit, 5 parts, named nodes | `parts/cylinderKit.ts` | ≤ 0.7MB | 45k |
| A-05 | Piston (pillar prop / coating rack) | `parts/pillarProps.ts` | ≤ 0.2MB | 12k |
| A-06 | Floating brake disc (pillar prop) | 〃 | ≤ 0.2MB | 12k |
| A-07 | Helmet (pillar prop) | 〃 | ≤ 0.25MB | 15k |
| A-08 | Oil bottle (pillar prop) | 〃 | ≤ 0.1MB | 6k |
| A-09 | Sentul circuit surveyed layout | `TrackScene` spline (GAP-014) | ≤ 1.2MB | 80k |
| — | Archipelago | real data already (`world-atlas` topojson, ~90KB in GL chunk) | — | — |

**Total ≤ 8.05MB — inside the 9MB site budget with margin.**

## 2. Blender → GLB export settings (for TDR's artists)

- Units: meters, +Y up, −Z forward (glTF standard); apply all transforms.
- One scene per file; named empties at explode pivots (`explode:<part-id>`),
  part names matching `model3d.annotations[].part`
  (`face`, `sheave`, `belt`, `secondary`, `spring`, `carrier`, `bell`;
  `block`, `piston`, `rings`, `pin`, `clips`).
- Materials: principled BSDF only; no lights, no cameras in export.
- Compression: `gltf-transform optimize in.glb out.glb --compress draco`
  (DRACO level 7, quantization 14/12/10 pos/norm/uv).
- Textures: KTX2 — ETC1S for albedo/AO (`--texture-compress etc1s`),
  UASTC for normal/roughness-metalness; power-of-two, ≤2048px, no embedded
  JPEG/PNG.
- Verify against budget: `gltf-transform inspect out.glb` — file size and
  triangle count must clear the table above.

## 3. Rendered media (generated in-repo — `qa/render-media.mjs`)

What Tier 2/3 sees is what Tier 1 renders: all posters and explode stills are
shot from the site's own scenes in headless Chromium (SwiftShader) and
compressed with sharp (mozjpeg q74).

| File | Source scene | Budget | Actual |
|---|---|---|---|
| `posters/hero.jpg` | S1 posed (`tdr-qa-pose`, resolve 0.94) | ≤120KB | see QA report |
| `posters/technology.jpg` | S2 at dolly p=0.3 (dyno cell) | ≤120KB | 〃 |
| `posters/racing.jpg` | S3 at lap p=0.6 | ≤120KB | 〃 |
| `posters/archipelago.jpg` | S4 | ≤120KB | 〃 |
| `posters/pillar-{power,handling,style,maintenance}.jpg` | S1 chapter beats via `__tdrEmit` | ≤80KB ea | 〃 |
| `media/exploded/{cvt-set,cylinder-kit}/{0,1,2}.jpg` | S5 at p=0/0.5/1 | ≤150KB ea | 〃 |
| `posters/products/*.jpg` | S5 assembled frame | ≤100KB ea | 〃 |

Re-generate after any scene change: `npm run build && npm start & npm run media:render`.

**Turntable videos (Tier 2 long-tail treatment):** the frame-sequence/webm
render step is specced but not shipped in this iteration — Tier 2 currently
uses the 3-still scrub for flagships and posters elsewhere, which passes the
"never a broken/empty viewport" gate. Logged as GAP-013.

## 4. Fonts & other self-hosted assets

- `public/fonts/*.woff2` (7 files, ~130KB total) — Space Grotesk 500/600/700,
  Inter 400/500, JetBrains Mono 400/500, latin subsets, from @fontsource,
  served via `next/font/local` (zero CLS, no third-party origins).
- Logo: inline SVG placeholder (`components/hud/Logo.tsx`) — GAP-002.
- No asset on any page loads from a domain other than the site itself
  (the legacy site's `tdr-hpz.com` icon dependency is gone, brief §10).

## 5. Runtime performance budgets (enforced in code)

- DPR ≤ 1.75; `powerPreference: "high-performance"`; no shadow maps anywhere
  (lighting is IBL via bundled RoomEnvironment + 2 directionals).
- Particles: hero 3.5k · workshop 5k · track 2.4k telemetry + 2.5k dust —
  all instanced single-draw-call shaders; 0 on Tier 2/3 (CSS `.atmo`).
- Frustum culling default-on; `frameloop="never"` when a canvas is idle;
  PDP inline viewer renders only while intersecting the viewport.
- FPS watchdog demotes at <24fps sustained 3s (see MOTION.md §5).
