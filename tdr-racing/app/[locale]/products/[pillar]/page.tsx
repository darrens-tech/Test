import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PILLARS, getPillar } from "@/lib/content/taxonomy";
import { getProductsBySubcategory } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { ProductCard } from "@/components/product/sections";

export function generateStaticParams() {
  return PILLARS.map((p) => ({ pillar: p.slug }));
}

type Params = Promise<{ locale: string; pillar: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, pillar } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const def = getPillar(pillar);
  if (!def) return {};
  const dict = getDictionary(locale);
  const copy = dict.pillars[pillar as keyof typeof dict.pillars] as { line: string };
  return pageMetadata(locale, `/products/${pillar}`, `${def.name} — ${dict.nav.products}`, copy.line);
}

export default async function PillarPage({ params }: { params: Params }) {
  const { locale: raw, pillar } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const def = getPillar(pillar);
  if (!def) notFound();

  const copy = dict.pillars[def.slug as keyof typeof dict.pillars] as {
    name: string;
    line: string;
  };

  return (
    <div className="atmo pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-12">
        <nav aria-label="Breadcrumb" className="micro mb-8">
          <Link href={localeHref(locale, "/products")} className="hover:text-white">
            {dict.common.products}
          </Link>{" "}
          <span aria-hidden>/</span>
        </nav>
        <p className="micro micro--hud mb-5" data-reveal="">
          {def.code}
        </p>
        <SplitHeadline text={copy.name} as="h1" className="display-1" immediate delay={0.1} />
        <p className="claim mt-6 max-w-xl text-chrome" data-reveal="">
          {copy.line}
        </p>
      </header>

      <div className="mx-auto flex w-[min(92vw,1560px)] flex-col gap-14 pb-24">
        {def.subcategories.map((sub) => {
          const products = getProductsBySubcategory(def.slug, sub.slug);
          return (
            <section key={sub.slug} aria-labelledby={`sub-${sub.slug}`}>
              <Reveal>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <h2 id={`sub-${sub.slug}`} className="h3">
                    {locale === "id" ? sub.nameId : sub.name}
                  </h2>
                  <Link
                    href={localeHref(locale, `/products/${def.slug}/${sub.slug}`)}
                    className="micro micro--hud hover:underline"
                  >
                    {dict.common.viewAll} →
                  </Link>
                </div>
              </Reveal>
              {products.length === 0 ? (
                <p className="text-sm text-chrome">
                  {dict.common.tbd} — {dict.common.pending.toLowerCase()}
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p, i) => (
                    <Reveal key={p.slug} delay={i * 0.05}>
                      <ProductCard product={p} locale={locale} dict={dict} />
                    </Reveal>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
