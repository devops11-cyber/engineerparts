import { NextRequest, NextResponse } from "next/server";
import { getWooCommerceOrderIfKeyMatches } from "@/lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  const orderKey = request.nextUrl.searchParams.get("order_key") ?? "";

  if (!Number.isInteger(orderId) || orderId <= 0 || !orderKey) {
    return NextResponse.json({ ok: false, error: "Invalid order reference." }, { status: 400 });
  }

  try {
    const order = await getWooCommerceOrderIfKeyMatches(orderId, orderKey);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      order: {
        number: order.number,
        status: order.status,
        total: order.total,
        currency: order.currency,
        paymentUrl: order.payment_url,
        items: order.line_items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          total: item.total,
        })),
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: "/api/orders/[id]",
      category: "woocommerce_order_lookup_failed",
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    }));
    return NextResponse.json(
      { ok: false, error: "We could not check your order status. Please try again shortly." },
      { status: 502 },
    );
  }
}
