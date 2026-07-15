"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger, SCRUB } from "@/lib/gsap";
import { emitScene } from "@/lib/scrollBus";

/**
 * THE TRACK lap pin (DESIGN-PLAN §5/S3). Scroll draws the racing line; the
 * DIST readout is computed live from lap progress against Sentul's published
 * 4.12 km length — a measured value of the scene, never an invented lap time
 * (results stay PENDING until One Team confirms them).
 */

const LAP_METERS = 4120; // Sentul International Circuit — layout flagged GAP-014

export function LapChapters({
  panels,
  pendingLabel,
  distLabel,
  turnLabel,
}: {
  panels: { team: { title: string; body: string }; results: { title: string; body: string } };
  pendingLabel: string;
  distLabel: string;
  turnLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const turnRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") {
      emitScene({ scene: "track", progress: 1 });
      if (distRef.current) distRef.current.textContent = `${LAP_METERS.toLocaleString()} m`;
      if (turnRef.current) turnRef.current.textContent = "11 / 11";
      return;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const st = ScrollTrigger.create({
      trigger: wrap,
      start: "top top",
      end: "bottom bottom",
      scrub: SCRUB,
      onUpdate: (self) => {
        emitScene({ scene: "track", progress: self.progress });
        if (distRef.current)
          distRef.current.textContent = `${Math.round(self.progress * LAP_METERS).toLocaleString()} m`;
        if (turnRef.current)
          turnRef.current.textContent = `${Math.max(1, Math.ceil(self.progress * 11))} / 11`;
      },
    });
    return () => st.kill();
  }, []);

  return (
    <div ref={wrapRef} className="relative [html[data-motion=full]_&]:h-[420vh]">
      <div className="[html[data-motion=full]_&]:sticky [html[data-motion=full]_&]:top-0 [html[data-motion=full]_&]:h-[100svh]">
        <div className="container-x flex h-full flex-col justify-between gap-6 py-28 [html[data-motion=static]_&]:py-10">
          {/* S1 — live lap telemetry (computed, mono) */}
          <div className="panel ticks w-fit px-6 py-4">
            <p className="micro micro--hud">TELEMETRY · LAP</p>
            <p className="readout mt-2 text-2xl">
              <span ref={distRef}>0 m</span>
              <span className="text-sm text-chrome"> / {LAP_METERS.toLocaleString()} m</span>
            </p>
            <p className="readout mt-1 text-xs text-chrome">
              {turnLabel} <span ref={turnRef}>1 / 11</span> · {distLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            {/* S2 — One Team */}
            <div className="panel ticks max-w-md p-7">
              <p className="micro micro--hud mb-3">SYS · RACE / ONE TEAM</p>
              <h2 className="h3">{panels.team.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-chrome">{panels.team.body}</p>
            </div>

            {/* S3 — season data: pending, never invented */}
            <div className="panel panel--solid ticks max-w-sm p-7">
              <p className="micro micro--hud mb-3">SYS · RACE / 2026 SEASON</p>
              <h2 className="h3">{panels.results.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-chrome">{panels.results.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip-pending">{pendingLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
