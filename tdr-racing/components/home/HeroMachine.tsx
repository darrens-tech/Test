"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { emitScene } from "@/lib/scrollBus";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Beat 1 · THE MACHINE. Owns the load sequence (once per session, skippable
 * by scroll — brief §6): void → grid → wireframe draws → materials resolve →
 * headline rises → dock settles. Boot-log lines flip on the *actual* timeline
 * milestones (no fake percentages, brief §11). Poster underneath is the LCP
 * element on every tier; on Tier 1 the canvas fades in over it.
 */

const BOOT_STAGES: Array<[number, string]> = [
  [0.02, "SYS BOOT · MACHINE OS v2.0"],
  [0.18, "GEOMETRY · DRAWING"],
  [0.5, "MATERIALS · RESOLVING"],
  [0.82, "TELEMETRY · LINKED"],
  [1, "READY"],
];

export function HeroMachine({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [bootLine, setBootLine] = useState(BOOT_STAGES[0][1]);
  const [introDone, setIntroDone] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const headlineDelay = useRef(1.7);

  useEffect(() => {
    const full = document.documentElement.dataset.motion === "full";
    const tier1 = document.documentElement.dataset.tier === "1";
    const seen = sessionStorage.getItem("tdr-intro") === "1";

    // Tier 1: fade the poster once the canvas is live underneath it.
    const onGlLive = () => posterRef.current?.classList.add("opacity-0");
    window.addEventListener("tdr:gl-live", onGlLive);

    if (!full || !tier1 || seen) {
      headlineDelay.current = 0.15;
      emitScene({ scene: "home", progress: 1 });
      setBootLine("READY");
      setIntroDone(true);
      if (tier1) sessionStorage.setItem("tdr-intro", "1");
      return () => window.removeEventListener("tdr:gl-live", onGlLive);
    }

    const state = { p: 0 };
    const tl = gsap.timeline({
      onUpdate: () => {
        emitScene({ scene: "home", progress: state.p });
        const stage = BOOT_STAGES.filter(([at]) => state.p >= at).pop();
        if (stage) setBootLine(stage[1]);
      },
      onComplete: () => {
        sessionStorage.setItem("tdr-intro", "1");
        setIntroDone(true);
      },
    });
    tl.to(state, { p: 1, duration: 2.4, ease: "power2.inOut", delay: 0.35 });

    // Skippable by scroll/keys — jump the whole sequence to its end state.
    const skip = () => {
      if (tl.progress() < 1) tl.progress(1);
    };
    window.addEventListener("wheel", skip, { passive: true, once: true });
    window.addEventListener("touchstart", skip, { passive: true, once: true });
    window.addEventListener("keydown", skip, { once: true });

    return () => {
      tl.kill();
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("tdr:gl-live", onGlLive);
    };
  }, []);

  return (
    <section className="atmo relative flex min-h-[100svh] items-end overflow-hidden">
      {/* Poster — the LCP element. Canvas (fixed, z-0 behind main) takes over on Tier 1. */}
      <div
        ref={posterRef}
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        aria-hidden="true"
      >
        <Image
          src="/posters/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/40" />
      </div>

      <p className="sr-only">{dict.a11y.sceneHero}</p>

      <div className="relative z-10 mx-auto w-[min(92vw,1560px)] pb-24 pt-40">
        <p className="micro micro--hud mb-6" data-reveal="">
          {dict.hero.eyebrow}
        </p>
        <SplitHeadline
          text={dict.hero.title}
          as="h1"
          className="display-1 max-w-[12ch]"
          immediate
          delay={headlineDelay.current}
        />
        <p className="claim mt-8 max-w-xl text-chrome" data-reveal="">
          {dict.hero.sub}
        </p>
        <div className="mt-10 flex flex-wrap gap-3" data-reveal="">
          <Link href={localeHref(locale, "/fit")} className="btn btn-primary">
            {dict.hero.ctaFit}
          </Link>
          <Link href={localeHref(locale, "/technology")} className="btn btn-ghost">
            {dict.hero.ctaTech}
          </Link>
        </div>
      </div>

      {/* boot readout — bottom right, the viewport's one scanline */}
      <div className="panel ticks scanline absolute bottom-6 right-6 z-10 hidden w-64 px-5 py-4 md:block">
        <p className="micro mb-2">TELEMETRY · BOOT</p>
        <p className="readout text-sm text-hud" aria-live="polite">
          {bootLine}
        </p>
        <p className="micro mt-3 opacity-70">{introDone ? "SCROLL ↓" : dict.hero.skip}</p>
      </div>
    </section>
  );
}
