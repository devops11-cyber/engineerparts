import type { Product } from "@/lib/types";

export const products: Product[] = [];

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return products.find((product) => product.sku.toLowerCase() === sku.toLowerCase());
}

export function productsByCategory(category: string): Product[] {
  return products.filter((product) => product.category === category);
}

export function relatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter(
      (item) =>
        item.id !== product.id &&
        item.status !== "Sold" &&
        (item.category === product.category || item.brand === product.brand),
    )
    .slice(0, limit);
}