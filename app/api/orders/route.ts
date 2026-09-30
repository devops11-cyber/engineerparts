import { NextResponse } from "next/server";
import { createWooCommerceOrder } from "@/lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderPayload {
  order_id: string;
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
    country: string;
    billingAddress: string;
    shippingAddress: string;
    fulfilment: "delivery" | "collection";
    notes: string;
  };
  items: Array<{ productId: string; quantity: number }>;
}

function validPayload(value: unknown): value is OrderPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OrderPayload>;
  const customer = payload.customer;
  return Boolean(
    payload.order_id &&
      customer?.name?.trim() &&
      customer.company?.trim() &&
      customer.email?.trim() &&
      customer.phone?.trim() &&
      /^[A-Za-z]{2}$/.test(customer.country?.trim() ?? "") &&
      customer.billingAddress?.trim() &&
      (customer.fulfilment === "collection" || customer.shippingAddress?.trim()) &&
      payload.items?.length &&
      payload.items.every(
        (item) => Number.isInteger(Number(item.productId)) && Number(item.productId) > 0 && Number.isInteger(item.quantity) && item.quantity > 0,
      ),
  );
}

function splitName(name: string): [string, string] {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return [firstName, rest.join(" ")];
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!validPayload(payload)) {
      return NextResponse.json({ ok: false, error: "Invalid order details" }, { status: 400 });
    }

    const [firstName, lastName] = splitName(payload.customer.name);
    const customerAddress = {
      first_name: firstName,
      last_name: lastName,
      company: payload.customer.company.trim(),
      address_1: payload.customer.billingAddress.trim(),
      country: payload.customer.country.trim().toUpperCase(),
    };
    const order = await createWooCommerceOrder({
      payment_method: "nomod",
      payment_method_title: "Nomod",
      set_paid: false,
      billing: {
        ...customerAddress,
        email: payload.customer.email.trim(),
        phone: payload.customer.phone.trim(),
      },
      shipping:
        payload.customer.fulfilment === "delivery"
          ? { ...customerAddress, address_1: payload.customer.shippingAddress.trim() }
          : undefined,
      line_items: payload.items.map((item) => ({
        product_id: Number(item.productId),
        quantity: item.quantity,
      })),
      customer_note: payload.customer.notes.trim(),
      meta_data: [
        { key: "storefront_reference", value: payload.order_id },
        { key: "fulfilment", value: payload.customer.fulfilment },
      ],
    });
    if (!order.payment_url) throw new Error("WooCommerce did not return a payment URL");

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      order_number: order.number,
      payment_url: order.payment_url,
    });
  } catch (error) {
    console.error("Order creation failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to place order" },
      { status: 502 },
    );
  }
}
