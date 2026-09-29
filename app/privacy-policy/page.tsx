import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Engineerparts.com handles enquiry, order and website data.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Privacy Policy" }]}
        eyebrow="Legal"
        title="Privacy Policy"
        description="Engineerparts.com enquiry and order details are used only to fulfil and respond to your request."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell prose-sm max-w-3xl space-y-6 text-sm leading-relaxed text-steel-700">
          <p>
            When you submit an enquiry, offer, bulk request or order, we collect your name, company,
            email, phone, country and the product, lot or equipment references you provide. This
            information is stored so the clearance desk can respond, confirm stock and arrange
            collection or freight.
          </p>
          <p>
            Analytics events such as product views, searches, add-to-cart, purchases, enquiries,
            offers, WhatsApp clicks and document downloads are recorded in a structured form for
            future reporting. They do not include payment card details.
          </p>
          <p>
            We do not sell personal data. Trade enquiries are used only to confirm stock, logistics
            and to respond to your request.
          </p>
          <p>
            To request a copy or deletion of your enquiry records, contact
            use the contact form and quote your lead or order reference.
          </p>
        </div>
      </section>
    </>
  );
}
