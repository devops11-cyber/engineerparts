import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout clearance stock from Engineerparts.com. Customer details, delivery or collection, and order confirmation.",
};

export default function CheckoutPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        eyebrow="Checkout"
        title="Complete your clearance order"
        description="Customer and company details, delivery or collection. This is an order request — we will confirm stock before you pay."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell">
          <CheckoutForm />
        </div>
      </section>
    </>
  );
}
