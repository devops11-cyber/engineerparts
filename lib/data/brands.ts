import type { Brand, Product } from "@/lib/types";

export const brands: Brand[] = [];
export const FEATURED_BRANDS: Brand[] = [];

export function brandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function brandsFromProducts(products: Product[]): Brand[] {
  return Array.from(new Set(products.map((product) => product.brand).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const brandProducts = products.filter((product) => product.brand === name);
      return {
        slug: brandSlug(name),
        name,
        logoText: name,
        description: `${brandProducts.length} currently listed ${name} product${brandProducts.length === 1 ? "" : "s"}.`,
        sectors: Array.from(new Set(brandProducts.map((product) => product.subcategory))).filter(Boolean),
        featured: false,
      };
    });
}

export function getBrand(products: Product[], slug: string): Brand | undefined {
  return brandsFromProducts(products).find((brand) => brand.slug === slug);
}