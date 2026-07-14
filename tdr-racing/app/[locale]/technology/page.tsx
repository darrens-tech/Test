import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { Reveal } from "@/components/motion/Reveal";
import { TechnologyChapters, type Station } from "@/components/tech/TechnologyChapters";

type Params = Promise<{ locale: string }>;

const STATIONS: Record<Locale, Station[]> = {
  en: [
    {
      code: "SYS · TECH / 01 CNC BAY",
      title: "Machined in-house.",
      body: "Cylinder bores, pulley faces, hubs — the geometry that decides whether a part lives is cut here, in Jakarta, not bought in. Owning the machines means owning the tolerances.",
      note: "Equipment list and machining tolerances",
    },
    {
      code: "TELEMETRY · 02 DYNO CELL",
      title: "Parts are claims. The dyno is the referee.",
      body: "Every development cycle ends on the roller. A part that doesn't repeat its number under heat and hours doesn't get a part number. When a dyno chart appears in this catalogue, it was made in this room.",
      note: "Dyno specification and published charts",
    },
    {
      code: "SYS · TECH / 03 COATING LINE",
      title: "Surfaces are specs too.",
      body: "Friction lives at the surface. Treatments and platings are applied and cured in-line, then measured — a coating that isn't measured is just paint.",
      note: "Coating processes and thickness specs",
    },
    {
      code: "SYS · TECH / 04 QC LAB",
      title: "Room four is quiet.",
      body: "Granite, gauges, patience. Every batch samples through here before packing. Fail a tolerance in room four and the batch goes back to room one. That loop is the product.",
      note: "Measurement equipment list",
    },
  ],
  id: [
    {
      code: "SYS · TEKNOLOGI / 01 AREA CNC",
      title: "Dimesin sendiri.",
      body: "Bore silinder, muka puli, hub — geometri yang menentukan hidup-matinya sebuah part dikerjakan di sini, di Jakarta, bukan dibeli jadi. Memiliki mesinnya berarti memiliki toleransinya.",
      note: "Daftar peralatan dan toleransi permesinan",
    },
    {
      code: "TELEMETRI · 02 SEL DYNO",
      title: "Part adalah klaim. Dyno adalah wasitnya.",
      body: "Setiap siklus pengembangan berakhir di atas roller. Part yang angkanya tidak konsisten di bawah panas dan jam pemakaian tidak akan mendapat nomor part. Ketika grafik dyno muncul di katalog ini, ia lahir dari ruangan ini.",
      note: "Spesifikasi dyno dan grafik terpublikasi",
    },
    {
      code: "SYS · TEKNOLOGI / 03 LINI COATING",
      title: "Permukaan juga spesifikasi.",
      body: "Gesekan hidup di permukaan. Pelapisan diterapkan dan dikeringkan dalam satu lini, lalu diukur — coating yang tidak diukur hanyalah cat.",
      note: "Proses coating dan spesifikasi ketebalan",
    },
    {
      code: "SYS · TEKNOLOGI / 04 LAB QC",
      title: "Ruangan keempat itu sunyi.",
      body: "Granit, alat ukur, kesabaran. Setiap batch disampel di sini sebelum dikemas. Gagal toleransi di ruangan empat, batch kembali ke ruangan satu. Putaran itulah produknya.",
      note: "Daftar alat ukur",
    },
  ],
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/technology", dict.nav.technology, dict.techTeaser.sub);
}

export default async function TechnologyPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const stations = STATIONS[locale];

  return (
    <div className="pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-16">
        <p className="micro micro--hud mb-5" data-reveal="">
          SYS · TECH / TECHNOLOGY CENTER — JAKARTA
        </p>
        <SplitHeadline
          text={locale === "id" ? "Empat ruangan. Satu toleransi." : "Four rooms. One tolerance."}
          as="h1"
          className="display-1 max-w-5xl"
          immediate
          delay={0.1}
        />
        <p className="claim mt-6 max-w-2xl text-chrome" data-reveal="">
          {dict.techTeaser.sub}
        </p>
      </header>

      {/* Tier 2 backdrop while the pin runs (Tier 1 sees the live dolly behind) */}
      <div className="pointer-events-none fixed inset-0 z-0 [html[data-tier='1']_&]:hidden" aria-hidden="true">
        <Image src="/posters/technology.jpg" alt="" fill sizes="100vw" className="object-cover opacity-50" />
        <div className="atmo absolute inset-0 opacity-70" />
      </div>

      <TechnologyChapters stations={stations} pendingLabel={dict.common.pending} dict={dict} />

      <section className="relative z-10 border-t border-(--glass-brd) bg-bay py-20">
        <div className="mx-auto flex w-[min(92vw,1560px)] flex-wrap items-center justify-between gap-6">
          <div>
            <Reveal>
              <h2 className="display-2">{locale === "id" ? "Lihat hasilnya." : "See what it produces."}</h2>
            </Reveal>
            <Reveal delay={0.06}>
              <p className="mt-4 max-w-md text-chrome">
                {locale === "id"
                  ? "Katalog adalah keluaran dari empat ruangan ini."
                  : "The catalogue is the output of these four rooms."}
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Link href={localeHref(locale, "/products")} className="btn btn-primary">
              {dict.nav.products} →
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
