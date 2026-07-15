/**
 * axe-core audit (WCAG 2.2 AA gate, brief §10) on every route shape,
 * run at Tier 3 (static, the a11y baseline) and Tier 1 (full motion).
 * Output: qa/report/axe.json + console summary. Exits 1 on violations.
 *
 *   node qa/axe.mjs [baseURL]
 */
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3010";
const OUT = path.resolve(import.meta.dirname, "report");

const ROUTES = [
  "/",
  "/products",
  "/products/power",
  "/products/power/clutch-transmission-cvt",
  "/products/power/clutch-transmission-cvt/racing-cvt-set-vario-160-pcx-160",
  "/fit",
  "/fit/honda/vario-160/2024",
  "/technology",
  "/racing",
  "/where-to-buy",
  "/news",
  "/news/machine-os-v2",
  "/downloads",
  "/support",
  "/about",
  "/contact",
  "/id",
  "/id/fit",
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });

  const results = [];
  let totalViolations = 0;

  for (const tier of [3, 1]) {
    for (const route of ROUTES) {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        reducedMotion: tier === 3 ? "reduce" : "no-preference",
      });
      const page = await context.newPage();
      await page.addInitScript((t) => {
        sessionStorage.setItem("tdr-tier", String(t));
        sessionStorage.setItem("tdr-bench", "1");
        sessionStorage.setItem("tdr-intro", "1");
        sessionStorage.setItem("tdr-watchdog", "off");
      }, tier);
      await page.goto(`${BASE}${route}?tier=${tier}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(tier === 1 ? 3500 : 1200);

      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const violations = axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
        count: v.nodes.length,
      }));
      totalViolations += violations.length;
      results.push({ route, tier, violations });
      console.log(
        `t${tier} ${route.padEnd(64)} ${violations.length === 0 ? "clean" : violations.map((v) => `${v.id}×${v.count}`).join(", ")}`,
      );
      await context.close();
    }
  }

  await writeFile(path.join(OUT, "axe.json"), JSON.stringify(results, null, 2));
  console.log(`\naxe: ${totalViolations} violation types across ${results.length} page-tier runs`);
  process.exit(totalViolations > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
