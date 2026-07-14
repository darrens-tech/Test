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
  return pageMetadata(locale, "/support", dict.support.title, dict.support.title);
}

export default async function SupportPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const t =
    locale === "id"
      ? {
          h1: "Dukungan tanpa drama.",
          warranty:
            "Ketentuan garansi resmi sedang dimigrasi dari dokumen internal TDR dan akan tayang di sini. Sampai saat itu, klaim garansi berjalan lewat dealer tempat pembelian.",
          authenticity: dict.pdp.authenticity,
          install:
            "Panduan pemasangan per SKU tercantum di halaman produk. Jika sebuah panduan masih berstatus TBD, mintalah lewat kontak resmi — jangan menebak torsi.",
          faq: [
            [
              "Kenapa banyak nilai bertanda TBD?",
              "Karena kami tidak menerbitkan angka yang belum diverifikasi tim teknik. TBD berarti datanya sedang diverifikasi — bukan tidak ada.",
            ],
            [
              "Kompatibilitas motorku berstatus 'menunggu verifikasi'. Boleh dipasang?",
              "Tunggu konfirmasi, atau tanyakan lewat kanal resmi. Kompatibilitas yang salah adalah risiko keselamatan dan membatalkan garansi.",
            ],
            [
              "Di mana beli part asli?",
              "Lewat dealer resmi dan toko marketplace resmi yang tercantum di halaman Tempat Membeli setelah diverifikasi.",
            ],
          ],
        }
      : {
          h1: "Support without drama.",
          warranty:
            "Official warranty terms are being migrated from TDR's internal documents and will publish here. Until then, warranty claims run through your purchasing dealer.",
          authenticity: dict.pdp.authenticity,
          install:
            "Per-SKU install guides are linked from each product page. If a guide is still TBD, ask through official channels — don't guess torque values.",
          faq: [
            [
              "Why do so many values say TBD?",
              "Because we don't publish numbers TDR engineering hasn't verified. TBD means the data is being verified — not that it doesn't exist.",
            ],
            [
              "My bike's fitment says 'pending verification'. Can I install the part?",
              "Wait for confirmation, or ask through official channels first. Wrong fitment is a safety risk and voids warranty.",
            ],
            [
              "Where do I buy genuine parts?",
              "Through authorized dealers and the official marketplace stores listed on Where to buy once verified.",
            ],
          ],
        };

  const blocks: Array<[string, string]> = [
    [dict.support.warranty, t.warranty],
    [dict.support.authenticity, t.authenticity],
    [dict.support.install, t.install],
  ];

  return (
    <div className="atmo pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-14">
        <p className="micro micro--hud mb-5" data-reveal="">
          SYS · SUPPORT
        </p>
        <SplitHeadline text={t.h1} as="h1" className="display-1 max-w-4xl" immediate delay={0.1} />
      </header>

      <div className="mx-auto grid w-[min(92vw,1560px)] gap-5 pb-16 md:grid-cols-3">
        {blocks.map(([title, body], i) => (
          <Reveal key={title} delay={i * 0.05}>
            <div className="panel panel--solid ticks h-full p-7">
              <h2 className="h3">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-chrome">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <section className="mx-auto w-[min(92vw,1560px)] pb-28" aria-labelledby="faq">
        <Reveal>
          <h2 id="faq" className="micro micro--hud mb-6">
            {dict.support.faq}
          </h2>
        </Reveal>
        <div className="flex flex-col gap-4">
          {t.faq.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.04}>
              <details className="panel panel--solid group p-6">
                <summary className="cursor-pointer list-none text-white">
                  <span className="h3 text-base">{q}</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-chrome">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-10 text-sm text-chrome">
            <Link href={localeHref(locale, "/contact")} className="text-hud underline-offset-4 hover:underline">
              {dict.common.whatsapp} →
            </Link>
          </p>
        </Reveal>
      </section>
    </div>
  );
}
