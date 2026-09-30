import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Engineerparts.com clearance desk. Product, lot and equipment enquiries and bulk requirements.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Contact" }]}
        eyebrow="Clearance desk"
        title="Talk to Engineerparts.com"
        description="Send a professional enquiry for a product, lot, equipment unit or bulk requirement. We respond during the next working day."
      />

      <section className="section">
        <div className="shell max-w-3xl">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
