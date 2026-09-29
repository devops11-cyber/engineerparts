import type { Category } from "@/lib/types";

export const categories: Category[] = [];

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export const CATEGORY_BY_SLUG: Record<string, Category> = {};