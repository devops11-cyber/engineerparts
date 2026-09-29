import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { products as localProducts } from "@/lib/data/products";
import type {
  CategorySlug,
  ConditionGrade,
  ListingBadge,
  ListingType,
  Product,
} from "@/lib/types";

type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  price: string;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  date_created: string;
  categories: Array<{ name: string; slug: string }>;
  images: Array<{ src: string }>;
  attributes: Array<{ name: string; options: string[] }>;
  meta_data: Array<{ key: string; value: unknown }>;
  currency_code?: string;
};

type WooStoreProduct = Omit<
  WooProduct,
  "price" | "stock_status" | "date_created" | "attributes" | "meta_data"
> & {
  prices: { price: string; currency_code: string; currency_minor_unit: number };
  is_in_stock: boolean;
  low_stock_remaining: number | null;
  attributes: Array<{ name: string; terms: Array<{ name: string }> }>;
};

const conditions: ConditionGrade[] = [
  "New Surplus",
  "New Old Stock",
  "Refurbished",
  "Used - Good",
  "Used - Fair",
  "For Parts / Repair",
  "Mixed",
];

const listingTypes: ListingType[] = [
  "Buy Now",
  "Enquiry Only",
  "Buy or Enquire",
  "Make an Offer",
  "Whole Lot",
  "Equipment Enquiry",
];

const badges: ListingBadge[] = ["CLEARANCE", "SURPLUS", "AGED STOCK", "LOT", "EQUIPMENT"];

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function metadata(product: WooProduct, key: string): unknown {
  return product.meta_data.find((item) => item.key === key)?.value;
}

function attribute(product: WooProduct, name: string): string {
  return product.attributes.find((item) => item.name.toLowerCase() === name.toLowerCase())?.options.join(", ") ?? "";
}

function category(product: WooProduct): CategorySlug {
  return product.categories[0]?.slug ?? "uncategorised";
}

function mapProduct(product: WooProduct): Product {
  const conditionValue = text(metadata(product, "condition"), attribute(product, "Condition"));
  const listingValue = text(metadata(product, "listing_type"));
  const badgeValue = metadata(product, "badges");
  const productBadges = (Array.isArray(badgeValue) ? badgeValue : text(badgeValue).split(","))
    .map((item) => String(item).trim().toUpperCase())
    .filter((item): item is ListingBadge => badges.includes(item as ListingBadge));

  return {
    id: String(product.id),
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    brand: text(metadata(product, "brand"), attribute(product, "Brand") || "Not provided"),
    manufacturer: text(metadata(product, "manufacturer"), attribute(product, "Manufacturer") || "Not provided"),
    part_number: text(metadata(product, "part_number"), attribute(product, "Part Number") || product.sku),
    model: text(metadata(product, "model"), attribute(product, "Model") || "Not provided"),
    category: category(product),
    subcategory: product.categories[0]?.name ?? "Uncategorised",
    description: stripHtml(product.description || product.short_description),
    condition: conditions.includes(conditionValue as ConditionGrade) ? (conditionValue as ConditionGrade) : "Not provided",
    condition_notes: text(metadata(product, "condition_notes"), "Not provided"),
    quantity_available: product.stock_quantity,
    price: product.price ? Number(product.price) : null,
    currency: product.currency_code ?? process.env.WOOCOMMERCE_CURRENCY ?? "",
    listing_type: listingTypes.includes(listingValue as ListingType)
      ? (listingValue as ListingType)
      : "Enquiry Only",
    warehouse_location: text(metadata(product, "warehouse_location"), "Not provided"),
    lot_id: text(metadata(product, "lot_id")) || null,
    images: product.images.length
      ? product.images.map((image) => image.src)
      : [`${process.env.WOOCOMMERCE_URL?.replace(/\/$/, "")}/wp-content/plugins/woocommerce/assets/images/placeholder.png`],
    specifications: product.attributes.map((item) => ({
      label: item.name,
      value: item.options.join(", "),
    })),
    documents: [],
    status:
      product.stock_status === "outofstock"
        ? "Sold"
        : "Available",
    badges: productBadges,
    added_date: product.date_created.slice(0, 10),
    lead_time: text(metadata(product, "lead_time"), "Not provided"),
  };
}

function configuration() {
  const url = process.env.WOOCOMMERCE_URL?.replace(/\/$/, "");
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  return url && key && secret ? { url, key, secret } : null;
}

function oauthEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function signHttpUrl(url: URL, key: string, secret: string): void {
  url.searchParams.set("oauth_consumer_key", key);
  url.searchParams.set("oauth_nonce", randomBytes(16).toString("hex"));
  url.searchParams.set("oauth_signature_method", "HMAC-SHA256");
  url.searchParams.set("oauth_timestamp", String(Math.floor(Date.now() / 1000)));
  url.searchParams.set("oauth_version", "1.0");

  const parameters = [...url.searchParams.entries()]
    .map(([name, value]) => [oauthEncode(name), oauthEncode(value)] as const)
    .sort(([leftName, leftValue], [rightName, rightValue]) =>
      leftName === rightName ? leftValue.localeCompare(rightValue) : leftName.localeCompare(rightName),
    )
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const baseUrl = `${url.origin}${url.pathname}`;
  const signatureBase = `GET&${oauthEncode(baseUrl)}&${oauthEncode(parameters)}`;
  const signature = createHmac("sha256", `${secret}&`).update(signatureBase).digest("base64");

  url.searchParams.set("oauth_signature", signature);
}

async function fetchPage(page: number, config: NonNullable<ReturnType<typeof configuration>>) {
  const url = new URL(`${config.url}/wp-json/wc/v3/products`);
  url.searchParams.set("status", "publish");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(page));

  const headers: HeadersInit = {};
  if (url.protocol === "https:") {
    headers.Authorization = `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString("base64")}`;
  } else {
    signHttpUrl(url, config.key, config.secret);
  }

  const response = await fetch(url, { headers, next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`WooCommerce products request failed (${response.status} ${response.statusText})`);
  }

  return {
    products: (await response.json()) as WooProduct[],
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? "1"),
  };
}

async function fetchStorePage(page: number, url: string) {
  const response = await fetch(
    `${url}/wp-json/wc/store/v1/products?per_page=100&page=${page}`,
    { next: { revalidate: 300 } },
  );

  if (!response.ok) {
    throw new Error(`WooCommerce Store API request failed (${response.status} ${response.statusText})`);
  }

  const products = ((await response.json()) as WooStoreProduct[]).map(
    (product): WooProduct => ({
      ...product,
      price: product.prices.price
        ? String(Number(product.prices.price) / 10 ** product.prices.currency_minor_unit)
        : "",
      stock_status: !product.is_in_stock
        ? "outofstock"
        : product.low_stock_remaining !== null
          ? "onbackorder"
          : "instock",
      date_created: "",
      attributes: product.attributes.map((item) => ({
        name: item.name,
        options: item.terms.map((term) => term.name),
      })),
      meta_data: [],
      currency_code: product.prices.currency_code,
    }),
  );

  return {
    products,
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? "1"),
  };
}

async function getStoreProducts(url: string): Promise<Product[]> {
  const firstPage = await fetchStorePage(1, url);
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.totalPages - 1) },
      (_, index) => fetchStorePage(index + 2, url),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.products).map(mapProduct);
}

export async function getProducts(): Promise<Product[]> {
  const config = configuration();
  if (!config) return localProducts;

  try {
    const firstPage = await fetchPage(1, config);
    const remainingPages = await Promise.all(
      Array.from(
        { length: Math.max(0, firstPage.totalPages - 1) },
        (_, index) => fetchPage(index + 2, config),
      ),
    );

    return [firstPage, ...remainingPages].flatMap((page) => page.products).map(mapProduct);
  } catch (error) {
    console.warn(
      `WooCommerce REST API unavailable (${error instanceof Error ? error.message : "unknown error"}); using the public Store API.`,
    );
    return getStoreProducts(config.url);
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((product) => product.slug === slug);
}