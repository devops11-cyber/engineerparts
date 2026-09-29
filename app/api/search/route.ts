import { NextResponse } from "next/server";
import { brandsFromProducts } from "@/lib/data/brands";
import { filterProducts, search, type SearchHit } from "@/lib/search";
import { getProducts } from "@/lib/woocommerce";

export const dynamic = "force-dynamic";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9./-]+/g, " ").trim();
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ products: [], lots: [], equipment: [], brands: [], categories: [] });
  }

  const allProducts = await getProducts();
  const products = filterProducts(allProducts, { q: query }).slice(0, 6);
  const brands = brandsFromProducts(allProducts);
  const staticHits = search(query, 24);
  const q = normalize(query);

  return NextResponse.json({
    products: products.map((product): SearchHit => ({
      kind: "product",
      id: product.id,
      title: product.name,
      subtitle: `${product.brand} - ${product.subcategory}`,
      brand: product.brand,
      reference: product.part_number,
      condition: product.condition,
      status: product.status,
      price: product.price,
      currency: product.currency,
      quantity: product.quantity_available,
      href: `/product/${product.slug}`,
      image: product.images[0],
      category: product.category,
      score: 200,
    })),
    lots: staticHits.filter((hit) => hit.kind === "lot").slice(0, 3),
    equipment: staticHits.filter((hit) => hit.kind === "equipment").slice(0, 3),
    brands: brands.filter((brand) => normalize(brand.name).includes(q)).slice(0, 4),
    categories: [],
  });
}