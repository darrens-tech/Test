import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/content";
import { getPillar, getSubcategory } from "@/lib/content/taxonomy";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { ExplodedViewer } from "@/components/product/ExplodedViewer";
import {
  BuyLinks,
  FitmentList,
  PendingChip,
  ProductCard,
  SpecTable,
} from "@/components/product/sections";
import { Reveal } from "@/components/motion/Reveal";

export function generateStaticParams() {
  return getProducts().map((p) => ({
    pillar: p.pillar,
    subcategory: p.subcategory,
    product: p.slug,
  }));
}

type Params = Promise<{
  locale: string;
  pillar: string;
  subcategory: string;
  product: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, pillar, subcategory, product: slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const p = getProduct(slug);
  if (!p) return {};
  return pageMetadata(
    locale,
    `/products/${pillar}/${subcategory}/${slug}`,
    p.name,
    locale === "id" ? p.claimId : p.claim,
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale: raw, pillar, subcategory, product: slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const product = getProduct(slug);
  const pillarDef = getPillar(pillar);
  const subDef = getSubcategory(pillar, subcategory);
  if (!product || !pillarDef || !subDef || product.pillar !== pillar || product.subcategory !== subcategory) {
    notFound();
  }

  const related = product.related
    .map((s) => getProduct(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const claim = locale === "id" ? product.claimId : product.claim;
  const poster = product.turntable?.poster ?? product.gallery[0] ?? null;

  // schema.org Product. Offers are added per-SKU once a verified marketplace
  // URL + price exist — a priceless Offer fails validation (see QA-REPORT).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.claim,
    brand: { "@type": "Brand", name: "TDR" },
    category: `${pillarDef.name} > ${subDef.name}`,
    ...(product.partNumber !== "TBD" ? { sku: product.partNumber, mpn: product.partNumber } : {}),
    ...(poster ? { image: `${SITE_URL}${poster}` } : {}),
    url: `${SITE_URL}${localeHref(locale, `/products/${pillar}/${subcategory}/${slug}`)}`,
    additionalProperty: product.specs
      .filter((s) => s.verification === "verified" && s.value !== "TBD")
      .map((s) => ({
        "@type": "PropertyValue",
        name: s.label,
        value: `${s.value}${s.unit ? ` ${s.unit}` : ""}`,
      })),
  };

  return (
    <article className="atmo pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* header */}
      <header className="container-x pb-10">
        <nav aria-label="Breadcrumb" className="micro mb-8 flex flex-wrap gap-2">
          <Link href={localeHref(locale, "/products")} className="hover:text-white">
            {dict.common.products}
          </Link>
          <span aria-hidden>/</span>
          <Link href={localeHref(locale, `/products/${pillar}`)} className="hover:text-white">
            {pillarDef.name}
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={localeHref(locale, `/products/${pillar}/${subcategory}`)}
            className="hover:text-white"
          >
            {locale === "id" ? subDef.nameId : subDef.name}
          </Link>
        </nav>

        <Reveal>
          <p className="micro micro--hud flex flex-wrap items-center gap-3">
            {dict.common.partNo}
            {product.partNumber === "TBD" ? <PendingChip dict={dict} /> : (
              <span className="readout text-white">{product.partNumber}</span>
            )}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="display-2 mt-4 max-w-4xl">{product.name}</h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="claim mt-5 max-w-2xl text-chrome">{claim}</p>
        </Reveal>
      </header>

      {/* media: exploded viewport (flagship) / turntable poster / honest pending panel */}
      {product.model3d ? (
        <>
          <ExplodedViewer
            procedural={product.model3d.procedural}
            annotations={product.model3d.annotations.map((a) => ({
              part: a.part,
              label: locale === "id" && a.labelId ? a.labelId : a.label,
              value: a.value,
              verification: a.verification,
            }))}
            poster={poster ?? "/posters/hero.jpg"}
            hint={dict.common.explodedHint}
            sceneLabel={dict.a11y.sceneExploded}
            pendingLabel={dict.common.pending}
          />
          {/* component callouts — plain DOM copy of the annotations, every tier */}
          <section className="container-x py-10">
            <h2 className="micro micro--hud mb-4">{dict.pdp.annotations}</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.model3d.annotations.map((a) => (
                <div key={a.part} className="flex items-baseline justify-between gap-3 border-b border-(--glass-brd) py-2">
                  <dt className="text-sm text-chrome">
                    {locale === "id" && a.labelId ? a.labelId : a.label}
                  </dt>
                  <dd className="text-right">
                    {a.verification === "verified" ? (
                      <span className="readout text-sm">{a.value}</span>
                    ) : (
                      <PendingChip dict={dict} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      ) : (
        <section className="container-x pb-4">
          <div className="panel panel--solid ticks relative flex aspect-[16/8] items-center justify-center overflow-hidden">
            {poster ? (
              <Image src={poster} alt={product.name} fill sizes="92vw" className="object-cover" />
            ) : (
              <div className="text-center">
                <p className="micro micro--hud">SYS · MEDIA</p>
                <p className="mt-3 text-sm text-chrome">
                  {dict.common.tbd} — {dict.common.pending.toLowerCase()}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* data grid */}
      <div className="container-x grid gap-6 py-12 lg:grid-cols-[1.15fr_1fr]">
        <Reveal>
          <SpecTable product={product} locale={locale} dict={dict} />
        </Reveal>
        <div className="flex flex-col gap-6">
          <Reveal delay={0.05}>
            <FitmentList product={product} locale={locale} dict={dict} />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="panel panel--solid ticks p-7">
              <h2 className="micro micro--hud mb-4">{dict.common.inTheBox}</h2>
              <ul className="grid list-disc gap-1.5 pl-4 text-sm text-chrome sm:grid-cols-2">
                {product.inTheBox.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="micro mb-1.5">{dict.common.torque}</h3>
                  {product.torqueSpec ? (
                    <span className="readout text-sm">
                      {product.torqueSpec.value} {product.torqueSpec.unit}
                    </span>
                  ) : (
                    <PendingChip dict={dict} />
                  )}
                </div>
                <div>
                  <h3 className="micro mb-1.5">{dict.common.installDifficulty}</h3>
                  <p className="text-sm text-chrome">
                    {product.installDifficulty
                      ? dict.pdp.difficulty[product.installDifficulty]
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="panel panel--solid ticks p-7">
              <h2 className="micro micro--hud mb-4">{dict.common.downloads}</h2>
              {product.downloads.length === 0 ? (
                <p className="text-sm text-chrome">—</p>
              ) : (
                <ul className="space-y-2.5">
                  {product.downloads.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{d.label}</span>
                      {d.href ? (
                        <a href={d.href} className="micro micro--hud hover:underline">
                          PDF ↓
                        </a>
                      ) : (
                        <PendingChip dict={dict} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <h2 className="micro micro--hud mb-2 mt-7">{dict.common.authenticity}</h2>
              <p className="text-sm text-chrome">{dict.pdp.authenticity}</p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container-x pb-12">
        <Reveal>
          <BuyLinks product={product} locale={locale} dict={dict} />
        </Reveal>
      </div>

      {related.length > 0 && (
        <section className="border-t border-(--glass-brd) bg-bay py-16">
          <div className="container-x">
            <h2 className="micro micro--hud mb-6">{dict.common.related}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.slug} delay={i * 0.05}>
                  <ProductCard product={r} locale={locale} dict={dict} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
