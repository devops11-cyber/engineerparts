import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="shell max-w-xl py-16 text-center">
        <p className="eyebrow text-brand-600">404</p>
        <h1 className="mt-3 text-3xl font-extrabold text-navy-900">Listing not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-steel-600">
          That page is not in the clearance warehouse. The item may have moved, or the link is out of
          date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/clearance" className="btn-primary">
            Browse clearance stock
          </Link>
          <Link href="/contact" className="btn-outline">
            Contact the desk
          </Link>
        </div>
      </div>
    </section>
  );
}
