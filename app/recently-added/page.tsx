import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { ProductCard } from "@/components/cards/ProductCard";
import { formatDate } from "@/lib/utils";
import { getProducts } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Recently Added",
  description:
    "Recently published products from the live Engineerparts WooCommerce catalogue.",
};

export default async function RecentlyAddedPage() {
  const products = await getProducts();
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.added_date).getTime() - new Date(a.added_date).getTime())
    .slice(0, 12);

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Recently Added" }]}
        eyebrow="Live catalogue"
        title="Recently added products"
        description="Products ordered by their WooCommerce publication date when that date is available."
      />

      <section className="section">
        <div className="shell">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Latest products</h2>
              <p className="mt-1 text-sm text-steel-600">Condition, quantity and CTA on every listing.</p>
            </div>
            <Link href="/clearance" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              All clearance &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentProducts.map((product) => (
              <div key={product.id} className="flex h-full flex-col">
                {product.added_date ? <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-steel-500">
                  Listed {formatDate(product.added_date)}
                </p> : null}
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
