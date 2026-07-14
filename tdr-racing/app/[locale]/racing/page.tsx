import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { Reveal } from "@/components/motion/Reveal";
import { LapChapters } from "@/components/racing/LapChapters";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/racing",
    `${dict.nav.racing} — TDR One Team`,
    locale === "id"
      ? "One Team adalah tempat part TDR membuktikan klaimnya."
      : "One Team is where TDR parts earn their claims.",
  );
}

export default async function RacingPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const copy =
    locale === "id"
      ? {
          h1: "Garis merah itu bukan hiasan.",
          sub: "TDR One Team membalap agar katalog ini jujur: akhir pekan balap adalah siklus pengembangan dengan lap time sebagai umpan balik. Konten tdroneteam.com kini tinggal di halaman ini.",
          team: {
            title: "One Team.",
            body: "Tim balap pabrikan TDR — pembalap, mekanik, dan insinyur yang sama dengan yang menandatangani spesifikasi katalog. Susunan pembalap dan biografi menunggu konfirmasi tim.",
          },
          results: {
            title: "Jadwal & hasil.",
            body: "Kalender 2026, hasil balap, dan klasemen akan tayang di sini setelah dikonfirmasi tim — terverifikasi, seperti semua angka di situs ini.",
          },
          note: "Layout sirkuit distilisasi dari Sentul International Circuit dan menunggu verifikasi.",
          cta: "Part yang dibalap",
        }
      : {
          h1: "The red line isn't decoration.",
          sub: "TDR One Team races to keep this catalogue honest: race weekends are development cycles with lap times for feedback. tdroneteam.com now lives on this page.",
          team: {
            title: "One Team.",
            body: "TDR's factory racing effort — the same riders, mechanics and engineers who sign off the catalogue's specs. Rider lineup and bios are pending confirmation from the team.",
          },
          results: {
            title: "Schedule & results.",
            body: "The 2026 calendar, results and standings publish here once confirmed by the team — verified, like every number on this site.",
          },
          note: "Circuit layout is stylised from Sentul International Circuit, pending verification.",
          cta: "The parts that race",
        };

  return (
    <div className="pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-12">
        <p className="micro micro--hud mb-5" data-reveal="">
          SYS · RACE / ONE TEAM — SENTUL
        </p>
        <SplitHeadline text={copy.h1} as="h1" className="display-1 max-w-5xl" immediate delay={0.1} />
        <p className="claim mt-6 max-w-2xl text-chrome" data-reveal="">
          {copy.sub}
        </p>
        <p className="micro mt-4 opacity-70" data-reveal="">
          {copy.note}
        </p>
      </header>

      {/* Tier 2/3 backdrop; Tier 1 sees the live circuit behind */}
      <div
        className="pointer-events-none fixed inset-0 z-0 [html[data-tier='1']_&]:hidden"
        aria-hidden="true"
      >
        <Image src="/posters/racing.jpg" alt="" fill sizes="100vw" className="object-cover opacity-50" />
        <div className="atmo absolute inset-0 opacity-70" />
      </div>
      <p className="sr-only">{dict.a11y.sceneTrack}</p>

      <LapChapters
        panels={{ team: copy.team, results: copy.results }}
        pendingLabel={dict.common.pending}
        distLabel="DIST"
        turnLabel="TURN"
      />

      <section className="relative z-10 border-t border-(--glass-brd) bg-bay py-20">
        <div className="mx-auto flex w-[min(92vw,1560px)] flex-wrap items-center justify-between gap-6">
          <Reveal>
            <h2 className="display-2 max-w-xl">{copy.cta}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Link href={localeHref(locale, "/products/power")} className="btn btn-primary">
              Power →
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
