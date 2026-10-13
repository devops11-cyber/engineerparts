import { NextRequest, NextResponse } from "next/server";
import {
  getWooCommerceCartQuote,
  submitWooCommerceCheckout,
  updateWooCommerceOrder,
} from "@/lib/woocommerce";
import { getCurrentCustomer } from "@/lib/auth-server";
import { wordpressAccountRequest } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/account";
import { isPlausibleAddress, isValidInternationalPhone } from "@/lib/utils";

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
  acceptPolicies: true;
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
    typeof payload.order_id === "string" &&
      payload.order_id.trim() &&
      billing &&
      validAddress(billing) &&
      typeof billing.email === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email.trim()) &&
      typeof billing.phone === "string" &&
      isValidInternationalPhone(billing.phone) &&
      payload.acceptPolicies === true &&
      Array.isArray(payload.items) &&
      payload.items.length > 0 &&
      payload.items.length <= 50 &&
      payload.items.every(
        (item) => Boolean(
          item &&
            typeof item === "object" &&
            Number.isInteger(Number(item.productId)) &&
            Number(item.productId) > 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0,
        ),
      ) &&
      (customer?.shipping === undefined || validAddress(customer.shipping)),
  );
}

function validAddress(value: unknown): value is CustomerAddress {
  if (!value || typeof value !== "object") return false;
  const address = value as Partial<CustomerAddress>;
  return Boolean(
    typeof address.firstName === "string" &&
      address.firstName.trim().length >= 2 &&
      typeof address.lastName === "string" &&
      address.lastName.trim().length >= 2 &&
      typeof address.company === "string" &&
      typeof address.address1 === "string" &&
      isPlausibleAddress(address.address1) &&
      typeof address.address2 === "string" &&
      typeof address.city === "string" &&
      address.city.trim().length >= 2 &&
      typeof address.state === "string" &&
      typeof address.postalCode === "string" &&
      typeof address.country === "string" &&
      /^[A-Z]{2}$/.test(address.country),
  );
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

    const billingAddress = {
      ...wooAddress(payload.customer.billing),
      email: payload.customer.billing.email.trim(),
      phone: payload.customer.billing.phone.trim(),
    };
    const shippingAddress = {
      ...wooAddress(payload.customer.shipping ?? payload.customer.billing),
      email: billingAddress.email,
      phone: billingAddress.phone,
    };
    const customer = await getCurrentCustomer();
    const sessionToken = cookies().get(SESSION_COOKIE)?.value;
    const quote = await getWooCommerceCartQuote(
      payload.items,
      payload.customer.shipping?.country ?? payload.customer.billing.country,
    );
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
    const policyAcceptedAt = new Date().toISOString();
    const checkout = await submitWooCommerceCheckout({
      items: payload.items,
      billing: billingAddress,
      shipping: shippingAddress,
      customerNote: `Storefront reference: ${payload.order_id}\nTerms and privacy accepted: ${policyAcceptedAt}`,
    });
    const paymentUrl = checkout.payment_result.redirect_url;

    if (!paymentUrl) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint: "/api/orders",
        category: "store_api_payment_redirect_missing",
        order_id: checkout.order_id,
      }));
      return NextResponse.json(
        {
          ok: false,
          code: "payment_handoff_failed",
          error: `Your order (${checkout.order_id}) was created, but secure payment could not be started. Please contact support before placing another order.`,
        },
        { status: 502 },
      );
    }
    let orderNumber = String(checkout.order_id);
    try {
      const order = await updateWooCommerceOrder(checkout.order_id, {
        customer_id: customer?.id,
        meta_data: [
          { key: "storefront_reference", value: payload.order_id },
          { key: "storefront_terms_accepted", value: policyAcceptedAt },
          { key: "storefront_privacy_acknowledged", value: policyAcceptedAt },
        ],
      });
      orderNumber = order.number || orderNumber;
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint: "/api/orders",
        category: "storefront_order_metadata_update_failed",
        order_id: checkout.order_id,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      }));
    }
    if (customer && payload.saveAddress) {
      if (sessionToken) {
        await wordpressAccountRequest("account/addresses", {
          method: "PUT",
          token: sessionToken,
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
      order_id: checkout.order_id,
      order_number: orderNumber,
      payment_url: paymentUrl,
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: "/api/orders",
      category: "woocommerce_order_failed",
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    }));
    return NextResponse.json(
      { ok: false, error: "We could not submit your order. Please try again or contact our sales team." },
      { status: 502 },
    );
  }
}
