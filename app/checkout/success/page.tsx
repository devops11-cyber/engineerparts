import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { OrderSuccessView } from "@/components/checkout/OrderSuccessView";
import { getWooCommerceOrderIfKeyMatches } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Order confirmation",
  description: "Your Engineerparts.com order confirmation.",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order_id?: string; order_key?: string };
}) {
  const orderId = Number(searchParams.order_id);
  const orderKey = searchParams.order_key ?? "";
  const valid = Number.isInteger(orderId) && orderId > 0 && Boolean(orderKey);

  const order = valid ? await getWooCommerceOrderIfKeyMatches(orderId, orderKey) : null;

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout", href: "/checkout" }, { label: "Order confirmation" }]}
        eyebrow="Checkout"
        title={order ? "Order confirmation" : "Order not found"}
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell max-w-2xl">
          {order ? (
            <OrderSuccessView initialOrder={mapOrder(order)} orderId={orderId} orderKey={orderKey} />
          ) : (
            <div className="card p-6 text-center sm:p-10">
              <p className="text-lg font-bold text-navy-900">We couldn&apos;t find this order</p>
              <p className="mt-2 text-sm text-steel-600">
                This confirmation link looks invalid or has expired. If you just completed a payment, check your email for a receipt, or contact our sales team.
              </p>
              <Link href="/checkout" className="btn-primary mt-5 inline-flex">
                Back to checkout
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function mapOrder(order: NonNullable<Awaited<ReturnType<typeof getWooCommerceOrderIfKeyMatches>>>) {
  return {
    number: order.number,
    status: order.status,
    total: order.total,
    currency: order.currency,
    paymentUrl: order.payment_url,
    items: order.line_items.map((item) => ({ name: item.name, quantity: item.quantity, total: item.total })),
  };
}
