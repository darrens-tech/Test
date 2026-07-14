"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/content/schema";
import type { Dictionary, Locale } from "@/lib/i18n";
import { ProductCard } from "./sections";

/**
 * Category grid with search + sort — the anti-pattern-killer for the legacy
 * flat dump (brief §1: "No filter, no sort, no search").
 */
export function ProductGrid({
  products,
  locale,
  dict,
}: {
  products: Product[];
  locale: Locale;
  dict: Dictionary;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"featured" | "az">("featured");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.claim.toLowerCase().includes(q) ||
            p.partNumber.toLowerCase().includes(q),
        )
      : products;
    return [...filtered].sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
    );
  }, [products, query, sort]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="relative grow sm:max-w-sm">
          <span className="sr-only">{dict.common.search}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.common.search}
            className="w-full rounded-full border border-(--glass-brd) bg-steel/60 px-5 py-3 text-sm text-white placeholder:text-chrome focus:border-(--hud-25) focus:outline-none"
          />
        </label>
        <div role="group" aria-label={dict.common.sort} className="flex gap-1.5">
          {(
            [
              ["featured", dict.common.sortNew],
              ["az", dict.common.sortAz],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`micro rounded-full border px-4 py-2.5 transition-colors ${
                sort === key
                  ? "border-(--hud-25) text-white"
                  : "border-(--glass-brd) hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-chrome">{dict.common.noResults}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} locale={locale} dict={dict} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
