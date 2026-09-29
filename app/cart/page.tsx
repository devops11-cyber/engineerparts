import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review clearance items in your cart. Quantities cannot exceed actual available stock.",
};

export default function CartPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Cart" }]}
        eyebrow="Cart"
        title="Your clearance cart"
        description="Fixed-price clearance products only. Quantities cannot exceed the available warehouse count."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell">
          <CartView />
        </div>
      </section>
    </>
  );
}
