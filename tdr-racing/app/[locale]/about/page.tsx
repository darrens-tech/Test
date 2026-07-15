import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/about", dict.nav.about, dict.footer.tagline);
}

export default async function AboutPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const yearsSinceFounding = new Date().getFullYear() - 2003;

  const t =
    locale === "id"
      ? {
          h1: "Dibangun di Jakarta. Diuji di lintasan.",
          p1: "TDR berdiri tahun 2003 di Jakarta sebagai bagian dari TDR Industries Group — produsen part motor performa tinggi untuk pasar Indonesia dan Asia Tenggara.",
          p2: "Empat pilar katalog — Power, Handling, Style, Maintenance — dikembangkan di TDR Technology Center dan dibuktikan lewat program balap One Team. Kami tidak menjual kecepatan; kami menjual toleransi.",
          p3: "Profil perusahaan lengkap, sejarah, dan data fasilitas sedang disiapkan bersama TDR untuk dipublikasikan di halaman ini.",
          years: "tahun beroperasi",
          hq: "kantor pusat",
          pillars: "pilar katalog",
        }
      : {
          h1: "Built in Jakarta. Proven on track.",
          p1: "TDR was founded in 2003 in Jakarta, part of TDR Industries Group — a manufacturer of high-performance motorcycle parts for Indonesia and Southeast Asia.",
          p2: "The catalogue's four pillars — Power, Handling, Style, Maintenance — are developed at the TDR Technology Center and proven through the One Team racing program. We don't sell speed; we sell tolerances.",
          p3: "The full company profile, history and facility data are being prepared with TDR for publication on this page.",
          years: "years running",
          hq: "headquarters",
          pillars: "catalogue pillars",
        };

  return (
    <div className="atmo pt-36">
      <header className="container-x pb-14">
        <p className="micro micro--hud mb-5" data-reveal="">
          SYS · ABOUT / TDR INDUSTRIES GROUP — EST 2003
        </p>
        <SplitHeadline text={t.h1} as="h1" className="display-1 max-w-5xl" immediate delay={0.1} />
      </header>

      <div className="container-x grid gap-10 pb-16 lg:grid-cols-[1.3fr_1fr]">
        <div className="max-w-2xl">
          {[t.p1, t.p2, t.p3].map((p, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="mb-6 leading-relaxed text-chrome">{p}</p>
            </Reveal>
          ))}
          <Reveal delay={0.2}>
            <div className="flex flex-wrap gap-3">
              <Link href={localeHref(locale, "/technology")} className="btn btn-primary">
                {dict.nav.technology} →
              </Link>
              <Link href={localeHref(locale, "/racing")} className="btn btn-ghost">
                {dict.nav.racing} →
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="panel ticks h-fit p-8">
            <dl className="space-y-6">
              <div>
                <dd className="readout text-4xl text-white">
                  <CountUp value={yearsSinceFounding} />
                </dd>
                <dt className="micro mt-1">{t.years}</dt>
              </div>
              <div>
                <dd className="readout text-4xl text-white">JAKARTA</dd>
                <dt className="micro mt-1">{t.hq}</dt>
              </div>
              <div>
                <dd className="readout text-4xl text-white">
                  <CountUp value={4} />
                </dd>
                <dt className="micro mt-1">{t.pillars}</dt>
              </div>
            </dl>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
