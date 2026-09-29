import { lots } from "@/lib/data/lots";
import { equipment } from "@/lib/data/equipment";
import type { Brand, Category, CategorySlug, ConditionGrade, Product, ProductStatus } from "@/lib/types";

export interface SearchHit {
  kind: "product" | "lot" | "equipment";
  id: string;
  title: string;
  subtitle: string;
  brand: string;
  reference: string;
  condition: string;
  status: string;
  price: number | null;
  currency: string;
  quantity: number | null;
  href: string;
  image: string;
  category: CategorySlug;
  score: number;
}

interface IndexEntry {
  haystack: string;
  tokens: string[];
  exact: string[];
  starts: string[];
  category: CategorySlug;
  hit: Omit<SearchHit, "score">;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9./-]+/g, " ").trim();
}

const index: IndexEntry[] = [];

lots.forEach((l) => {
  index.push({
    haystack: normalize(
      [
        l.lot_reference,
        l.name,
        l.description,
        l.condition,
        l.location,
        l.items.map((i) => `${i.brand} ${i.part_number} ${i.description}`).join(" "),
      ].join(" "),
    ),
    tokens: normalize(l.name).split(" ").filter(Boolean),
    exact: [l.lot_reference.toLowerCase()],
    starts: [l.lot_reference.toLowerCase(), "lot"],
    category: l.category,
    hit: {
      kind: "lot",
      id: l.id,
      title: l.name,
      subtitle: `Lot - ${l.location}`,
      brand: "Engineerparts Surplus",
      reference: l.lot_reference,
      condition: l.condition,
      status: l.status,
      price: l.price,
      currency: l.currency,
      quantity: l.total_quantity,
      href: `/lots/${l.lot_reference}`,
      image: l.images[0],
      category: l.category,
    },
  });
});

equipment.forEach((e) => {
  index.push({
    haystack: normalize(
      [
        e.reference,
        e.name,
        e.manufacturer,
        e.model,
        e.serial_number,
        e.description,
        e.condition,
        e.location,
        e.capacity,
        e.specifications.map((s) => `${s.label} ${s.value}`).join(" "),
      ].join(" "),
    ),
    tokens: normalize(e.name).split(" ").filter(Boolean),
    exact: [e.reference, e.serial_number, e.model].map((v) => v.toLowerCase()),
    starts: [e.reference, e.serial_number, e.model, e.manufacturer].map((v) => v.toLowerCase()),
    category: "equipment",
    hit: {
      kind: "equipment",
      id: e.id,
      title: e.name,
      subtitle: `${e.manufacturer} ${e.model} - ${e.year}`,
      brand: e.manufacturer,
      reference: e.reference,
      condition: e.condition,
      status: e.status,
      price: e.price,
      currency: e.currency,
      quantity: e.quantity,
      href: `/equipment/${e.slug}`,
      image: e.images[0],
      category: "equipment",
    },
  });
});

function scoreEntry(entry: IndexEntry, q: string): number {
  const query = normalize(q);
  if (!query) return 0;

  let score = 0;

  if (entry.exact.includes(query)) score += 1000;
  if (entry.exact.some((v) => v && v === query)) score += 200;
  if (entry.starts.some((v) => v && v.startsWith(query))) score += 450;
  if (entry.haystack.includes(query)) score += 200;

  const parts = query.split(" ").filter(Boolean);
  let matched = 0;
  parts.forEach((part) => {
    if (entry.tokens.some((t) => t.startsWith(part))) matched += 2;
    else if (entry.haystack.includes(part)) matched += 1;
  });
  score += matched * 25;

  if (parts.length > 1 && parts.every((p) => entry.haystack.includes(p))) score += 120;

  return score;
}

export function search(query: string, limit = 20): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const scored = index
    .map((entry) => ({ ...entry.hit, score: scoreEntry(entry, trimmed) }))
    .filter((hit) => hit.score > 40)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return scored.slice(0, limit);
}

export interface SuggestionGroups {
  products: SearchHit[];
  lots: SearchHit[];
  equipment: SearchHit[];
  brands: Brand[];
  categories: Category[];
}

export interface ClearanceQuery {
  q?: string;
  brands?: string[];
  manufacturers?: string[];
  categories?: string[];
  subcategories?: string[];
  conditions?: string[];
  locations?: string[];
  productTypes?: string[];
  availability?: string[];
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  spec?: string;
  sort?: "recent" | "price-asc" | "price-desc" | "quantity" | "az" | "brand";
}

export function filterProducts(list: Product[], query: ClearanceQuery): Product[] {
  const q = query.q?.trim().toLowerCase() ?? "";

  let result = list.filter((p) => {
    if (q) {
      const haystack = [
        p.sku,
        p.name,
        p.brand,
        p.manufacturer,
        p.part_number,
        p.model,
        p.description,
        p.category,
        p.subcategory,
        p.specifications.map((s) => `${s.label} ${s.value}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (query.brands?.length && !query.brands.includes(p.brand)) return false;
    if (query.manufacturers?.length && !query.manufacturers.includes(p.manufacturer)) return false;
    if (query.categories?.length && !query.categories.includes(p.category)) return false;
    if (query.subcategories?.length && !query.subcategories.includes(p.subcategory)) return false;
    if (query.conditions?.length && !query.conditions.includes(p.condition)) return false;
    if (query.locations?.length && !query.locations.includes(p.warehouse_location)) return false;
    if (query.productTypes?.length && !query.productTypes.includes(p.listing_type)) return false;
    if (query.availability?.length && !query.availability.includes(p.status)) return false;
    if (query.minPrice !== undefined && (p.price ?? Infinity) < query.minPrice) return false;
    if (query.maxPrice !== undefined && (p.price ?? 0) > query.maxPrice) return false;
    if (query.minQuantity !== undefined && (p.quantity_available === null || p.quantity_available < query.minQuantity)) return false;
    if (query.spec?.trim()) {
      const spec = query.spec.trim().toLowerCase();
      const specText = p.specifications.map((s) => `${s.label} ${s.value}`).join(" ").toLowerCase();
      if (!specText.includes(spec)) return false;
    }
    return true;
  });

  switch (query.sort) {
    case "price-asc":
      result = result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;
    case "price-desc":
      result = result.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      break;
    case "quantity":
      result = result.sort((a, b) => (b.quantity_available ?? -1) - (a.quantity_available ?? -1));
      break;
    case "az":
      result = result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "brand":
      result = result.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
      break;
    default:
      result = result.sort(
        (a, b) => new Date(b.added_date).getTime() - new Date(a.added_date).getTime(),
      );
  }

  return result;
}

export function facets(list: Product[]) {
  const collect = <T extends string>(values: T[]) => Array.from(new Set(values)).sort();

  return {
    brands: collect(list.map((p) => p.brand)),
    manufacturers: collect(list.map((p) => p.manufacturer)),
    categories: collect(list.map((p) => p.category)),
    subcategories: collect(list.map((p) => p.subcategory)),
    conditions: collect(list.map((p) => p.condition as ConditionGrade)),
    locations: collect(list.map((p) => p.warehouse_location)),
    productTypes: collect(list.map((p) => p.listing_type)),
    availability: collect(list.map((p) => p.status as ProductStatus)),
  };
}
