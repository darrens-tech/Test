"use client";

import { useEffect } from "react";

/**
 * Dev-only enforcement of the glass rule (DESIGN-PLAN §3): maximum 3 blurred
 * panels per viewport on Tier 1. Offenders get an error outline + console
 * error so the violation is impossible to miss during development.
 * Production builds tree-shake this to nothing.
 */
export function GlassBudget() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    let visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        if (
          document.documentElement.dataset.tier === "1" &&
          visible.size > 3
        ) {
          console.error(
            `[glass-budget] ${visible.size} blurred panels in viewport (max 3). Add .panel--solid to the extras.`,
            [...visible],
          );
          visible.forEach((el) => ((el as HTMLElement).style.outline = "2px solid #E1231D"));
        }
      },
      { threshold: 0.05 },
    );

    const scan = () => {
      visible = new Set();
      observer.disconnect();
      document
        .querySelectorAll(".panel:not(.panel--solid)")
        .forEach((el) => observer.observe(el));
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
