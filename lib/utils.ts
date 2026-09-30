import type { ConditionGrade, ProductStatus } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(value: number | null, currency = ""): string {
  if (value === null || value === undefined) return "Price on enquiry";
  if (!currency) return new Intl.NumberFormat("en-AE", { maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AE").format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function daysAgo(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export function relativeAdded(iso: string): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "Date not provided";
  const days = daysAgo(iso);
  if (days === 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 14) return `Added ${days} days ago`;
  return `Added ${formatDate(iso)}`;
}

const STATUS_STYLES: Record<ProductStatus, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Low Stock": "border-amber-200 bg-amber-50 text-amber-800",
  Reserved: "border-brand-200 bg-brand-50 text-brand-800",
  Sold: "border-steel-300 bg-steel-100 text-steel-600",
};

export function statusStyle(status: ProductStatus): string {
  return STATUS_STYLES[status];
}

export function conditionTone(condition: ConditionGrade): string {
  if (condition.startsWith("New")) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (condition === "Refurbished") return "border-brand-200 bg-brand-50 text-brand-800";
  if (condition === "Mixed") return "border-amber-200 bg-amber-50 text-amber-800";
  if (condition === "Used - Good") return "border-navy-200 bg-navy-50 text-navy-700";
  return "border-signal-200 bg-signal-50 text-signal-700";
}

export function isPurchasable(status: ProductStatus): boolean {
  return status === "Available" || status === "Low Stock";
}

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export function whatsappLink(message: string): string {
  if (!WHATSAPP_NUMBER) return `/contact?message=${encodeURIComponent(message)}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(item: {
  name: string;
  sku: string;
  part_number?: string;
  url: string;
}): string {
  return [
    `Hello Engineerparts.com, I would like to enquire about this clearance item:`,
    ``,
    `Product: ${item.name}`,
    `SKU: ${item.sku}`,
    item.part_number ? `Part number: ${item.part_number}` : "",
    `Listing: ${item.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function lotWhatsAppMessage(lot: { name: string; lot_reference: string; url: string }): string {
  return [
    `Hello Engineerparts.com, I would like to enquire about this clearance lot:`,
    ``,
    `Lot: ${lot.lot_reference} - ${lot.name}`,
    `Listing: ${lot.url}`,
  ].join("\n");
}

export function equipmentWhatsAppMessage(eq: {
  name: string;
  reference: string;
  serial_number: string;
  url: string;
}): string {
  return [
    `Hello Engineerparts.com, I would like to enquire about this equipment unit:`,
    ``,
    `Unit: ${eq.reference} - ${eq.name}`,
    `Serial: ${eq.serial_number}`,
    `Listing: ${eq.url}`,
  ].join("\n");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function absoluteUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return `https://engineerparts.com${path}`;
}
