import type { Product } from "@/lib/types";

export interface BrowserFacets {
  brands: string[];
  manufacturers: string[];
  categories: { slug: string; name: string }[];
  subcategories: string[];
  conditions: string[];
  locations: string[];
  availability: string[];
  priceBounds: [number, number];
  quantityMax: number;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function buildFacets(items: Product[]): BrowserFacets {
  const priced = items.map((p) => p.price).filter((p): p is number => p !== null && p > 0);
  const min = priced.length ? Math.floor(Math.min(...priced)) : 0;
  const max = priced.length ? Math.ceil(Math.max(...priced)) : 0;

  return {
    brands: unique(items.map((p) => p.brand)),
    manufacturers: unique(items.map((p) => p.manufacturer)),
    categories: unique(items.map((p) => p.category)).map((slug) => ({
      slug,
      name: slug,
    })),
    subcategories: unique(items.map((p) => p.subcategory)),
    conditions: unique(items.map((p) => p.condition)),
    locations: unique(items.map((p) => p.warehouse_location)),
    availability: unique(items.map((p) => p.status)),
    priceBounds: [min, max],
    quantityMax: items.reduce((acc, p) => Math.max(acc, p.quantity_available ?? 0), 0),
  };
}
