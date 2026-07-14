import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBike, getBikes, getProductsForBike } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { ProductCard } from "@/components/product/sections";
import { Silhouette, zonesForPillarSub } from "@/components/fit/Silhouette";

/**
 * ★ /fit — Brand → Model → Year, deep-linkable (/fit/honda/vario-160/2024).
 * Fully server-rendered: every step is a link, so the flow works with zero
 * client JS on every tier (the 60-second acceptance path, brief §13).
 * Results carry their verification state — pending fitment is labelled, never
 * silently asserted (wrong fitment is a safety liability, brief §7).
 */

const CURRENT_YEAR = 2026;

type Params = Promise<{ locale: string; selection?: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, selection = [] } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const [brand, model, year] = selection;
  const bike = brand && model ? getBike(brand, model) : undefined;
  const title = bike
    ? `${bike.make} ${bike.model}${year ? ` ${year}` : ""} — ${dict.nav.fit}`
    : dict.fit.title;
  const path = `/fit${selection.length ? `/${selection.join("/")}` : ""}`;
  return pageMetadata(locale, path, title, dict.fit.sub);
}

export default async function FitPage({ params }: { params: Params }) {
  const { locale: raw, selection = [] } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  if (selection.length > 3) notFound();
  const [brandSlug, modelSlug, yearStr] = selection;

  const bikes = getBikes();
  const brands = [...new Map(bikes.map((b) => [b.makeSlug, b.make])).entries()];
  const models = brandSlug ? bikes.filter((b) => b.makeSlug === brandSlug) : [];
  if (brandSlug && models.length === 0) notFound();

  const bike = brandSlug && modelSlug ? getBike(brandSlug, modelSlug) : undefined;
  if (modelSlug && !bike) notFound();

  const year = yearStr ? Number(yearStr) : undefined;
  if (yearStr && (!year || Number.isNaN(year))) notFound();
  if (bike && year && (year < bike.yearFrom || year > (bike.yearTo ?? CURRENT_YEAR))) notFound();

  const results = bike && year ? getProductsForBike(bike, year) : [];
  const anyPending =
    bike !== undefined &&
    results.some((p) =>
      p.fitment.some(
        (f) =>
          f.verification === "pending" &&
          (f.make === "Universal" || f.model.toLowerCase() === bike.model.toLowerCase()),
      ),
    );

  const bikeLabel = bike ? `${bike.make} ${bike.model}${year ? ` (${year})` : ""}` : "";
  const activeZones = [
    ...new Set(results.flatMap((p) => zonesForPillarSub(p.pillar, p.subcategory))),
  ];

  const countCopy = (anyPending ? dict.fit.resultCountPending : dict.fit.resultCount)
    .replace("{n}", String(results.length))
    .replace("{bike}", bikeLabel);

  const step = (label: string, active: boolean) => (
    <p className={`micro ${active ? "micro--hud" : ""}`}>{label}</p>
  );

  return (
    <div className="atmo pt-36">
      <header className="mx-auto w-[min(92vw,1560px)] pb-10">
        <p className="micro micro--hud mb-5" data-reveal="">
          {dict.fit.eyebrow}
        </p>
        <SplitHeadline text={dict.fit.title} as="h1" className="display-1 max-w-4xl" immediate delay={0.1} />
        <p className="claim mt-6 max-w-xl text-chrome" data-reveal="">
          {dict.fit.sub}
        </p>
      </header>

      <div className="mx-auto grid w-[min(92vw,1560px)] gap-8 pb-24 lg:grid-cols-[1fr_1.2fr]">
        {/* selector column */}
        <div className="flex flex-col gap-6">
          <Reveal>
            <div className="panel ticks p-7">
              {step(`01 · ${dict.fit.brand}`, !brandSlug)}
              <div className="mt-4 flex flex-wrap gap-2">
                {brands.map(([slug, name]) => (
                  <Link
                    key={slug}
                    href={localeHref(locale, `/fit/${slug}`)}
                    aria-current={slug === brandSlug ? "true" : undefined}
                    className={`micro lift rounded-full border px-4 py-2.5 ${
                      slug === brandSlug
                        ? "border-(--color-hud) text-white"
                        : "border-(--glass-brd) text-white"
                    }`}
                  >
                    {name}
                  </Link>
                ))}
              </div>

              {brandSlug && (
                <>
                  <div className="mt-7">{step(`02 · ${dict.fit.model}`, !modelSlug)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {models.map((m) => (
                      <Link
                        key={m.slug}
                        href={localeHref(locale, `/fit/${brandSlug}/${m.slug}`)}
                        aria-current={m.slug === modelSlug ? "true" : undefined}
                        className={`micro lift rounded-full border px-4 py-2.5 ${
                          m.slug === modelSlug
                            ? "border-(--color-hud) text-white"
                            : "border-(--glass-brd) text-white"
                        }`}
                      >
                        {m.model}
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {bike && (
                <>
                  <div className="mt-7">{step(`03 · ${dict.fit.year}`, !year)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from(
                      { length: (bike.yearTo ?? CURRENT_YEAR) - bike.yearFrom + 1 },
                      (_, i) => (bike.yearTo ?? CURRENT_YEAR) - i,
                    ).map((y) => (
                      <Link
                        key={y}
                        href={localeHref(locale, `/fit/${brandSlug}/${modelSlug}/${y}`)}
                        aria-current={y === year ? "true" : undefined}
                        className={`readout lift rounded-full border px-3.5 py-2 text-xs ${
                          y === year
                            ? "border-(--color-hud) text-white"
                            : "border-(--glass-brd) text-chrome"
                        }`}
                      >
                        {y}
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {selection.length > 0 && (
                <p className="mt-7">
                  <Link href={localeHref(locale, "/fit")} className="micro hover:text-white">
                    ↺ {dict.fit.reset}
                  </Link>
                </p>
              )}
            </div>
          </Reveal>

          {bike && (
            <Reveal delay={0.08}>
              <div className="panel panel--solid ticks p-7">
                <p className="micro micro--hud mb-2">
                  {bike.make.toUpperCase()} {bike.model.toUpperCase()}
                </p>
                {bike.engine && <p className="readout text-sm text-chrome">{bike.engine}</p>}
                <p className="readout mt-1 text-sm text-chrome">
                  {bike.yearFrom}–{bike.yearTo ?? dict.pdp.years}
                </p>
              </div>
            </Reveal>
          )}
        </div>

        {/* silhouette + results */}
        <div>
          <Reveal delay={0.1}>
            <div className="panel panel--solid ticks p-8">
              <p className="micro micro--hud mb-4">{dict.fit.zones}</p>
              <Silhouette activeZones={activeZones} />
            </div>
          </Reveal>

          {bike && year && (
            <div className="mt-8">
              <Reveal>
                <p className="claim" aria-live="polite">
                  {results.length > 0 ? countCopy : dict.fit.empty}
                </p>
              </Reveal>
              {results.length > 0 && (
                <ul className="mt-6 grid gap-5 sm:grid-cols-2">
                  {results.map((p, i) => (
                    <Reveal key={p.slug} delay={i * 0.05}>
                      <li>
                        <ProductCard product={p} locale={locale} dict={dict} />
                      </li>
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
