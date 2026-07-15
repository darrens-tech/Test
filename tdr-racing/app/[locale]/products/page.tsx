import type { Metadata } from "next";
import Link from "next/link";
import { PILLARS } from "@/lib/content/taxonomy";
import { getFeaturedProducts } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { ProductCard } from "@/components/product/sections";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/products", dict.nav.products, dict.pillars.title);
}

export default async function ProductsPage({ params }: { params: Params }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const featured = getFeaturedProducts();

  return (
    <div className="atmo pt-36">
      <header className="container-x pb-14">
        <p className="micro micro--hud mb-5" data-reveal="">
          {dict.pillars.eyebrow}
        </p>
        <SplitHeadline text={dict.pillars.title} as="h1" className="display-1 max-w-4xl" immediate delay={0.1} />
      </header>

      <div className="container-x grid gap-6 pb-20 md:grid-cols-2">
        {PILLARS.map((p, i) => {
          const copy = dict.pillars[p.slug as keyof typeof dict.pillars] as {
            name: string;
            line: string;
          };
          return (
            <Reveal key={p.slug} delay={i * 0.06}>
              <div className="panel panel--solid ticks h-full p-8 lg:p-10">
                <p className="micro micro--hud mb-4">{p.code}</p>
                <Link href={localeHref(locale, `/products/${p.slug}`)}>
                  <h2 className="display-2 transition-colors hover:text-hud">{copy.name}</h2>
                </Link>
                <p className="mt-4 max-w-md text-chrome">{copy.line}</p>
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
              </div>
            </Reveal>
          );
        })}
      </div>

      <section className="border-t border-(--glass-brd) bg-bay py-16">
        <div className="container-x">
          <h2 className="micro micro--hud mb-6">SYS · FEATURED</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05}>
                <ProductCard product={p} locale={locale} dict={dict} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
