import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Account",
  description: "Engineerparts.com customer account for clearance orders and enquiries.",
};

export default function AccountPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Account" }]}
        eyebrow="Account"
        title="Customer account"
        description="Orders and enquiries submitted here are stored locally in your browser."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/my-enquiries" className="card p-6 transition-shadow hover:shadow-lift">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Leads</p>
            <h2 className="mt-2 text-lg font-extrabold text-navy-900">My Enquiries</h2>
            <p className="mt-2 text-sm text-steel-600">
              Product enquiries, whole-lot requests and bulk deals submitted from this browser.
            </p>
          </Link>
          <Link href="/cart" className="card p-6 transition-shadow hover:shadow-lift">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Orders</p>
            <h2 className="mt-2 text-lg font-extrabold text-navy-900">Cart &amp; checkout</h2>
            <p className="mt-2 text-sm text-steel-600">
              Fixed-price clearance items ready to check out, with quantity capped at warehouse stock.
            </p>
          </Link>
          <Link href="/contact" className="card p-6 transition-shadow hover:shadow-lift">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Support</p>
            <h2 className="mt-2 text-lg font-extrabold text-navy-900">Clearance desk</h2>
            <p className="mt-2 text-sm text-steel-600">
              Trade accounts, collection appointments and document requests are handled by the desk.
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
