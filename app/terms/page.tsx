import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for Engineerparts.com.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Terms & Conditions" }]}
        eyebrow="Legal"
        title="Terms & Conditions"
        description="Review the terms that apply before placing an order or submitting an enquiry."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell max-w-3xl space-y-6 text-sm leading-relaxed text-steel-700">
          <p>Final commercial and legal terms have not been configured on this website.</p>
          <p>Contact Engineerparts.com to confirm pricing, availability, payment, tax, delivery, returns, and any product-specific terms before placing an order.</p>
        </div>
      </section>
    </>
  );
}
