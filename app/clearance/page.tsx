import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ClearanceBrowser } from "@/components/clearance/ClearanceBrowser";
import { TrackView } from "@/components/TrackView";
import { brandsFromProducts } from "@/lib/data/brands";
import { buildFacets } from "@/lib/facets";
import { formatNumber } from "@/lib/utils";
import { getProducts } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Clearance Stock",
  description:
    "Browse products from the live Engineerparts WooCommerce catalogue. Filter by brand, category, condition, price, quantity and location.",
};

export default async function ClearancePage() {
  const products = await getProducts();
  const brands = brandsFromProducts(products);
  const categoryCount = new Set(products.map((product) => product.category)).size;
  const facets = buildFacets(products);

  return (
    <>
      <TrackView event="category_view" payload={{ category: "all-clearance", count: products.length }} />
      <PageHero
        breadcrumbs={[{ label: "Clearance Stock" }]}
        eyebrow="Clearance stock"
        title="Industrial product catalogue"
        description="Listings, prices, availability and product details are loaded from WooCommerce."
      >
        <dl className="grid grid-cols-3 gap-3">
          {[
            [formatNumber(products.length), "Listings"],
            [String(categoryCount), "Categories"],
            [String(brands.length), "Brands"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-md border border-white/15 bg-white/5 px-4 py-3 text-center">
              <dt className="text-lg font-extrabold text-white">{value}</dt>
              <dd className="text-[11px] font-semibold uppercase tracking-wide text-steel-400">{label}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <section className="section">
        <div className="shell">
          <ClearanceBrowser items={products} facets={facets} />
        </div>
      </section>

    </>
  );
}
