import { NextRequest, NextResponse } from "next/server";
import { createWooCommerceOrder, getWooCommerceCartQuote } from "@/lib/woocommerce";
import { getCurrentCustomer } from "@/lib/auth-server";
import { wordpressAccountRequest } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderPayload {
  order_id: string;
  customer: {
    billing: CustomerAddress & { email: string; phone: string };
    shipping?: CustomerAddress;
  };
  items: Array<{ productId: string; quantity: number }>;
  saveAddress?: boolean;
}

interface CustomerAddress {
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
}

function validPayload(value: unknown): value is OrderPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OrderPayload>;
  const customer = payload.customer;
  const billing = customer?.billing;
  return Boolean(
    payload.order_id &&
      billing?.firstName?.trim() &&
      billing.lastName?.trim() &&
      billing.email?.trim() &&
      billing.phone?.trim() &&
      billing.address1?.trim() &&
      billing.city?.trim() &&
      /^[A-Z]{2}$/.test(billing.country) &&
      payload.items?.length &&
      payload.items.every(
        (item) => Number.isInteger(Number(item.productId)) && Number(item.productId) > 0 && Number.isInteger(item.quantity) && item.quantity > 0,
      ) &&
      (!customer?.shipping || validAddress(customer.shipping)),
  );
}

function validAddress(address: CustomerAddress): boolean {
  return Boolean(address.firstName?.trim() && address.lastName?.trim() && address.address1?.trim() && address.city?.trim() && /^[A-Z]{2}$/.test(address.country));
}

function wooAddress(address: CustomerAddress) {
  return {
    first_name: address.firstName.trim(),
    last_name: address.lastName.trim(),
    company: address.company.trim(),
    address_1: address.address1.trim(),
    address_2: address.address2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postcode: address.postalCode.trim(),
    country: address.country,
  };
}

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 65_536) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }
  try {
    const payload: unknown = await request.json();
    if (!validPayload(payload)) {
      return NextResponse.json({ ok: false, error: "Invalid order details" }, { status: 400 });
    }

    const billingAddress = wooAddress(payload.customer.billing);
    const shippingAddress = wooAddress(payload.customer.shipping ?? payload.customer.billing);
    const customer = await getCurrentCustomer();
    const quote = await getWooCommerceCartQuote(payload.items, payload.customer.billing.country);
    const unavailable = payload.items
      .map((item) => {
        const stock = quote.stockLimits.find(({ productId }) => productId === item.productId);
        return { ...item, maxQuantity: stock ? stock.maxQuantity : 0 };
      })
      .find((item) => item.maxQuantity !== null && item.quantity > item.maxQuantity);
    if (unavailable) {
      return NextResponse.json(
        { ok: false, error: unavailable.maxQuantity === 0
          ? "This product is out of stock. Please update your cart."
          : `Only ${unavailable.maxQuantity} of this product are currently in stock. Please update your cart.` },
        { status: 409 },
      );
    }
    const order = await createWooCommerceOrder({
      customer_id: customer?.id,
      payment_method: "nomod",
      payment_method_title: "Nomod",
      set_paid: false,
      billing: {
        ...billingAddress,
        email: payload.customer.billing.email.trim(),
        phone: payload.customer.billing.phone.trim(),
      },
      shipping: shippingAddress,
      line_items: payload.items.map((item) => ({
        product_id: Number(item.productId),
        quantity: item.quantity,
      })),
      shipping_lines: quote.shippingMethod
        ? [{
            method_id: quote.shippingMethod.methodId,
            method_title: quote.shippingMethod.title,
            total: quote.shippingMethod.total,
          }]
        : undefined,
      customer_note: "",
      meta_data: [
        { key: "storefront_reference", value: payload.order_id },
      ],
    });
    if (!order.payment_url) throw new Error("WooCommerce did not return a payment URL");

    if (customer && payload.saveAddress) {
      const token = cookies().get(SESSION_COOKIE)?.value;
      if (token) {
        await wordpressAccountRequest("account/addresses", {
          method: "PUT",
          token,
          body: {
            billing: payload.customer.billing,
            shipping: payload.customer.shipping ?? payload.customer.billing,
            sameAsBilling: !payload.customer.shipping,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      order_number: order.number,
      payment_url: order.payment_url,
    });
  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), endpoint: "/api/orders", category: "woocommerce_order_failed" }));
    return NextResponse.json(
      { ok: false, error: "Unable to place the order right now. Please try again." },
      { status: 502 },
    );
  }
}
