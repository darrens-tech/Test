import Link from "next/link";
import type { Product, Spec } from "@/lib/content/schema";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";

/** PDP building blocks — all plain DOM, every tier, crawlable (brief §9). */

export function PendingChip({ dict }: { dict: Dictionary }) {
  return <span className="chip-pending">{dict.common.pending}</span>;
}

export function SpecRow({ spec, locale, dict }: { spec: Spec; locale: Locale; dict: Dictionary }) {
  const label = locale === "id" && spec.labelId ? spec.labelId : spec.label;
  const verified = spec.verification === "verified" && spec.value !== "TBD";
  return (
    <tr className="border-b border-(--glass-brd) last:border-0">
      <th scope="row" className="py-3 pr-4 text-left text-sm font-normal text-chrome">
        {label}
      </th>
      <td className="py-3 text-right">
        {verified ? (
          <span className="readout text-sm">
            {spec.value}
            {spec.unit ? <span className="text-chrome"> {spec.unit}</span> : null}
          </span>
        ) : (
          <PendingChip dict={dict} />
        )}
      </td>
    </tr>
  );
}

export function SpecTable({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="panel panel--solid ticks p-7">
      <h2 className="micro micro--hud mb-4">{dict.common.specs}</h2>
      <table className="w-full">
        <tbody>
          {product.specs.map((s) => (
            <SpecRow key={s.label} spec={s} locale={locale} dict={dict} />
          ))}
        </tbody>
      </table>
      {product.materials.length > 0 && (
        <>
          <h3 className="micro mt-6 mb-2">{dict.pdp.material}</h3>
          <ul className="space-y-1.5">
            {product.materials.map((m) => (
              <li key={m.value} className="flex flex-wrap items-center gap-2 text-sm text-chrome">
                {m.value}
                {m.verification === "pending" && <PendingChip dict={dict} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function FitmentList({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="panel panel--solid ticks p-7">
      <h2 className="micro micro--hud mb-4">{dict.common.fitment}</h2>
      {product.fitment.length === 0 ? (
        <p className="text-sm text-chrome">
          {dict.fit.empty}{" "}
          <Link href={localeHref(locale, "/contact")} className="text-hud underline-offset-4 hover:underline">
            {dict.nav.contact} →
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {product.fitment.map((f) => (
            <li key={`${f.make}-${f.model}`} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                {f.make} {f.model}
                <span className="readout ml-2 text-xs text-chrome">
                  {f.yearFrom}–{f.yearTo ?? dict.pdp.years}
                </span>
              </span>
              {f.verification === "pending" ? (
                <PendingChip dict={dict} />
              ) : (
                <span className="micro micro--hud">{dict.common.verified}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BuyLinks({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="panel panel--solid ticks p-7" id="buy">
      <h2 className="micro micro--hud mb-4">{dict.common.buy}</h2>
      <div className="flex flex-wrap gap-2.5">
        {product.buyLinks.map((b) => {
          const label = dict.pdp.vendors[b.vendor as keyof typeof dict.pdp.vendors] ?? b.vendor;
          if (b.href) {
            const external = b.href.startsWith("http");
            return (
              <Link
                key={b.vendor}
                href={external ? b.href : localeHref(locale, b.href)}
                className={b.vendor === "dealer" ? "btn btn-primary" : "btn btn-ghost"}
                {...(external ? { rel: "noopener", target: "_blank" } : {})}
              >
                {label}
              </Link>
            );
          }
          // Link pending (GAP) — an honest disabled state, never javascript:void(0)
          return (
            <span
              key={b.vendor}
              className="btn btn-ghost cursor-not-allowed opacity-45"
              aria-disabled="true"
              title={dict.pdp.linkPending}
            >
              {label} · {dict.pdp.linkPending}
            </span>
          );
        })}
        <Link href={localeHref(locale, "/contact")} className="btn btn-ghost">
          {dict.common.whatsapp}
        </Link>
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  const href = localeHref(
    locale,
    `/products/${product.pillar}/${product.subcategory}/${product.slug}`,
  );
  return (
    <Link href={href} className="panel panel--solid ticks lift group block h-full p-6">
      <p className="micro micro--hud">
        {dict.common.partNo}{" "}
        {product.partNumber === "TBD" ? (
          <span className="text-chrome">{dict.common.tbd}</span>
        ) : (
          product.partNumber
        )}
      </p>
      <h3 className="h3 mt-3 group-hover:text-white">{product.name}</h3>
      <p className="mt-3 line-clamp-2 text-sm text-chrome">
        {locale === "id" ? product.claimId : product.claim}
      </p>
      {product.model3d && (
        <p className="micro micro--hud mt-4">3D · EXPLODE VIEW</p>
      )}
    </Link>
  );
}
