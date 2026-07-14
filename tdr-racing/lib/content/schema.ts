import { z } from "zod";

/**
 * Content schema — brief §8, plus the honesty system from DESIGN-PLAN §1:
 * every measurable value carries a `verification` state. `pending` values
 * render with a `TBD · PENDING VERIFICATION` chip and never in "measured mono"
 * styling. Nothing in this codebase invents a number — the schema makes the
 * uncertain state explicit instead of fake-precise.
 */
export const Verification = z.enum(["verified", "pending"]);

export const SpecSchema = z.object({
  label: z.string(),
  labelId: z.string().optional(), // Bahasa label
  value: z.string(), // "TBD" allowed — renders as pending chip
  unit: z.string().optional(),
  verification: Verification,
});

export const FitmentSchema = z.object({
  make: z.string(),
  model: z.string(),
  yearFrom: z.number(),
  yearTo: z.number().nullable(), // null = current
  engine: z.string().optional(),
  verification: Verification,
});

export const Model3dSchema = z.object({
  /** Registry key for the in-code procedural part (stand-in geometry of the real
   *  part). When TDR's CAD-derived GLB lands (ASSETS.md), `gltf` takes over. */
  procedural: z.enum(["cvt-set", "cylinder-kit"]),
  gltf: z.string().nullable(),
  annotations: z.array(
    z.object({
      part: z.string(), // procedural part id the callout anchors to
      label: z.string(),
      labelId: z.string().optional(),
      value: z.string(), // "TBD" allowed
      verification: Verification,
    }),
  ),
});

export const TurntableSchema = z.object({
  webm: z.string().nullable(),
  mp4: z.string().nullable(),
  poster: z.string(),
});

export const BuyLinkSchema = z.object({
  vendor: z.enum(["tokopedia", "shopee", "tdr-hpz", "dealer", "whatsapp"]),
  href: z.string().nullable(), // null = link pending (GAP) — renders as pending, never javascript:void(0)
});

export const ProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  partNumber: z.string(), // "TBD" until verified against TDR's catalogue
  pillar: z.enum(["power", "handling", "style", "maintenance"]),
  subcategory: z.string(),
  claim: z.string(), // one line, spec-led, English
  claimId: z.string(), // Bahasa Indonesia
  model3d: Model3dSchema.nullable(),
  turntable: TurntableSchema.nullable(),
  gallery: z.array(z.string()),
  materials: z.array(z.object({ value: z.string(), verification: Verification })),
  specs: z.array(SpecSchema),
  fitment: z.array(FitmentSchema),
  inTheBox: z.array(z.string()),
  torqueSpec: z
    .object({ value: z.string(), unit: z.string(), verification: Verification })
    .nullable(),
  installDifficulty: z.enum(["rider", "workshop", "engine-builder"]).nullable(),
  dynoData: z
    .array(z.object({ rpm: z.number(), hp: z.number(), nm: z.number() }))
    .nullable(),
  downloads: z.array(z.object({ label: z.string(), href: z.string().nullable() })),
  buyLinks: z.array(BuyLinkSchema),
  related: z.array(z.string()),
  featured: z.boolean().default(false),
});

export type Product = z.infer<typeof ProductSchema>;
export type Spec = z.infer<typeof SpecSchema>;
export type Fitment = z.infer<typeof FitmentSchema>;

export const BikeSchema = z.object({
  make: z.string(),
  model: z.string(),
  slug: z.string(), // model slug, e.g. vario-160
  makeSlug: z.string(),
  yearFrom: z.number(),
  yearTo: z.number().nullable(),
  engine: z.string().optional(),
});
export type Bike = z.infer<typeof BikeSchema>;

export const DealerSchema = z.object({
  name: z.string(),
  city: z.string(),
  country: z.string(),
  kind: z.enum(["hq", "retail", "distributor"]),
  lat: z.number(),
  lng: z.number(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  verification: Verification,
});
export type Dealer = z.infer<typeof DealerSchema>;

export const NewsSchema = z.object({
  slug: z.string(),
  date: z.string(),
  title: z.string(),
  titleId: z.string(),
  excerpt: z.string(),
  excerptId: z.string(),
  body: z.array(z.string()),
  bodyId: z.array(z.string()),
  tag: z.string(),
});
export type NewsPost = z.infer<typeof NewsSchema>;
