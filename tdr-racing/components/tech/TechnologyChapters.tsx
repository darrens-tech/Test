"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, SCRUB } from "@/lib/gsap";
import { emitScene } from "@/lib/scrollBus";
import type { Dictionary } from "@/lib/i18n";

/**
 * THE WORKSHOP dolly (DESIGN-PLAN §5/S2): one pinned take, four chapters,
 * panels docking R→L→R→L beside each station while the camera arrives.
 * The last chapter (QC) deliberately settles to near-stillness — tolerances
 * land in silence. Tier 2 rides the same pin over the poster; Tier 3 stacks.
 */

export interface Station {
  code: string;
  title: string;
  body: string;
  note: string | null; // pending-verification line, if any
}

export function TechnologyChapters({
  stations,
  pendingLabel,
  dict,
}: {
  stations: Station[];
  pendingLabel: string;
  dict: Dictionary;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") {
      emitScene({ scene: "workshop", progress: 1 });
      return;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const panels = panelRefs.current.filter(Boolean) as HTMLDivElement[];
    gsap.set(panels, { opacity: 0, y: 56 });
    gsap.set(panels[0], { opacity: 1, y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        scrub: SCRUB,
        onUpdate: (self) => emitScene({ scene: "workshop", progress: self.progress }),
      },
    });

    for (let i = 1; i < panels.length; i++) {
      tl.to(panels[i - 1], { opacity: 0, y: -40, duration: 0.3, ease: "power3.in" }, i - 0.3);
      tl.fromTo(
        panels[i],
        { opacity: 0, y: 56 },
        { opacity: 1, y: 0, duration: 0.36, ease: "power3.out" },
        i - 0.05,
      );
      tl.to({}, { duration: 0.64 }, i + 0.31);
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <>
      {/* pinned take (Tier 1/2) */}
      <div ref={wrapRef} className="relative h-[480vh] [html[data-motion=static]_&]:hidden">
        <div className="sticky top-0 flex h-[100svh] items-center">
          <div className="relative mx-auto h-[60vh] w-[min(92vw,1560px)]">
            {stations.map((s, i) => (
              <div
                key={s.code}
                ref={(el) => {
                  panelRefs.current[i] = el;
                }}
                className={`panel ticks absolute top-1/2 w-[min(88vw,26rem)] -translate-y-1/2 p-8 ${
                  i % 2 === 0 ? "right-0" : "left-0"
                }`}
              >
                <p className="micro micro--hud mb-3">{s.code}</p>
                <h2 className="h3">{s.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-chrome">{s.body}</p>
                {s.note && (
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-chrome">
                    {s.note} <span className="chip-pending">{pendingLabel}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* static stack (Tier 3) */}
      <div className="mx-auto hidden w-[min(92vw,1560px)] flex-col gap-6 py-16 [html[data-motion=static]_&]:flex">
        {stations.map((s) => (
          <div key={s.code} className="panel panel--solid ticks p-8">
            <p className="micro micro--hud mb-3">{s.code}</p>
            <h2 className="h3">{s.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-chrome">{s.body}</p>
            {s.note && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-chrome">
                {s.note} <span className="chip-pending">{pendingLabel}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      <span className="sr-only">{dict.a11y.sceneWorkshop}</span>
    </>
  );
}
