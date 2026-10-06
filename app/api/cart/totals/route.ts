import { NextResponse } from "next/server";
import { getWooCommerceCartQuote } from "@/lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QuotePayload {
  country: string;
  items: Array<{ productId: string; quantity: number }>;
}

function validPayload(value: unknown): value is QuotePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<QuotePayload>;
  return Boolean(
    /^[A-Z]{2}$/.test(payload.country ?? "") &&
      payload.items?.length &&
      payload.items.every(
        (item) =>
          Number.isInteger(Number(item.productId)) &&
          Number(item.productId) > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      ),
  );
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!validPayload(payload)) {
      return NextResponse.json({ error: "Invalid cart details" }, { status: 400 });
    }
    return NextResponse.json(await getWooCommerceCartQuote(payload.items, payload.country));
  } catch (error) {
    console.error("Cart total calculation failed", error);
    return NextResponse.json({ error: "Unable to calculate WooCommerce totals" }, { status: 502 });
  }
}