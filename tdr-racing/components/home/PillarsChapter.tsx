"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, SCRUB } from "@/lib/gsap";
import { emitScene } from "@/lib/scrollBus";
import { PILLARS } from "@/lib/content/taxonomy";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Beat 2 · FOUR PILLARS — the home page's pinned chapter (its one hero motion
 * moment). 480vh of scroll scrubs four beats; each pillar's panel docks left
 * while its part orbits in on the right (GL on Tier 1, poster crossfade on
 * Tier 2). data-motion="static" renders the stacked variant instead — pins
 * unwound, everything legible (Tier 3 gate, brief §6).
 */
export function PillarsChapter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const imgRefs = useRef<Array<HTMLDivElement | null>>([]);

  const pillarCopy = (slug: string) =>
    dict.pillars[slug as keyof typeof dict.pillars] as { name: string; line: string };

  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const panels = panelRefs.current.filter(Boolean) as HTMLDivElement[];
    const images = imgRefs.current.filter(Boolean) as HTMLDivElement[];
    gsap.set(panels, { opacity: 0, y: 48 });
    gsap.set(panels[0], { opacity: 1, y: 0 });
    gsap.set(images, { opacity: 0 });
    gsap.set(images[0], { opacity: 1 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        scrub: SCRUB,
        onUpdate: (self) => {
          const ch = Math.min(3, Math.floor(self.progress * 4));
          emitScene({
            scene: "home",
            chapter: ch,
            chapterProgress: self.progress * 4 - ch,
          });
        },
        onLeaveBack: () => emitScene({ scene: "home", chapter: -1 }),
        onLeave: () => emitScene({ scene: "home", chapter: -1 }),
      },
    });

    // 4 beats × 1 unit: settle → hold → hand over
    for (let i = 0; i < 4; i++) {
      const at = i;
      if (i > 0) {
        tl.to(panels[i - 1], { opacity: 0, y: -36, duration: 0.28, ease: "power3.in" }, at - 0.28);
        tl.to(images[i - 1], { opacity: 0, duration: 0.28 }, at - 0.28);
        tl.fromTo(
          panels[i],
          { opacity: 0, y: 48 },
          { opacity: 1, y: 0, duration: 0.34, ease: "power3.out" },
          at - 0.06,
        );
        tl.to(images[i], { opacity: 1, duration: 0.34 }, at - 0.06);
      }
      tl.to({}, { duration: 0.72 }, at + 0.28); // hold
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <>
      {/* Pinned variant (Tier 1/2) */}
      <div
        ref={wrapRef}
        className="relative h-[480vh] [html[data-motion=static]_&]:hidden"
        aria-hidden={false}
      >
        <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
          <div className="container-x grid items-center gap-8 lg:grid-cols-2">
            <div className="relative min-h-[24rem]">
              {PILLARS.map((p, i) => (
                <div
                  key={p.slug}
                  ref={(el) => {
                    panelRefs.current[i] = el;
                  }}
                  className="panel ticks absolute inset-x-0 top-1/2 -translate-y-1/2 p-8 lg:p-10"
                >
                  <p className="micro micro--hud mb-4">{p.code}</p>
                  <h2 className="display-2">{pillarCopy(p.slug).name}</h2>
                  <p className="mt-4 max-w-md text-chrome">{pillarCopy(p.slug).line}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {p.subcategories.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={localeHref(locale, `/products/${p.slug}/${s.slug}`)}
                          className="micro lift inline-block rounded-full border border-(--glass-brd) px-3.5 py-2 text-white"
                        >
                          {locale === "id" ? s.nameId : s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={localeHref(locale, `/products/${p.slug}`)}
                    className="btn btn-ghost mt-8"
                  >
                    {dict.pillars.browse} {pillarCopy(p.slug).name} →
                  </Link>
                </div>
              ))}
            </div>

            {/* Right stage: GL prop shows through on Tier 1; posters on Tier 2 */}
            <div className="relative hidden h-[60vh] lg:block">
              {PILLARS.map((p, i) => (
                <div
                  key={p.slug}
                  ref={(el) => {
                    imgRefs.current[i] = el;
                  }}
                  className="absolute inset-0 [html[data-tier='1']_&]:hidden"
                >
                  <Image
                    src={`/posters/pillar-${p.slug}.jpg`}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 45vw, 0px"
                    className="rounded-3xl object-cover opacity-90"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Static variant (Tier 3 / reduced motion / no-JS) */}
      <section className="container-x hidden flex-col gap-6 py-24 [html[data-motion=static]_&]:flex">
        <p className="micro micro--hud">{dict.pillars.eyebrow}</p>
        <h2 className="display-2">{dict.pillars.title}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.slug} className="panel panel--solid ticks p-8">
              <p className="micro micro--hud mb-3">{p.code}</p>
              <h3 className="h3">{pillarCopy(p.slug).name}</h3>
              <p className="mt-3 text-sm text-chrome">{pillarCopy(p.slug).line}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {p.subcategories.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={localeHref(locale, `/products/${p.slug}/${s.slug}`)}
                      className="micro inline-block rounded-full border border-(--glass-brd) px-3.5 py-2 text-white"
                    >
                      {locale === "id" ? s.nameId : s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
