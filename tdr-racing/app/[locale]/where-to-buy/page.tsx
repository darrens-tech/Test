import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDealers } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { Reveal } from "@/components/motion/Reveal";
import { EmitScrollProgress } from "@/components/motion/EmitScrollProgress";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/where-to-buy", dict.nav.whereToBuy, dict.buyStrip.sub);
}

export default async function WhereToBuyPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const dealers = getDealers();

  const t =
    locale === "id"
      ? {
          locator: "Jaringan dealer",
          locatorNote:
            "Daftar dealer dan distributor resmi sedang diverifikasi bersama TDR — yang tampil di bawah hanyalah titik yang sudah pasti. Garis di peta adalah jangkauan pengiriman, bukan dealer.",
          marketplaces: "Toko resmi marketplace",
          marketplaceNote: "Tautan toko resmi menunggu verifikasi — jangan beli dari toko yang mengaku resmi sebelum tautan ini tayang.",
          coverage: "Jangkauan",
          becomeDealer: "Ingin menjadi dealer? Hubungi kami.",
        }
      : {
          locator: "Dealer network",
          locatorNote:
            "The authorized dealer and distributor list is being verified with TDR — only confirmed points appear below. The map lines are shipping coverage, not dealers.",
          marketplaces: "Official marketplace stores",
          marketplaceNote: "Official store links are pending verification — don't trust stores claiming to be official until these links go live.",
          coverage: "Coverage",
          becomeDealer: "Want to become a dealer? Contact us.",
        };

  return (
    <EmitScrollProgress scene="archipelago">
      <div className="pt-36">
        {/* Tier 2/3 backdrop; Tier 1 renders the live map behind */}
        <div className="pointer-events-none fixed inset-0 z-0 [html[data-tier='1']_&]:hidden" aria-hidden="true">
          <Image src="/posters/archipelago.jpg" alt="" fill sizes="100vw" className="object-cover opacity-60" />
        </div>
        <p className="sr-only">{dict.a11y.sceneMap}</p>

        <header className="relative container-x pb-14">
          <p className="micro micro--hud mb-5" data-reveal="">
            {dict.buyStrip.eyebrow}
          </p>
          <SplitHeadline text={dict.buyStrip.title} as="h1" className="display-1 max-w-4xl" immediate delay={0.1} />
          <p className="claim mt-6 max-w-xl text-chrome" data-reveal="">
            {dict.buyStrip.sub}
          </p>
        </header>

        <div className="relative container-x grid gap-6 pb-28 lg:grid-cols-[1fr_26rem] lg:justify-end">
          {/* left column intentionally sparse — the map is the content on lg */}
          <div className="hidden lg:block" aria-hidden="true" />

          <div className="flex flex-col gap-6">
            <Reveal>
              <div className="panel ticks p-7">
                <h2 className="micro micro--hud mb-4">{t.locator}</h2>
                <ul className="space-y-4">
                  {dealers.map((d) => (
                    <li key={d.name} className="border-b border-(--glass-brd) pb-4 last:border-0 last:pb-0">
                      <p className="text-sm text-white">{d.name}</p>
                      <p className="readout mt-1 text-xs text-chrome">
                        {d.city} · {d.country} · {d.kind.toUpperCase()}
                      </p>
                      {(!d.address || d.verification === "pending") && (
                        <p className="mt-2">
                          <span className="chip-pending">{dict.common.pending}</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-chrome">{t.locatorNote}</p>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="panel panel--solid ticks p-7">
                <h2 className="micro micro--hud mb-4">{t.marketplaces}</h2>
                <div className="flex flex-wrap gap-2">
                  {["Tokopedia", "Shopee", "TDR HPZ"].map((v) => (
                    <span key={v} className="btn btn-ghost cursor-not-allowed opacity-45" aria-disabled="true">
                      {v} · {dict.pdp.linkPending}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-chrome">{t.marketplaceNote}</p>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="panel panel--solid ticks p-7">
                <h2 className="micro micro--hud mb-3">{t.coverage}</h2>
                <p className="readout text-sm text-chrome">
                  Jakarta HQ → Surabaya · Medan · Makassar · Bangkok · Manila
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={localeHref(locale, "/contact")} className="btn btn-primary">
                    {dict.common.whatsapp}
                  </Link>
                  <Link href={localeHref(locale, "/contact")} className="btn btn-ghost">
                    {t.becomeDealer}
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </EmitScrollProgress>
  );
}
