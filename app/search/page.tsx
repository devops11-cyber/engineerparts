import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { SearchResults } from "@/components/search/SearchResults";
import { getProducts } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Engineerparts.com clearance stock by SKU, part number, brand, model, product name or lot number.",
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = (searchParams.q ?? "").trim();
  const products = await getProducts();

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Search" }]}
        eyebrow="Search"
        title={query ? `Results for "${query}"` : "Search clearance stock"}
        description="Exact part-number matches are listed first. Search covers SKU, part number, manufacturer, brand, model, product name, description, specifications, category and lot number."
        tone="light"
      />
      <section className="section pt-8">
        <div className="shell">
          <SearchResults initialQuery={query} products={products} />
        </div>
      </section>
    </>
  );
}
