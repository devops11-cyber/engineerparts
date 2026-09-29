import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { ProductCard } from "@/components/cards/ProductCard";
import { TrackView } from "@/components/TrackView";
import { getBrand, brandSlug } from "@/lib/data/brands";
import { formatNumber } from "@/lib/utils";
import { getProducts } from "@/lib/woocommerce";

export async function generateMetadata({ params }: { params: { brand: string } }): Promise<Metadata> {
  const products = await getProducts();
  const brand = getBrand(products, params.brand);
  if (!brand) return { title: "Brand not found" };
  return {
    title: `${brand.name} clearance stock`,
    description: brand.description,
  };
}

export default async function BrandPage({ params }: { params: { brand: string } }) {
  const products = await getProducts();
  const brand = getBrand(products, params.brand);
  if (!brand) notFound();

  const items = products.filter(
    (p) => brandSlug(p.brand) === brand.slug || p.brand === brand.name || p.manufacturer.toLowerCase().includes(brand.name.toLowerCase()),
  );

  return (
    <>
      <TrackView event="brand_view" payload={{ brand: brand.slug, count: items.length }} />
      <PageHero
        breadcrumbs={[{ label: "Brands", href: "/brands" }, { label: brand.name }]}
        eyebrow="Brand clearance"
        title={brand.name}
        description={brand.description}
      >
        <dl>
          <div className="rounded-md border border-white/15 bg-white/5 px-4 py-3">
            <dt className="text-lg font-extrabold text-white">{formatNumber(items.length)}</dt>
            <dd className="text-[11px] font-semibold uppercase tracking-wide text-steel-400">Listings</dd>
          </div>
        </dl>
      </PageHero>

      <section className="section">
        <div className="shell">
          <div className="rounded-card border border-navy-100 bg-navy-50/60 p-5">
            <p className="text-sm font-semibold text-navy-900">
              {brand.name} appears on this site because we hold surplus, aged or discontinued stock.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-steel-600">
              Engineerparts.com does not claim an official distribution relationship with {brand.name}.
              Brand names appear because they are on the physical surplus items we hold.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {brand.sectors.map((sector) => (
                <span key={sector} className="chip">
                  {sector}
                </span>
              ))}
            </div>
          </div>

          {items.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-10 text-center">
              <p className="text-base font-bold text-navy-900">No {brand.name} product listings at the moment</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
                Stock rotates. Send an enquiry and we will check warehouse holdings not yet listed.
              </p>
              <Link href="/contact" className="btn-navy btn-sm mt-5 inline-flex">
                Send an enquiry
              </Link>
            </div>
          )}

          <div className="mt-10">
            <Link href="/brands" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              &larr; All brands
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
