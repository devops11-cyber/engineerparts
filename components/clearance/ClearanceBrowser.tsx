"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/cards/ProductCard";
import { filterProducts } from "@/lib/search";
import type { Product } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

interface Facets {
  brands: string[];
  manufacturers: string[];
  categories: { slug: string; name: string }[];
  subcategories: string[];
  conditions: string[];
  locations: string[];
  availability: string[];
  priceBounds: [number, number];
  quantityMax: number;
}

interface Filters {
  brands: string[];
  manufacturers: string[];
  categories: string[];
  subcategories: string[];
  conditions: string[];
  locations: string[];
  availability: string[];
  minPrice: string;
  maxPrice: string;
  minQuantity: string;
  spec: string;
}

const EMPTY_FILTERS: Filters = {
  brands: [],
  manufacturers: [],
  categories: [],
  subcategories: [],
  conditions: [],
  locations: [],
  availability: [],
  minPrice: "",
  maxPrice: "",
  minQuantity: "",
  spec: "",
};

const SORTS = [
  { id: "recent", label: "Recently Added" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "quantity", label: "Quantity Available" },
  { id: "az", label: "A - Z" },
  { id: "brand", label: "Brand A - Z" },
] as const;

export function ClearanceBrowser({
  items,
  facets,
  lockedCategory,
  syncCategoryFilter = true,
}: {
  items: Product[];
  facets: Facets;
  lockedCategory?: string;
  syncCategoryFilter?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("recent");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const activeCount = useMemo(() => {
    let count = 0;
    (
      [
        "brands",
        "manufacturers",
        "categories",
        "subcategories",
        "conditions",
        "locations",
        "availability",
      ] as const
    ).forEach((key) => {
      if (key === "categories" && !syncCategoryFilter) return;
      count += filters[key].length;
    });
    if (filters.minPrice) count += 1;
    if (filters.maxPrice) count += 1;
    if (filters.minQuantity) count += 1;
    if (filters.spec) count += 1;
    return count;
  }, [filters, syncCategoryFilter]);

  const results = useMemo(() => {
    return filterProducts(items, {
      q: query,
      brands: filters.brands,
      manufacturers: filters.manufacturers,
      categories: lockedCategory ? undefined : filters.categories,
      subcategories: filters.subcategories,
      conditions: filters.conditions,
      locations: filters.locations,
      availability: filters.availability,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      minQuantity: filters.minQuantity ? Number(filters.minQuantity) : undefined,
      spec: filters.spec,
      sort,
    });
  }, [items, query, filters, sort, lockedCategory]);

  function toggle<K extends keyof Filters>(key: K, value: string) {
    setFilters((current) => {
      const list = current[key] as unknown as string[];
      if (!Array.isArray(list)) return current;
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...current, [key]: next };
    });
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  }

  function removeValue(key: keyof Filters, value: string) {
    setFilters((current) => {
      const list = current[key] as unknown as string[];
      if (!Array.isArray(list)) return current;
      return { ...current, [key]: list.filter((v) => v !== value) };
    });
  }

  function clearField(key: keyof Filters) {
    setFilters((current) => ({ ...current, [key]: Array.isArray(current[key]) ? [] : "" }));
  }

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    const groups: { key: keyof Filters; title: string; label?: (value: string) => string }[] = [
      { key: "brands", title: "Brand" },
      { key: "manufacturers", title: "Manufacturer" },
      { key: "categories", title: "Category", label: (value) => facets.categories.find((c) => c.slug === value)?.name ?? value },
      { key: "subcategories", title: "Subcategory" },
      { key: "conditions", title: "Condition" },
      { key: "locations", title: "Location" },
      { key: "availability", title: "Availability" },
    ];

    groups.forEach((group) => {
      if (group.key === "categories" && !syncCategoryFilter) return;
      const list = filters[group.key];
      if (!Array.isArray(list)) return;
      list.forEach((value) => {
        chips.push({
          key: `${group.key}-${value}`,
          label: `${group.title}: ${group.label ? group.label(value) : value}`,
          onRemove: () => removeValue(group.key, value),
        });
      });
    });

    if (filters.minPrice) {
      chips.push({ key: "minPrice", label: `Min price: ${filters.minPrice}`, onRemove: () => clearField("minPrice") });
    }
    if (filters.maxPrice) {
      chips.push({ key: "maxPrice", label: `Max price: ${filters.maxPrice}`, onRemove: () => clearField("maxPrice") });
    }
    if (filters.minQuantity) {
      chips.push({ key: "minQuantity", label: `Min qty: ${filters.minQuantity}`, onRemove: () => clearField("minQuantity") });
    }
    if (filters.spec) {
      chips.push({ key: "spec", label: `Spec: ${filters.spec}`, onRemove: () => clearField("spec") });
    }
    return chips;
  }, [filters, facets.categories, syncCategoryFilter]);

  const sidebar = (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-3">
        <p className="text-sm font-bold uppercase tracking-wide text-navy-900">Filters</p>
        {activeCount > 0 ? (
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-brand-700 hover:text-brand-500">
            Clear all ({activeCount})
          </button>
        ) : null}
      </div>

      <FilterGroup title="Brand" defaultOpen>
        <CheckList options={facets.brands} selected={filters.brands} onToggle={(v) => toggle("brands", v)} />
      </FilterGroup>
      <FilterGroup title="Manufacturer">
        <CheckList options={facets.manufacturers} selected={filters.manufacturers} onToggle={(v) => toggle("manufacturers", v)} />
      </FilterGroup>
      {!lockedCategory ? (
        <FilterGroup title="Category">
          <CheckList
            options={facets.categories.map((c) => c.name)}
            values={facets.categories.map((c) => c.slug)}
            selected={filters.categories}
            onToggle={(v) => toggle("categories", v)}
          />
        </FilterGroup>
      ) : null}
      <FilterGroup title="Subcategory">
        <CheckList options={facets.subcategories} selected={filters.subcategories} onToggle={(v) => toggle("subcategories", v)} />
      </FilterGroup>
      <FilterGroup title="Condition" defaultOpen>
        <CheckList options={facets.conditions} selected={filters.conditions} onToggle={(v) => toggle("conditions", v)} />
      </FilterGroup>
      <FilterGroup title="Price" defaultOpen>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder={`Min ${facets.priceBounds[0]}`}
            value={filters.minPrice}
            onChange={(e) => setFilters((c) => ({ ...c, minPrice: e.target.value }))}
            className="field py-2 text-xs"
            aria-label="Minimum price"
          />
          <span className="text-steel-400">-</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={`Max ${facets.priceBounds[1]}`}
            value={filters.maxPrice}
            onChange={(e) => setFilters((c) => ({ ...c, maxPrice: e.target.value }))}
            className="field py-2 text-xs"
            aria-label="Maximum price"
          />
        </div>
      </FilterGroup>
      <FilterGroup title="Quantity">
        <input
          type="number"
          inputMode="numeric"
          placeholder={`Minimum quantity (max ${facets.quantityMax})`}
          value={filters.minQuantity}
          onChange={(e) => setFilters((c) => ({ ...c, minQuantity: e.target.value }))}
          className="field py-2 text-xs"
          aria-label="Minimum quantity"
        />
      </FilterGroup>
      <FilterGroup title="Location">
        <CheckList options={facets.locations} selected={filters.locations} onToggle={(v) => toggle("locations", v)} />
      </FilterGroup>
      <FilterGroup title="Availability">
        <CheckList options={facets.availability} selected={filters.availability} onToggle={(v) => toggle("availability", v)} />
      </FilterGroup>
      <FilterGroup title="Specifications">
        <input
          placeholder="e.g. DN50, 4-20 mA, IP65"
          value={filters.spec}
          onChange={(e) => setFilters((c) => ({ ...c, spec: e.target.value }))}
          className="field py-2 text-xs"
          aria-label="Specification keyword"
        />
        <p className="mt-2 text-[11px] text-steel-500">
          Searches specification labels and values across listings.
        </p>
      </FilterGroup>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2">{sidebar}</div>
      </aside>

      <div>
        <div className="flex flex-col gap-3 rounded-card border border-navy-100 bg-white p-3 shadow-card sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search within these results..."
              aria-label="Search within results"
              className="field pl-9"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as (typeof SORTS)[number]["id"])}
            aria-label="Sort results"
            className="field sm:w-52"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="btn-outline btn-sm w-full sm:w-auto lg:hidden"
            >
              Filters{activeCount ? ` (${activeCount})` : ""}
            </button>
            <div className="hidden items-center rounded-md border border-navy-200 sm:flex">
              <button
                type="button"
                onClick={() => setLayout("grid")}
                aria-label="Grid view"
                aria-pressed={layout === "grid"}
                className={cn("px-3 py-2.5", layout === "grid" ? "bg-navy-900 text-white" : "text-navy-700")}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setLayout("list")}
                aria-label="List view"
                aria-pressed={layout === "list"}
                className={cn("px-3 py-2.5", layout === "list" ? "bg-navy-900 text-white" : "text-navy-700")}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 5h16v3H4zM4 10.5h16v3H4zM4 16h16v3H4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-steel-600">
            <span className="font-bold text-navy-900">{formatNumber(results.length)}</span>{" "}
            {results.length === 1 ? "product" : "products"} found
          </p>
          <p className="text-xs text-steel-500">
            Product availability is loaded from WooCommerce
          </p>
        </div>

        {activeCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => chip.onRemove()}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 hover:border-signal-300 hover:text-signal-700"
              >
                {chip.label}
                <span aria-hidden>&times;</span>
              </button>
            ))}
          </div>
        ) : null}

        {results.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-6 text-center sm:p-10">
            <p className="text-base font-bold text-navy-900">No clearance stock matches those filters</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
              Try widening your filters or clearing the search. You can also send us an enquiry.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={clearAll} className="btn-navy btn-sm">
                Clear filters
              </button>
              <a href="/contact" className="btn-outline btn-sm">
                Send an enquiry
              </a>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mt-6 grid gap-5",
              layout === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
            )}
          >
            {results.map((product) => (
              <ProductCard key={product.id} product={product} layout={layout} />
            ))}
          </div>
        )}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-navy-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className="absolute inset-y-0 left-0 w-[92%] max-w-sm overflow-y-auto overscroll-contain bg-white p-4 shadow-lift sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-navy-900">Filters</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-navy-200"
                aria-label="Close filters"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {sidebar}
            <div className="sticky bottom-0 mt-4 border-t border-navy-100 bg-white pt-4">
              <button type="button" onClick={() => setMobileOpen(false)} className="btn-navy w-full">
                Show {formatNumber(results.length)} results
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
      className="group border-b border-navy-100 py-3"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy-900">
        {title}
        <svg
          className="h-3.5 w-3.5 text-steel-500 transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function CheckList({
  options,
  values,
  selected,
  onToggle,
}: {
  options: string[];
  values?: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = 7;
  const visible = expanded ? options : options.slice(0, limit);

  return (
    <div className="space-y-1.5">
      {visible.map((option, index) => {
        const value = values ? values[index] : option;
        const id = `${value}-${option}`.replace(/\s+/g, "-").toLowerCase();
        return (
          <label key={value} className="flex cursor-pointer items-center gap-2.5 text-xs text-navy-800">
            <input
              type="checkbox"
              id={id}
              checked={selected.includes(value)}
              onChange={() => onToggle(value)}
              className="h-4 w-4 shrink-0 rounded border-navy-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="leading-snug">{option}</span>
          </label>
        );
      })}
      {options.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="pt-1 text-xs font-semibold text-brand-700 hover:text-brand-500"
        >
          {expanded ? "Show fewer" : `Show ${options.length - limit} more`}
        </button>
      ) : null}
    </div>
  );
}
