import "server-only";
import { z } from "zod";
import productsRaw from "@/content/products.json";
import bikesRaw from "@/content/bikes.json";
import dealersRaw from "@/content/dealers.json";
import newsRaw from "@/content/news.json";
import {
  BikeSchema,
  DealerSchema,
  NewsSchema,
  ProductSchema,
  type Bike,
  type Dealer,
  type NewsPost,
  type Product,
} from "./schema";

/** Content is zod-validated once at module init — a schema violation fails the build,
 *  which is the point: invented or malformed data must not ship. */
const products: Product[] = z.array(ProductSchema).parse(productsRaw);
const bikes: Bike[] = z.array(BikeSchema).parse(bikesRaw);
const dealers: Dealer[] = z.array(DealerSchema).parse(dealersRaw);
const news: NewsPost[] = z
  .array(NewsSchema)
  .parse(newsRaw)
  .sort((a, b) => b.date.localeCompare(a.date));

export function getProducts(): Product[] {
  return products;
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsBySubcategory(pillar: string, sub: string): Product[] {
  return products.filter((p) => p.pillar === pillar && p.subcategory === sub);
}

export function getProductsByPillar(pillar: string): Product[] {
  return products.filter((p) => p.pillar === pillar);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getBikes(): Bike[] {
  return bikes;
}

export function getBike(makeSlug: string, modelSlug: string): Bike | undefined {
  return bikes.find((b) => b.makeSlug === makeSlug && b.slug === modelSlug);
}

/** Fitment matching — a product fits when a record covers the make+model+year.
 *  Records carry their verification state through to the UI; nothing is assumed. */
export function getProductsForBike(bike: Bike, year: number): Product[] {
  return products.filter((p) =>
    p.fitment.some(
      (f) =>
        (f.make.toLowerCase() === bike.make.toLowerCase() ||
          f.make === "Universal") &&
        (f.make === "Universal" || f.model.toLowerCase() === bike.model.toLowerCase()) &&
        year >= f.yearFrom &&
        (f.yearTo === null || year <= f.yearTo),
    ),
  );
}

export function getDealers(): Dealer[] {
  return dealers;
}

export function getNews(): NewsPost[] {
  return news;
}

export function getNewsPost(slug: string): NewsPost | undefined {
  return news.find((n) => n.slug === slug);
}
