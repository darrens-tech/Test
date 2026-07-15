/**
 * Media pipeline — renders the site's OWN scenes into its Tier 2/3 assets:
 * scene posters, pillar-stage posters, PDP posters and the three exploded
 * stills per flagship. Honest media: what Tier 2/3 users see is exactly what
 * Tier 1 renders live. Run against a production build (`next start`).
 *
 *   node qa/render-media.mjs [baseURL]
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3010";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const OUT = path.resolve(import.meta.dirname, "../public");

const shots = [];

async function main() {
  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: [
      "--headless=new",
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(60000);
  // Headless defaults to prefers-reduced-motion: reduce, which is a hard Tier 3
  // gate by design — emulate a normal device for Tier 1 capture.
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Force Tier 1 + skip the intro so scenes render resolved.
  await page.addInitScript(() => {
    sessionStorage.setItem("tdr-tier", "1");
    sessionStorage.setItem("tdr-bench", "1");
    sessionStorage.setItem("tdr-intro", "1");
    sessionStorage.setItem("tdr-watchdog", "off"); // software GL is slow by design
    sessionStorage.setItem("tdr-qa-pose", "1"); // freeze the hero at its 3/4 pose
  });

  const hideChrome = () =>
    page.addStyleTag({
      content:
        "header,footer,main,.filament,.toast{visibility:hidden !important} html{background:#07090B}",
    });

  async function shootScene(route, out, settleMs = 5000, emit = null) {
    await page.goto(`${BASE}${route}?tier=1`, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas", { timeout: 30000 });
    if (emit) {
      // Drive the scene over the scroll bus directly — immune to Lenis.
      await page.evaluate((m) => window.__tdrEmit?.(m), emit);
    }
    await page.waitForTimeout(settleMs);
    await hideChrome();
    await page.waitForTimeout(300);
    const buf = await page.screenshot({ type: "png" });
    await save(buf, out, 1600);
    console.log("scene →", out);
  }

  async function save(buf, rel, width) {
    const file = path.join(OUT, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await sharp(buf).resize({ width }).jpeg({ quality: 74, mozjpeg: true }).toFile(file);
    shots.push(rel);
  }

  // — scene posters (racing/technology shot mid-take so the story is visible)
  await shootScene("/", "posters/hero.jpg", 7000);
  await shootScene("/technology", "posters/technology.jpg", 6000, {
    scene: "workshop",
    progress: 0.3,
  });
  await shootScene("/racing", "posters/racing.jpg", 6000, {
    scene: "track",
    progress: 0.6,
  });
  await shootScene("/where-to-buy", "posters/archipelago.jpg", 5000);

  // — pillar stage posters: drive the home chapter directly over the bus
  await page.goto(`${BASE}/?tier=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.waitForTimeout(4000);
  await hideChrome();
  const pillars = ["power", "handling", "style", "maintenance"];
  for (let i = 0; i < 4; i++) {
    await page.evaluate((idx) => {
      window.__tdrEmit?.({ scene: "home", chapter: idx, chapterProgress: 0.5 });
    }, i);
    await page.waitForTimeout(2800); // prop scale-in settles
    const buf = await page.screenshot({
      type: "png",
      clip: { x: 820, y: 120, width: 740, height: 740 },
    });
    await save(buf, `posters/pillar-${pillars[i]}.jpg`, 1200);
    console.log("pillar →", pillars[i]);
  }

  // — exploded stills per flagship (p = 0 / 0.5 / 1)
  const flagships = [
    ["/products/power/clutch-transmission-cvt/racing-cvt-set-vario-160-pcx-160", "cvt-set"],
    ["/products/power/engine/racing-cylinder-kit-nmax-aerox-155", "cylinder-kit"],
  ];
  for (const [route, key] of flagships) {
    await page.goto(`${BASE}${route}?tier=1`, { waitUntil: "networkidle" });
    const section = page.locator("section[aria-label]").first();
    await section.scrollIntoViewIfNeeded();
    await page.waitForSelector("canvas");
    await page.waitForTimeout(4500);

    const { top, height } = await page.evaluate(() => {
      const el = document.querySelector("section[aria-label]");
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    });

    for (let i = 0; i < 3; i++) {
      const p = i / 2;
      await page.evaluate(
        ([t, h, prog]) => scrollTo(0, t + (h - innerHeight) * prog),
        [top, height, p],
      );
      await page.waitForTimeout(3500);
      // hide DOM chrome + callout labels for a clean plate
      await page.addStyleTag({
        content:
          "header,footer,.filament{visibility:hidden !important} section[aria-label] .panel .panel, section[aria-label] svg line, section[aria-label] [class*=micro]{opacity:0 !important}",
      });
      await page.waitForTimeout(200);
      const vp = await page.evaluate(() => {
        const el = document.querySelector("section[aria-label] .panel");
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      const buf = await page.screenshot({ type: "png", clip: vp });
      await save(buf, `media/exploded/${key}/${i}.jpg`, 1600);
      if (i === 0) await save(buf, `posters/products/${route.split("/").pop()}.jpg`, 1200);
      console.log("exploded →", key, i);
    }
  }

  await browser.close();
  console.log(`done: ${shots.length} assets`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
