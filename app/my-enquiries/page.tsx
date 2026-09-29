import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { EnquiryList } from "@/components/account/EnquiryList";

export const metadata: Metadata = {
  title: "My Enquiries",
  description: "Track product enquiries, offers and lot requests submitted to the Engineerparts.com clearance desk.",
};

export default function MyEnquiriesPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "My Enquiries" }]}
        eyebrow="My Enquiries"
        title="Enquiries and offers from this browser"
        description="Leads are stored locally and posted to /api/leads, structured for future CRM, email and database integration."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell">
          <EnquiryList />
        </div>
      </section>
    </>
  );
}
