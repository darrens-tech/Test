"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, SCRUB } from "@/lib/gsap";
import { useTier } from "@/lib/tier";
import type { CalloutRefs } from "./ExplodedViewerLive";

/**
 * S5 · The signature interaction (DESIGN-PLAN §5): a part in a glass viewport,
 * disassembled by scroll along authored explode vectors while HUD callout
 * lines draw out to DOM annotations.
 *
 * Tier 1 — live viewport (dynamic chunk; own context — the background canvas
 *          never mounts on PDPs, so one WebGL context is live at a time).
 * Tier 2 — the same authored explode as three pre-rendered stills, crossfaded
 *          by the same scroll pin. Zero bytes of three.js downloaded.
 * Tier 3 — exploded still, no pin. The annotation list rendered by the PDP
 *          below this viewport is plain DOM on every tier.
 */

const Live = dynamic(() => import("./ExplodedViewerLive"), { ssr: false });

export interface ViewerAnnotation {
  part: string;
  label: string;
  value: string;
  verification: "verified" | "pending";
}

export function ExplodedViewer({
  procedural,
  annotations,
  poster,
  hint,
  sceneLabel,
  pendingLabel,
}: {
  procedural: string;
  annotations: ViewerAnnotation[];
  poster: string;
  hint: string;
  sceneLabel: string;
  pendingLabel: string;
}) {
  const { tier } = useTier();
  const wrapRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const stillRefs = useRef<Array<HTMLDivElement | null>>([]);
  const labelsRef = useRef<Array<HTMLElement | null>>([]);
  const linesRef = useRef<Array<SVGLineElement | null>>([]);
  const anchorsRef = useRef<Array<{ x: number; y: number }>>([]);
  const progress = useRef(0);
  const entry = useRef(0);
  const [inView, setInView] = useState(false);
  // SSR renders the stills branch; the live viewport swaps in post-mount on
  // Tier 1 only — no hydration mismatch, and the still doubles as the poster
  // while the three.js chunk loads.
  const [live, setLive] = useState(false);
  useEffect(() => setLive(tier === 1), [tier]);

  const refs: CalloutRefs = { labels: labelsRef, lines: linesRef, anchors: anchorsRef };

  // scroll pin + progress (identical mechanics on Tier 1 and 2)
  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const st = ScrollTrigger.create({
      trigger: wrap,
      start: "top top",
      end: "bottom bottom",
      scrub: SCRUB,
      onUpdate: (self) => {
        progress.current = self.progress;
        if (hintRef.current)
          hintRef.current.style.opacity = self.progress > 0.04 ? "0" : "1";
        stillRefs.current.forEach((el, i) => {
          if (!el) return;
          const active = Math.min(2, Math.floor(self.progress * 3));
          el.style.opacity = i === active ? "1" : "0";
        });
      },
    });
    return () => st.kill();
  }, []);

  // arm rendering + entry materialise when the viewport is on screen
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !live) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  useEffect(() => {
    if (!inView) return;
    const tween = gsap.to(entry, { current: 1, duration: 1.6, ease: "power2.inOut" });
    return () => {
      tween.kill();
    };
  }, [inView]);

  // label anchor points for the connector lines
  useEffect(() => {
    if (!live) return;
    const measure = () => {
      const vp = viewportRef.current?.getBoundingClientRect();
      if (!vp) return;
      anchorsRef.current = labelsRef.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        const onRight = r.left - vp.left > vp.width / 2;
        return {
          x: onRight ? r.left - vp.left - 6 : r.right - vp.left + 6,
          y: r.top - vp.top + r.height / 2,
        };
      });
    };
    // after paint so label slots have laid out
    const id = window.setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [live, annotations.length]);

  const stills = [0, 1, 2].map((i) => `/media/exploded/${procedural}/${i}.jpg`);

  return (
    <section
      ref={wrapRef}
      className="relative [html[data-motion=full]_&]:h-[280vh]"
      aria-label={sceneLabel}
    >
      <p className="sr-only">{sceneLabel}</p>
      <div className="min-h-[100svh] py-[12svh] [html[data-motion=full]_&]:sticky [html[data-motion=full]_&]:top-0 [html[data-motion=full]_&]:h-[100svh]">
        <div
          ref={viewportRef}
          className="panel ticks container-wide relative h-[76svh] overflow-hidden"
        >
          <p className="micro micro--hud absolute left-5 top-4 z-20">
            SYS · VIEWPORT / EXPLODE
          </p>

          {/* stills: SSR baseline, Tier 2's scrub frames, Tier 3's exploded still */}
          {!live && (
            <div className="absolute inset-0">
              {stills.map((src, i) => (
                <div
                  key={src}
                  ref={(el) => {
                    stillRefs.current[i] = el;
                  }}
                  className={`still-${i} absolute inset-0 transition-opacity duration-500`}
                  style={{ opacity: i === 0 ? 1 : 0 }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="94vw"
                    className="object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = poster;
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {live && (
            <>
              <Live
                procedural={procedural}
                parts={annotations.map((a) => ({ id: a.part }))}
                inView={inView}
                getProgress={() => progress.current}
                getEntry={() => entry.current}
                refs={refs}
              />
              <svg
                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                aria-hidden="true"
              >
                {annotations.map((a, i) => (
                  <line
                    key={a.part}
                    ref={(el) => {
                      linesRef.current[i] = el;
                    }}
                    stroke="var(--color-hud)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    style={{ opacity: 0 }}
                  />
                ))}
              </svg>
              {annotations.map((a, i) => {
                const right = i % 2 === 0;
                const row = Math.floor(i / 2);
                return (
                  <div
                    key={a.part}
                    ref={(el) => {
                      labelsRef.current[i] = el;
                    }}
                    className={`panel panel--solid absolute z-20 hidden w-56 px-4 py-3 md:block ${
                      right ? "right-4" : "left-4"
                    }`}
                    style={{ top: `${12 + row * 20}%`, opacity: 0 }}
                  >
                    <p className="micro micro--hud">{a.label}</p>
                    {a.verification === "verified" ? (
                      <p className="readout mt-1 text-sm">{a.value}</p>
                    ) : (
                      <p className="mt-1.5">
                        <span className="chip-pending">{pendingLabel}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <p
            ref={hintRef}
            className="micro absolute bottom-4 left-1/2 z-20 -translate-x-1/2 text-white transition-opacity duration-500"
          >
            ↓ {hint}
          </p>
        </div>
      </div>
    </section>
  );
}
