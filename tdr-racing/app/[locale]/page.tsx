import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HeroMachine } from "@/components/home/HeroMachine";
import { PillarsChapter } from "@/components/home/PillarsChapter";
import { Reveal } from "@/components/motion/Reveal";
import { getNews } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/", "TDR — MACHINE OS", dict.hero.sub);
}

/**
 * Home — five beats, no sixth (DESIGN-PLAN §5):
 * THE MACHINE → FOUR PILLARS (pinned) → TECHNOLOGY teaser → NEWS → BUY strip.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const news = getNews().slice(0, 3);

  return (
    <>
      <HeroMachine locale={locale} dict={dict} />
      <PillarsChapter locale={locale} dict={dict} />

      {/* Beat 3 · Technology teaser — the dyno is the referee */}
      <section className="relative overflow-hidden bg-bay py-28">
        <div className="gridfloor absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid w-[min(92vw,1560px)] items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-(--glass-brd)">
              <Image
                src="/posters/technology.jpg"
                alt=""
                fill
                sizes="(min-width:1024px) 55vw, 92vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/70 to-transparent" />
              <p className="micro micro--hud absolute bottom-4 left-5">
                SYS · TECH / DYNO CELL — 02
              </p>
            </div>
          </Reveal>
          <div>
            <Reveal>
              <p className="micro micro--hud mb-5">{dict.techTeaser.eyebrow}</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="display-2">{dict.techTeaser.title}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-md text-chrome">{dict.techTeaser.sub}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <Link href={localeHref(locale, "/technology")} className="btn btn-ghost mt-8">
                {dict.techTeaser.cta} →
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Beat 4 · Latest news — quiet glass cards */}
      <section className="py-28">
        <div className="mx-auto w-[min(92vw,1560px)]">
          <Reveal>
            <p className="micro micro--hud mb-4">{dict.news.eyebrow}</p>
          </Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal delay={0.05}>
              <h2 className="display-2">{dict.news.title}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <Link href={localeHref(locale, "/news")} className="btn btn-ghost">
                {dict.news.all} →
              </Link>
            </Reveal>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {news.map((n, i) => (
              <Reveal key={n.slug} delay={i * 0.06}>
                <Link
                  href={localeHref(locale, `/news/${n.slug}`)}
                  className="panel panel--solid ticks lift block h-full p-7"
                >
                  <p className="micro micro--hud">{n.tag}</p>
                  <p className="readout mt-3 text-xs text-chrome">{n.date}</p>
                  <h3 className="h3 mt-3">{locale === "id" ? n.titleId : n.title}</h3>
                  <p className="mt-3 text-sm text-chrome">
                    {locale === "id" ? n.excerptId : n.excerpt}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Beat 5 · Where-to-buy strip — the archipelago */}
      <section className="relative overflow-hidden border-t border-(--glass-brd) bg-bay py-28">
        <div className="relative mx-auto grid w-[min(92vw,1560px)] items-center gap-10 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="micro micro--hud mb-5">{dict.buyStrip.eyebrow}</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="display-2">{dict.buyStrip.title}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-md text-chrome">{dict.buyStrip.sub}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <Link href={localeHref(locale, "/where-to-buy")} className="btn btn-primary mt-8">
                {dict.buyStrip.cta}
              </Link>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-(--glass-brd)">
              <Image
                src="/posters/archipelago.jpg"
                alt=""
                fill
                sizes="(min-width:1024px) 45vw, 92vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
