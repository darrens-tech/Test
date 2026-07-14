"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, DUR } from "@/lib/gsap";

/**
 * Quiet supporting reveal — opacity 0→1 with a small rise, 0.7s power3.out,
 * on first scroll into view. The workhorse for everything that is not a
 * hero motion moment (motion discipline, brief §6).
 *
 * Robustness: elements are hidden via CSS only while [data-reveal] is present
 * and data-motion="full"; a CSS safety animation un-hides anything JS never
 * reaches (see globals.css) — content can never be lost to a failed hydration.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.documentElement.dataset.motion !== "full") {
      el.removeAttribute("data-reveal");
      return;
    }
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once,
      onEnter: () => {
        el.removeAttribute("data-reveal");
        gsap.fromTo(
          el,
          { opacity: 0, y },
          { opacity: 1, y: 0, duration: DUR.ui, ease: "power3.out", delay },
        );
      },
    });
    return () => trigger.kill();
  }, [delay, y, once]);

  return (
    <div ref={ref} className={className} data-reveal="">
      {children}
    </div>
  );
}
