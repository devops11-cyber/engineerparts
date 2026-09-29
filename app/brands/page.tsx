import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { BrandCard } from "@/components/cards/BrandCard";
import { TrackView } from "@/components/TrackView";
import { brandsFromProducts } from "@/lib/data/brands";
import { getProducts } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Brands",
  description: "Browse live WooCommerce products by brand.",
};

export default async function BrandsPage() {
  const products = await getProducts();
  const brands = brandsFromProducts(products);

  return (
    <>
      <TrackView event="brand_view" payload={{ view: "index", count: brands.length }} />
      <PageHero
        breadcrumbs={[{ label: "Brands" }]}
        eyebrow="Brands"
        title="Products by brand"
        description="Brands are derived from the products currently published in WooCommerce."
      />

      <section className="section">
        <div className="shell">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.map((brand) => (
              <BrandCard
                key={brand.slug}
                brand={brand}
                count={products.filter((p) => p.brand === brand.name).length}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
