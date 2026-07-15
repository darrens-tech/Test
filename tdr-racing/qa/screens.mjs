/**
 * Screenshot matrix (§12.4): key routes × 390/768/1440/1920 × Tier 1/2/3.
 * Full matrix for the vertical slice (home, flagship PDP, /fit deep link);
 * two widths × T1/T3 for the rest. Output: qa/report/screens/*.jpg
 *
 *   node qa/screens.mjs [baseURL]
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3010";
const OUT = path.resolve(import.meta.dirname, "report/screens");

const FULL_MATRIX = [
  ["home", "/"],
  ["pdp-cvt", "/products/power/clutch-transmission-cvt/racing-cvt-set-vario-160-pcx-160"],
  ["fit-deep", "/fit/honda/vario-160/2024"],
];
const SPOT_CHECK = [
  ["products", "/products"],
  ["subcategory", "/products/power/clutch-transmission-cvt"],
  ["fit", "/fit"],
  ["technology", "/technology"],
  ["racing", "/racing"],
  ["where-to-buy", "/where-to-buy"],
  ["news", "/news"],
  ["support", "/support"],
  ["home-id", "/id"],
];
const WIDTHS = [390, 768, 1440, 1920];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });

  async function shoot(name, route, width, tier) {
    const page = await browser.newPage({
      viewport: { width, height: Math.round(width < 800 ? width * 2.1 : width * 0.62) },
    });
    // Tier 3 must be the real reduced-motion experience; tiers 1/2 emulate none.
    await page.emulateMedia({ reducedMotion: tier === 3 ? "reduce" : "no-preference" });
    await page.addInitScript((t) => {
      sessionStorage.setItem("tdr-tier", String(t));
      sessionStorage.setItem("tdr-bench", "1");
      sessionStorage.setItem("tdr-intro", "1");
      sessionStorage.setItem("tdr-watchdog", "off");
    }, tier);
    await page.goto(`${BASE}${route}?tier=${tier}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(tier === 1 ? 5000 : 1800);
    const buf = await page.screenshot({ type: "png" });
    const file = path.join(OUT, `${name}-w${width}-t${tier}.jpg`);
    await sharp(buf).jpeg({ quality: 68, mozjpeg: true }).toFile(file);
    console.log(path.basename(file));
    await page.close();
  }

  for (const [name, route] of FULL_MATRIX)
    for (const width of WIDTHS) for (const tier of [1, 2, 3]) await shoot(name, route, width, tier);

  for (const [name, route] of SPOT_CHECK)
    for (const width of [390, 1440]) for (const tier of [1, 3]) await shoot(name, route, width, tier);

  await browser.close();
  console.log("screens done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
