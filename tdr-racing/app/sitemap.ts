import type { MetadataRoute } from "next";
import { getNews, getProducts } from "@/lib/content";
import { PILLARS } from "@/lib/content/taxonomy";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/fit",
    "/products",
    "/technology",
    "/racing",
    "/news",
    "/downloads",
    "/support",
    "/where-to-buy",
    "/about",
    "/contact",
  ];

  const pillarPaths = PILLARS.flatMap((p) => [
    `/products/${p.slug}`,
    ...p.subcategories.map((s) => `/products/${p.slug}/${s.slug}`),
  ]);

  const productPaths = getProducts().map(
    (p) => `/products/${p.pillar}/${p.subcategory}/${p.slug}`,
  );

  const newsPaths = getNews().map((n) => `/news/${n.slug}`);

  const all = [...staticPaths, ...pillarPaths, ...productPaths, ...newsPaths];

  return all.flatMap((path) => [
    {
      url: `${SITE_URL}${path || "/"}`,
      alternates: {
        languages: {
          en: `${SITE_URL}${path || "/"}`,
          id: `${SITE_URL}/id${path}`,
        },
      },
    },
    { url: `${SITE_URL}/id${path}` },
  ]);
}
