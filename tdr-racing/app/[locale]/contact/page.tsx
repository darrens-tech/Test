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
  return pageMetadata(locale, "/contact", dict.nav.contact, dict.footer.tagline);
}

export default async function ContactPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const t =
    locale === "id"
      ? {
          h1: "Bicara dengan orang yang membuat partnya.",
          sub: "Kanal resmi sedang dimigrasi ke situs baru ini. Sampai nomor WhatsApp dan alamat terverifikasi tayang di sini, gunakan kanal resmi TDR yang sudah ada.",
          hq: "TDR Technology Center — Jakarta, Indonesia",
          channels: "Kanal resmi",
          note: "Nomor WhatsApp, telepon, dan alamat lengkap menunggu verifikasi — kami tidak menampilkan kontak yang belum pasti.",
        }
      : {
          h1: "Talk to the people who make the parts.",
          sub: "Official channels are being migrated to this new site. Until the verified WhatsApp number and address land here, use TDR's existing official channels.",
          hq: "TDR Technology Center — Jakarta, Indonesia",
          channels: "Official channels",
          note: "The WhatsApp number, phone and full address are pending verification — we don't display contacts we're not sure of.",
        };

  return (
    <div className="atmo pt-36">
      <header className="container-x pb-14">
        <p className="micro micro--hud mb-5" data-reveal="">
          SYS · CONTACT
        </p>
        <SplitHeadline text={t.h1} as="h1" className="display-1 max-w-5xl" immediate delay={0.1} />
        <p className="claim mt-6 max-w-2xl text-chrome" data-reveal="">
          {t.sub}
        </p>
      </header>

      <div className="container-x grid gap-6 pb-28 md:grid-cols-2">
        <Reveal>
          <div className="panel ticks h-full p-8">
            <h2 className="micro micro--hud mb-4">HQ</h2>
            <p className="text-white">{t.hq}</p>
            <p className="mt-3">
              <span className="chip-pending">{dict.common.pending}</span>
            </p>
            <p className="mt-5 text-xs leading-relaxed text-chrome">{t.note}</p>
          </div>
        </Reveal>
        <Reveal delay={0.07}>
          <div className="panel panel--solid ticks h-full p-8">
            <h2 className="micro micro--hud mb-4">{t.channels}</h2>
            <div className="flex flex-wrap gap-2">
              {["WhatsApp", "Instagram", "YouTube"].map((c) => (
                <span key={c} className="btn btn-ghost cursor-not-allowed opacity-45" aria-disabled="true">
                  {c} · {dict.pdp.linkPending}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-chrome">
              <Link
                href={localeHref(locale, "/where-to-buy")}
                className="text-hud underline-offset-4 hover:underline"
              >
                {dict.nav.whereToBuy} →
              </Link>
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
