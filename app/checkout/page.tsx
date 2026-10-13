import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getWooCommerceCountries } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout clearance stock from Engineerparts.com. Add your details, provide a delivery address, and review your order before payment.",
};

export default async function CheckoutPage() {
  const countries = await getWooCommerceCountries();
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        eyebrow="Checkout"
        title="Complete your clearance order"
        description="Add your details, provide a delivery address, and review your order before secure payment."
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
