import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    ok: true,
    accepted: false,
    message: "CSV/Excel bulk import endpoint is reserved for admin integration.",
    expected_entities: ["products", "lots", "equipment"],
    expected_product_fields: [
      "id",
      "sku",
      "name",
      "slug",
      "brand",
      "manufacturer",
      "part_number",
      "model",
      "category",
      "description",
      "condition",
      "quantity_available",
      "price",
      "currency",
      "listing_type",
      "warehouse_location",
      "lot_id",
      "images",
      "specifications",
      "documents",
      "status",
    ],
  });
}

export async function GET() {
  return POST();
}
