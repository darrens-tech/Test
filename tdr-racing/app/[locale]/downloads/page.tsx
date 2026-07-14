import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { Reveal } from "@/components/motion/Reveal";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/downloads", dict.nav.downloads, dict.nav.downloads);
}

export default async function DownloadsPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const t =
    locale === "id"
      ? {
          h1: "Dokumen teknis.",
          sub: "Katalog, panduan pemasangan, dan lembar spesifikasi — dokumen tayang di sini setelah diverifikasi tim teknik TDR.",
          groups: [
            ["Katalog produk (PDF)", "Katalog lengkap empat pilar."],
            ["Panduan pemasangan (PDF)", "Per SKU — tercantum juga di halaman produk masing-masing."],
            ["Lembar spesifikasi (PDF)", "Dimensi, toleransi, dan data dyno per part."],
          ],
          note: "Butuh dokumen sekarang?",
        }
      : {
          h1: "Technical documents.",
          sub: "Catalogues, install guides and spec sheets — documents publish here once verified by TDR engineering.",
          groups: [
            ["Product catalogue (PDF)", "The full four-pillar catalogue."],
            ["Install guides (PDF)", "Per SKU — also linked from each product page."],
            ["Spec sheets (PDF)", "Dimensions, tolerances and dyno data per part."],
          ],
          note: "Need a document now?",
        };

  return (
    <div className="atmo pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-14">
        <p className="micro micro--hud mb-5" data-reveal="">
          SYS · DOCS / DOWNLOADS
        </p>
        <SplitHeadline text={t.h1} as="h1" className="display-1 max-w-4xl" immediate delay={0.1} />
        <p className="claim mt-6 max-w-xl text-chrome" data-reveal="">
          {t.sub}
        </p>
      </header>
      <div className="mx-auto grid w-[min(92vw,1560px)] gap-5 pb-16 md:grid-cols-3">
        {t.groups.map(([title, sub], i) => (
          <Reveal key={title} delay={i * 0.05}>
            <div className="panel panel--solid ticks h-full p-7">
              <h2 className="h3">{title}</h2>
              <p className="mt-3 text-sm text-chrome">{sub}</p>
              <p className="mt-5">
                <span className="chip-pending">{dict.common.pending}</span>
              </p>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mx-auto w-[min(92vw,1560px)] pb-28">
        <Reveal>
          <p className="text-sm text-chrome">
            {t.note}{" "}
            <Link href={localeHref(locale, "/contact")} className="text-hud underline-offset-4 hover:underline">
              {dict.nav.contact} →
            </Link>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
