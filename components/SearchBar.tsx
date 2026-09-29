"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SuggestionGroups } from "@/lib/search";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";

interface SearchBarProps {
  variant?: "header" | "hero";
  placeholder?: string;
  initialQuery?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

export function SearchBar({
  variant = "header",
  placeholder = "Search by brand, part number, model or product...",
  initialQuery = "",
  autoFocus = false,
  onNavigate,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [groups, setGroups] = useState<SuggestionGroups | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setGroups(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (response.ok) setGroups((await response.json()) as SuggestionGroups);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setGroups(null);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const flat = useMemo(() => {
    if (!groups) return [] as { href: string; label: string }[];
    return [
      ...groups.products.map((p) => ({ href: p.href, label: p.title })),
      ...groups.lots.map((p) => ({ href: p.href, label: p.title })),
      ...groups.equipment.map((p) => ({ href: p.href, label: p.title })),
      ...groups.brands.map((b) => ({ href: `/brands/${b.slug}`, label: b.name })),
      ...groups.categories.map((c) => ({ href: `/clearance/${c.slug}`, label: c.name })),
    ];
  }, [groups]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function runSearch(value: string) {
    const term = value.trim();
    if (!term) return;
    if (groups && groups.products.length + groups.lots.length + groups.equipment.length === 0) {
      track("search_no_results", { query: term, source: variant });
    } else {
      track("search", { query: term, source: variant });
    }
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && flat[activeIndex]) {
        setOpen(false);
        onNavigate?.();
        router.push(flat[activeIndex].href);
        return;
      }
      runSearch(query);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }
    if (event.key === "Escape") setOpen(false);
  }

  const hero = variant === "hero";

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className={[
          "flex w-full items-stretch overflow-hidden rounded-md border bg-white",
          hero ? "border-transparent shadow-lift" : "border-navy-200",
        ].join(" ")}
      >
        <span className="flex items-center pl-4 text-steel-400" aria-hidden>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          aria-label="Search clearance stock"
          className={[
            "min-w-0 flex-1 bg-transparent px-3 text-navy-900 placeholder:text-steel-400 focus:outline-none",
            hero ? "py-4 text-base" : "py-3 text-sm",
          ].join(" ")}
        />
        <button
          type="submit"
          className={[
            "shrink-0 bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700",
            hero ? "px-6 text-sm" : "px-5 text-sm",
          ].join(" ")}
        >
          Search
        </button>
      </form>

      {open && groups ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] animate-fade-in overflow-y-auto rounded-md border border-navy-100 bg-white shadow-lift">
          {flat.length === 0 ? (
            <div className="px-5 py-6 text-sm text-steel-600">
              <p className="font-semibold text-navy-900">No matching clearance stock</p>
              <p className="mt-1">
                Try a different part number, or{" "}
                <Link href="/contact" className="text-brand-600 underline" onClick={() => setOpen(false)}>
                  send us an enquiry
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="divide-y divide-navy-50">
              {groups.products.length ? (
                <Group title="Clearance stock">
                  {groups.products.map((hit, index) => (
                    <Link
                      key={hit.id}
                      href={hit.href}
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                      }}
                      className={[
                        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-navy-50",
                        activeIndex === index ? "bg-navy-50" : "",
                      ].join(" ")}
                    >
                      <span className="relative h-12 w-14 shrink-0 overflow-hidden rounded border border-navy-100 bg-navy-50">
                        <Image src={hit.image} alt="" fill sizes="56px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-navy-900">{hit.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-steel-500">
                          {hit.brand} &middot; {hit.reference} &middot; {hit.condition}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-navy-900">{formatPrice(hit.price, hit.currency)}</span>
                        <span className="block text-[11px] text-steel-500">
                          {hit.quantity === null ? "Contact for quantity" : `${hit.quantity} available`}
                        </span>
                      </span>
                    </Link>
                  ))}
                </Group>
              ) : null}

              {groups.lots.length ? (
                <Group title="Clearance lots">
                  {groups.lots.map((hit) => (
                    <SuggestionRow key={hit.id} href={hit.href} image={hit.image} title={hit.title} meta={`${hit.reference} - ${hit.quantity} units`} price={formatPrice(hit.price)} onClick={() => setOpen(false)} />
                  ))}
                </Group>
              ) : null}

              {groups.equipment.length ? (
                <Group title="Equipment">
                  {groups.equipment.map((hit) => (
                    <SuggestionRow key={hit.id} href={hit.href} image={hit.image} title={hit.title} meta={`${hit.reference} - ${hit.condition}`} price={formatPrice(hit.price)} onClick={() => setOpen(false)} />
                  ))}
                </Group>
              ) : null}

              {groups.brands.length ? (
                <Group title="Brands">
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {groups.brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/brands/${brand.slug}`}
                        onClick={() => setOpen(false)}
                        className="chip"
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                </Group>
              ) : null}

              {groups.categories.length ? (
                <Group title="Categories">
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {groups.categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/clearance/${category.slug}`}
                        onClick={() => setOpen(false)}
                        className="chip"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </Group>
              ) : null}

              <button
                type="button"
                onClick={() => runSearch(query)}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-brand-700 transition-colors hover:bg-navy-50"
              >
                View all results for &ldquo;{query.trim()}&rdquo; &rarr;
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow px-4 pt-3 text-steel-400">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SuggestionRow({
  href,
  image,
  title,
  meta,
  price,
  onClick,
}: {
  href: string;
  image: string;
  title: string;
  meta: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-navy-50">
      <span className="relative h-12 w-14 shrink-0 overflow-hidden rounded border border-navy-100 bg-navy-50">
        <Image src={image} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-navy-900">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-steel-500">{meta}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-navy-900">{price}</span>
    </Link>
  );
}

export function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
