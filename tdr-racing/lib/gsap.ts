"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined" && !(gsap as unknown as { _tdr?: boolean })._tdr) {
  gsap.registerPlugin(ScrollTrigger);
  (gsap as unknown as { _tdr?: boolean })._tdr = true;
}

/** MOTION.md tokens — the cinematic band. */
export const EASE_MACHINED = "cubic-bezier(0.16, 1, 0.3, 1)";
export const DUR = { micro: 0.25, ui: 0.7, scene: 1.1 } as const;
export const SCRUB = 0.8;
export const STAGGER_LINES = 0.06;

export { gsap, ScrollTrigger };
