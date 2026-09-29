"use client";

import { useEffect, useMemo } from "react";
import { ProductCard } from "@/components/cards/ProductCard";
import { LotCard } from "@/components/cards/LotCard";
import { EquipmentCard } from "@/components/cards/EquipmentCard";
import { SearchBar } from "@/components/SearchBar";
import { filterProducts, search } from "@/lib/search";
import { lots } from "@/lib/data/lots";
import { equipment } from "@/lib/data/equipment";
import { track } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function SearchResults({ initialQuery, products }: { initialQuery: string; products: Product[] }) {
  const query = initialQuery;
  const hits = useMemo(
    () => (query.trim() ? search(query, 60).filter((hit) => hit.kind !== "product") : []),
    [query],
  );

  const lotHits = hits.filter((h) => h.kind === "lot");
  const equipmentHits = hits.filter((h) => h.kind === "equipment");

  const productItems = useMemo(
    () => (query.trim() ? filterProducts(products, { q: query }).slice(0, 60) : []),
    [products, query],
  );
  const lotItems = lotHits
    .map((hit) => lots.find((l) => l.id === hit.id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));
  const equipmentItems = equipmentHits
    .map((hit) => equipment.find((e) => e.id === hit.id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    const resultCount = productItems.length + hits.length;
    if (resultCount === 0) track("search_no_results", { query: term, source: "search_page" });
    else track("search", { query: term, source: "search_page", results: resultCount });
  }, [query, hits.length, productItems.length]);

  const resultCount = productItems.length + hits.length;

  return (
    <div>
      <SearchBar variant="hero" initialQuery={query} />

      {!query.trim() ? (
        <p className="mt-8 text-sm text-steel-600">Enter a brand, SKU, part number, model or product name.</p>
      ) : resultCount === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-10 text-center">
          <p className="text-base font-bold text-navy-900">No matching clearance stock</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
            Try a different part number, or send an enquiry and we will look through warehouse stock
            that is not yet listed.
          </p>
          <a href="/contact" className="btn-navy btn-sm mt-5 inline-flex">
            Send an enquiry
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          <p className="text-sm text-steel-600">
            <span className="font-bold text-navy-900">{formatNumber(resultCount)}</span> matches
          </p>

          {productItems.length ? (
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Clearance stock</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {productItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : null}

          {lotItems.length ? (
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Clearance lots</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {lotItems.map((lot) => (
                  <LotCard key={lot.id} lot={lot} />
                ))}
              </div>
            </div>
          ) : null}

          {equipmentItems.length ? (
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Equipment</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {equipmentItems.map((unit) => (
                  <EquipmentCard key={unit.id} unit={unit} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
