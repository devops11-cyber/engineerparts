import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { CONTACT_EMAIL, CONTACT_PHONE, WHATSAPP_NUMBER, whatsappLink } from "@/lib/utils";

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
          <div className="mb-6 rounded-card border border-navy-100 bg-white p-5 shadow-card">
            <h2 className="font-bold text-navy-900">Contact options</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-700">
              {CONTACT_EMAIL ? <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : null}
              {CONTACT_PHONE ? <a className="underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a> : null}
              {WHATSAPP_NUMBER ? <a className="underline" href={whatsappLink("Hello Engineerparts.com")} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
              {!CONTACT_EMAIL && !CONTACT_PHONE && !WHATSAPP_NUMBER ? <span className="text-steel-600">Use the enquiry form below to reach our team.</span> : null}
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
