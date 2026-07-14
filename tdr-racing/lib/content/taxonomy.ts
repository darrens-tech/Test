/** The four-pillar taxonomy — carried over verbatim from the legacy site (brief §1). */

export type PillarSlug = "power" | "handling" | "style" | "maintenance";

export interface Subcategory {
  slug: string;
  name: string;
  nameId: string;
}

export interface Pillar {
  slug: PillarSlug;
  name: string;
  code: string; // HUD micro-label
  subcategories: Subcategory[];
}

export const PILLARS: Pillar[] = [
  {
    slug: "power",
    name: "Power",
    code: "SYS · POWER",
    subcategories: [
      { slug: "engine", name: "Engine", nameId: "Mesin" },
      { slug: "electrical", name: "Electrical", nameId: "Kelistrikan" },
      {
        slug: "clutch-transmission-cvt",
        name: "Clutch, Transmission & CVT",
        nameId: "Kopling, Transmisi & CVT",
      },
      { slug: "induction-exhaust", name: "Induction & Exhaust", nameId: "Induksi & Knalpot" },
    ],
  },
  {
    slug: "handling",
    name: "Handling",
    code: "SYS · HANDLING",
    subcategories: [
      { slug: "suspension-chassis", name: "Suspension & Chassis", nameId: "Suspensi & Sasis" },
      { slug: "wheel", name: "Wheel", nameId: "Roda" },
      { slug: "brake", name: "Brake", nameId: "Rem" },
    ],
  },
  {
    slug: "style",
    name: "Style",
    code: "SYS · STYLE",
    subcategories: [
      { slug: "body", name: "Body", nameId: "Bodi" },
      { slug: "riding-gears", name: "Riding Gears", nameId: "Perlengkapan Berkendara" },
    ],
  },
  {
    slug: "maintenance",
    name: "Maintenance",
    code: "SYS · MAINTENANCE",
    subcategories: [
      { slug: "lubricants", name: "Lubricants", nameId: "Pelumas" },
      { slug: "tools-equipment", name: "Tools & Equipment", nameId: "Alat & Perlengkapan" },
    ],
  },
];

export function getPillar(slug: string): Pillar | undefined {
  return PILLARS.find((p) => p.slug === slug);
}

export function getSubcategory(pillar: string, sub: string) {
  return getPillar(pillar)?.subcategories.find((s) => s.slug === sub);
}
