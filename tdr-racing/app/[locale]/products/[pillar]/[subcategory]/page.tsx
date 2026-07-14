import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PILLARS, getPillar, getSubcategory } from "@/lib/content/taxonomy";
import { getProductsBySubcategory } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { ProductGrid } from "@/components/product/ProductGrid";

export function generateStaticParams() {
  return PILLARS.flatMap((p) =>
    p.subcategories.map((s) => ({ pillar: p.slug, subcategory: s.slug })),
  );
}

type Params = Promise<{ locale: string; pillar: string; subcategory: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, pillar, subcategory } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const sub = getSubcategory(pillar, subcategory);
  const def = getPillar(pillar);
  if (!sub || !def) return {};
  const name = locale === "id" ? sub.nameId : sub.name;
  return pageMetadata(
    locale,
    `/products/${pillar}/${subcategory}`,
    `${name} — ${def.name}`,
    `TDR ${name} catalogue.`,
  );
}

export default async function SubcategoryPage({ params }: { params: Params }) {
  const { locale: raw, pillar, subcategory } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const def = getPillar(pillar);
  const sub = getSubcategory(pillar, subcategory);
  if (!def || !sub) notFound();

  const products = getProductsBySubcategory(pillar, subcategory);
  const name = locale === "id" ? sub.nameId : sub.name;

  return (
    <div className="atmo pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-12">
        <nav aria-label="Breadcrumb" className="micro mb-8 flex flex-wrap gap-2">
          <Link href={localeHref(locale, "/products")} className="hover:text-white">
            {dict.common.products}
          </Link>
          <span aria-hidden>/</span>
          <Link href={localeHref(locale, `/products/${pillar}`)} className="hover:text-white">
            {def.name}
          </Link>
        </nav>
        <p className="micro micro--hud mb-5" data-reveal="">
          {def.code} / {sub.name.toUpperCase()}
        </p>
        <SplitHeadline text={name} as="h1" className="display-1" immediate delay={0.1} />
      </header>

      <div className="mx-auto w-[min(92vw,1560px)] pb-24">
        <ProductGrid products={products} locale={locale} dict={dict} />
      </div>
    </div>
  );
}
