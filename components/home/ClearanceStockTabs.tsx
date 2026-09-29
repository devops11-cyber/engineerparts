"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/cards/ProductCard";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "latest", label: "Latest" },
  { id: "lowest", label: "Lowest Price" },
  { id: "bulk", label: "Bulk Lots" },
  { id: "equipment", label: "Equipment" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ClearanceStockTabs({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<TabId>("latest");

  const list = useMemo(() => {
    const available = products.filter((p) => p.status !== "Sold");
    switch (tab) {
      case "lowest":
        return [...available].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)).slice(0, 8);
      case "bulk":
        return available
          .filter((p) => p.listing_type === "Whole Lot" || p.category === "lots-bulk-clearance" || (p.quantity_available ?? 0) >= 200)
          .sort((a, b) => (b.quantity_available ?? -1) - (a.quantity_available ?? -1))
          .slice(0, 8);
      case "equipment":
        return available
          .filter((p) => p.category === "equipment" || p.badges.includes("EQUIPMENT"))
          .slice(0, 8);
      default:
        return [...available]
          .sort((a, b) => new Date(b.added_date).getTime() - new Date(a.added_date).getTime())
          .slice(0, 8);
    }
  }, [products, tab]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-navy-100">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              tab === item.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-steel-600 hover:text-navy-900",
            )}
          >
            {item.label}
          </button>
        ))}
        <Link
          href="/clearance"
          className="mb-2 ml-auto hidden text-sm font-semibold text-brand-700 hover:text-brand-500 sm:block"
        >
          View all clearance &rarr;
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Link href="/clearance" className="btn-outline">
          View all clearance stock
        </Link>
      </div>
    </div>
  );
}
