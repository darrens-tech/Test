import type { Metadata } from "next";
import Link from "next/link";
import { getNews } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { Reveal } from "@/components/motion/Reveal";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/news", dict.nav.news, dict.news.title);
}

export default async function NewsPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const news = getNews();

  return (
    <div className="atmo pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-14">
        <p className="micro micro--hud mb-5" data-reveal="">
          {dict.news.eyebrow}
        </p>
        <SplitHeadline text={dict.news.title} as="h1" className="display-1 max-w-4xl" immediate delay={0.1} />
      </header>
      <div className="mx-auto grid w-[min(92vw,1560px)] gap-5 pb-28 md:grid-cols-2 lg:grid-cols-3">
        {news.map((n, i) => (
          <Reveal key={n.slug} delay={i * 0.05}>
            <Link
              href={localeHref(locale, `/news/${n.slug}`)}
              className="panel panel--solid ticks lift block h-full p-7"
            >
              <p className="micro micro--hud">{n.tag}</p>
              <p className="readout mt-3 text-xs text-chrome">{n.date}</p>
              <h2 className="h3 mt-3">{locale === "id" ? n.titleId : n.title}</h2>
              <p className="mt-3 text-sm text-chrome">
                {locale === "id" ? n.excerptId : n.excerpt}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
