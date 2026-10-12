import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Engineerparts.com and browse industrial products, spare parts, tools and clearance stock.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "About" }]}
        eyebrow="About Engineerparts.com"
        title="About Engineerparts.com"
        description="Industrial equipment, spare parts and tools for business buyers."
      />

      <section className="section">
        <div className="shell max-w-3xl">
          <div>
            <p className="eyebrow text-brand-600">Who we are</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy-900">
              Industrial products for business buyers
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-steel-700">
              Engineerparts.com helps businesses browse industrial equipment, spare parts, tools and engineering products, including available clearance stock.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-steel-700">
              Review the information published with each listing, buy eligible items online, or contact our team when you need more details before making a decision.
            </p>
          </div>
        </div>
      </section>

      <section className="section border-y border-navy-100 bg-navy-50/50">
        <div className="shell">
          <h2 className="text-2xl font-extrabold text-navy-900">What you can do here</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Browse products", "Explore available industrial products and clearance stock."],
              ["Search", "Find listings by name, brand, model, SKU or part number."],
              ["Review details", "Check the product information and specifications available on each listing."],
              ["Send enquiries", "Ask for information that is not available on a listing."],
            ].map(([title, copy]) => (
              <div key={title} className="card p-5">
                <h3 className="text-base font-bold text-navy-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold text-navy-900">How listings work</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-steel-700">
              <li>Product listings show available information, pricing and stock details.</li>
              <li>Stock quantity is shown when it is available for a listing.</li>
              <li>Condition, location and lead time are shown only when supplied.</li>
              <li>Products without enough information remain available for enquiry.</li>
            </ul>
          </div>
          <div className="rounded-card border border-navy-100 bg-white p-6 shadow-card">
            <h3 className="text-lg font-extrabold text-navy-900">Need more information?</h3>
            <p className="mt-3 text-sm leading-relaxed text-steel-700">
              Use the contact form or a product enquiry when a listing does not contain the details you need.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/clearance" className="btn-primary">
                Browse clearance
              </Link>
              <Link href="/contact" className="btn-outline">
                Contact the desk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
