"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useTier } from "@/lib/tier";

/**
 * Inertial scroll — Tier 1 only (brief §6). Tiers 2/3 keep native scroll and
 * ScrollTrigger behaves identically. Keyboard scrolling (space / PgDn / arrows)
 * and focus-driven scrolls stay native under Lenis; anchor links are routed
 * through lenis.scrollTo so they inherit the same easing.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const { tier } = useTier();

  useEffect(() => {
    if (tier !== 1) return;

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.0 });
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el, { offset: -96 });
      }
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [tier]);

  return <>{children}</>;
}
