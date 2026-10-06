import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getWooCommerceCountries } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout clearance stock from Engineerparts.com. Customer details, delivery or collection, and order confirmation.",
};

export default async function CheckoutPage() {
  const countries = await getWooCommerceCountries();
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        eyebrow="Checkout"
        title="Complete your clearance order"
        description="Enter your billing details and review the totals calculated by WooCommerce before placing your order."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell">
          <CheckoutForm countries={countries} />
        </div>
      </section>
    </>
  );
}
