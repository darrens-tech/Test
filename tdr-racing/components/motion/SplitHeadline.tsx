"use client";

import { createElement, useEffect, useRef, type ElementType } from "react";
import { gsap, ScrollTrigger, STAGGER_LINES } from "@/lib/gsap";

/**
 * Masked line reveal (SplitText-equivalent, hand-rolled — brief §4).
 * SSR renders the plain headline (SEO/a11y source of truth); on the client we
 * measure word wrap positions after fonts load, rebuild into overflow-clipped
 * line wrappers, and rise each line from y:110% — 0.9s, power4.out, 0.06s stagger.
 * Tier 3 / reduced motion never splits: the SSR text stays as-is.
 */
export function SplitHeadline({
  text,
  as = "h1",
  className,
  delay = 0,
  immediate = false,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** true → play on mount (hero, after loader); false → play on scroll into view */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = document.documentElement.dataset;
    if (html.motion !== "full") {
      el.removeAttribute("data-split-hide");
      return;
    }
    // Tier 2: above-fold (immediate) headlines stay static — they were never
    // hidden, and re-hiding them after paint would tank LCP for the exact
    // audience the tier exists for. Scroll-triggered ones still animate.
    if (html.tier !== "1" && immediate) {
      el.removeAttribute("data-split-hide");
      return;
    }

    let tween: gsap.core.Tween | undefined;
    let trigger: ScrollTrigger | undefined;
    let cancelled = false;

    document.fonts.ready.then(() => {
      if (cancelled) return;

      // Measure natural line wrapping via word spans.
      const words = text.split(/\s+/);
      el.innerHTML = words
        .map((w) => `<span style="display:inline-block">${w}</span>`)
        .join(" ");
      const spans = Array.from(el.children) as HTMLSpanElement[];
      const lines: string[][] = [];
      let lastTop: number | null = null;
      spans.forEach((s) => {
        if (s.offsetTop !== lastTop) {
          lines.push([]);
          lastTop = s.offsetTop;
        }
        lines[lines.length - 1].push(s.textContent ?? "");
      });

      // Rebuild as masked lines and reveal.
      el.innerHTML = lines
        .map((l) => `<span class="split-line"><span>${l.join(" ")}</span></span>`)
        .join("");
      el.querySelectorAll<HTMLElement>(".split-line").forEach((line) => {
        line.style.display = "block";
        line.style.overflow = "clip";
      });
      el.removeAttribute("data-split-hide");
      el.style.opacity = "1";

      const targets = el.querySelectorAll(".split-line > span");
      const play = () => {
        tween = gsap.to(targets, {
          y: 0,
          duration: 0.9,
          ease: "power4.out",
          stagger: STAGGER_LINES,
          delay,
        });
      };
      gsap.set(targets, { y: "110%" });

      if (immediate) play();
      else {
        trigger = ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: play });
      }
    });

    return () => {
      cancelled = true;
      tween?.kill();
      trigger?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, immediate, delay]);

  return createElement(
    as,
    { ref, className, "data-split-hide": "", "aria-label": text },
    text,
  );
}
