import type { NextConfig } from "next";

/**
 * Legacy CMS category slugs → new pillar/subcategory tree.
 * The four-pillar taxonomy is carried over verbatim from the legacy site, so the
 * subcategory names below are the known legacy vocabulary. Anything unmapped
 * falls through the wildcard to /products. Full table: REDIRECTS.md
 */
const SUBCATEGORY_PILLAR: Record<string, string> = {
  engine: "power",
  electrical: "power",
  "clutch-transmission-cvt": "power",
  "induction-exhaust": "power",
  "suspension-chassis": "handling",
  wheel: "handling",
  brake: "handling",
  body: "style",
  "riding-gears": "style",
  lubricants: "maintenance",
  "tools-equipment": "maintenance",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      // Legacy pillar landing pages
      ...["power", "handling", "style", "maintenance"].map((p) => ({
        source: `/products-2/${p}`,
        destination: `/products/${p}`,
        permanent: true,
      })),
      // Legacy subcategory pages → new nested tree
      ...Object.entries(SUBCATEGORY_PILLAR).map(([sub, pillar]) => ({
        source: `/products-2/${sub}`,
        destination: `/products/${pillar}/${sub}`,
        permanent: true,
      })),
      ...Object.entries(SUBCATEGORY_PILLAR).map(([sub, pillar]) => ({
        source: `/products-2/${sub}/:product`,
        destination: `/products/${pillar}/${sub}/:product`,
        permanent: true,
      })),
      // Migration-leftover root + anything unmapped → products index.
      { source: "/products-2", destination: "/products", permanent: true },
      { source: "/products-2/:path*", destination: "/products", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(media|models|posters|fonts)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
