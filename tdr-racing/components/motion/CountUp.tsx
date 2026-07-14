"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/** Numbers count up once in mono, 0.9s, on first view only (brief §6). */
export function CountUp({
  value,
  className,
  suffix = "",
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.documentElement.dataset.motion !== "full") return;
    const obj = { n: 0 };
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          n: value,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = `${Math.round(obj.n)}${suffix}`;
          },
        });
      },
    });
    return () => trigger.kill();
  }, [value, suffix]);

  return (
    <span ref={ref} className={`readout ${className ?? ""}`}>
      {value}
      {suffix}
    </span>
  );
}
