export type ListingType =
  | "Buy Now"
  | "Buy or Enquire"
  | "Whole Lot"
  | "Equipment Enquiry";

export type ProductStatus =
  | "Available"
  | "Low Stock"
  | "Reserved"
  | "Sold";

export type ConditionGrade =
  | "Not provided"
  | "New Surplus"
  | "New Old Stock"
  | "Refurbished"
  | "Used - Good"
  | "Used - Fair"
  | "For Parts / Repair"
  | "Mixed";

export type ListingBadge = "CLEARANCE" | "SURPLUS" | "AGED STOCK" | "LOT" | "EQUIPMENT";

export type CategorySlug = string;

export interface Category {
  slug: CategorySlug;
  name: string;
  shortName: string;
  description: string;
  image: string;
  subcategories: string[];
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface DocumentRef {
  name: string;
  type: "PDF" | "XLSX" | "CSV" | "JPG";
  size: string;
  href: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  manufacturer: string;
  part_number: string;
  model: string;
  category: CategorySlug;
  subcategory: string;
  description: string;
  condition: ConditionGrade;
  condition_notes: string;
  quantity_available: number | null;
  price: number | null;
  currency: string;
  listing_type: ListingType;
  warehouse_location: string;
  lot_id: string | null;
  images: string[];
  specifications: SpecItem[];
  documents: DocumentRef[];
  status: ProductStatus;
  badges: ListingBadge[];
  added_date: string;
  lead_time: string;
  woocommerce_checkout_url?: string;
}

export interface LotLineItem {
  item: string;
  brand: string;
  part_number: string;
  description: string;
  quantity: number;
  condition: ConditionGrade;
}

export interface Lot {
  id: string;
  lot_reference: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  category: CategorySlug;
  items: LotLineItem[];
  total_quantity: number;
  condition: ConditionGrade;
  price: number | null;
  currency: "AED";
  images: string[];
  inventory_file: DocumentRef;
  status: ProductStatus;
  added_date: string;
}

export interface Equipment {
  id: string;
  reference: string;
  slug: string;
  manufacturer: string;
  model: string;
  name: string;
  serial_number: string;
  year: number;
  operating_hours: number;
  capacity: string;
  condition: ConditionGrade;
  location: string;
  quantity: number;
  description: string;
  condition_notes: string;
  specifications: SpecItem[];
  images: string[];
  documents: DocumentRef[];
  inspection: string;
  price: number | null;
  currency: "AED";
  status: ProductStatus;
  added_date: string;
}

export interface Brand {
  slug: string;
  name: string;
  description: string;
  logoText: string;
  sectors: string[];
  featured: boolean;
}

export type LeadType =
  | "product_enquiry"
  | "whole_lot_enquiry"
  | "equipment_enquiry"
  | "general_contact"
  | "bulk_deal"
  | "clearance_alert";

export interface Lead {
  lead_id: string;
  lead_type: LeadType;
  product_id?: string;
  sku?: string;
  sku_or_part?: string;
  part_number?: string;
  lot_id?: string;
  equipment_id?: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  quantity?: number;
  budget?: string;
  message?: string;
  source: string;
  listing_url?: string;
  status: "new" | "reviewing" | "responded" | "won" | "closed";
  created_at: string;
}

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  condition: ConditionGrade;
  unitPrice: number;
  currency: string;
  quantity: number;
  maxQuantity: number;
  image: string;
  warehouse: string;
}

export type CartItem = CartLine;

export interface AnalyticsEvent {
  name: string;
  payload?: Record<string, unknown>;
  ts: string;
}
