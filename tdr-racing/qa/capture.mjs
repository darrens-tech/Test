/**
 * 15-second scroll captures of Home and Technology (§12.4) — Playwright's
 * native webm recording while a smooth programmatic scroll walks the page.
 * Output: qa/report/capture-{home,technology}.webm
 *
 *   node qa/capture.mjs [baseURL]
 */
import { chromium } from "playwright-core";
import { mkdir, rename, readdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3010";
const OUT = path.resolve(import.meta.dirname, "report");

async function capture(browser, name, route) {
  const dir = path.join(OUT, `.video-${name}`);
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir, size: { width: 1280, height: 800 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("tdr-tier", "1");
    sessionStorage.setItem("tdr-bench", "1");
    sessionStorage.setItem("tdr-watchdog", "off");
  });
  await page.goto(`${BASE}${route}?tier=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500); // intro / entry materialise on camera

  // ~11.5s smooth scroll through the take (drives Lenis via wheel events)
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    const steps = 230;
    for (let i = 0; i < steps; i++) {
      dispatchEvent(new WheelEvent("wheel", { deltaY: total / steps, bubbles: true, cancelable: true }));
      scrollBy(0, total / steps);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(800);
  await context.close();

  const [file] = await readdir(dir);
  await rename(path.join(dir, file), path.join(OUT, `capture-${name}.webm`));
  console.log(`capture-${name}.webm`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  await capture(browser, "home", "/");
  await capture(browser, "technology", "/technology");
  await browser.close();
  console.log("captures done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
