import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BrandCard } from "@/components/cards/BrandCard";
import { ClearanceStockTabs } from "@/components/home/ClearanceStockTabs";
import { BulkDealSection } from "@/components/home/BulkDealSection";
import { ClearanceAlerts } from "@/components/home/ClearanceAlerts";
import { brandsFromProducts } from "@/lib/data/brands";
import { img, photo } from "@/lib/images";
import { formatNumber } from "@/lib/utils";
import { getProducts } from "@/lib/woocommerce";

function countByBrand(products: Awaited<ReturnType<typeof getProducts>>, name: string) {
  return products.filter((p) => p.brand === name).length;
}

const WHY = [
  {
    title: "Live product data",
    copy: "Listings, prices and availability are loaded from WooCommerce.",
    icon: (
      <path d="M3 9.5 12 4l9 5.5v9L12 21l-9-2.5v-9Z M3 9.5 12 15m0 0 9-5.5M12 15v6" />
    ),
  },
  {
    title: "Product details",
    copy: "Each listing presents the details supplied in the product catalogue.",
    icon: <path d="M12 3v18m4.5-12.5C16.5 6.5 14.5 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3c-2.5 0-4.5-.5-4.5-2.5" />,
  },
  {
    title: "Buy or enquire",
    copy: "Add fixed-price items straight to the cart, or send an enquiry about anything without a published price.",
    icon: <path d="M4 6h2l2.2 10.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L21 9H6" />,
  },
  {
    title: "Direct enquiries",
    copy: "Ask about a product when pricing, quantity or other details are not published.",
    icon: <path d="M12 21c5-2 8-6 8-11a12 12 0 0 0-8-3 12 12 0 0 0-8 3c0 5 3 9 8 11Zm0-11v8m0 0-3-3m3 3 3-3" />,
  },
];

export default async function HomePage() {
  const products = await getProducts();
  const brands = brandsFromProducts(products);
  const categoryCount = new Set(products.map((product) => product.category)).size;
  const inventoryStats = [
    [formatNumber(products.length), "Listings"],
    [formatNumber(brands.length), "Brands"],
    [formatNumber(categoryCount), "Categories"],
  ];

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="shell grid grid-cols-[minmax(0,1fr)] items-stretch gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-16">
          <div className="min-w-0 flex flex-col justify-center">
            <p className="eyebrow text-brand-600">Engineerparts.com &middot; Product catalogue</p>
            <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tight text-navy-900 sm:text-5xl lg:text-[54px]">
              Industrial products.
              <br />
              Live catalogue.
              <br />
              <span className="text-brand-600">Ready to browse.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-steel-600">
              Browse products loaded directly from WooCommerce. Buy eligible items online or send an enquiry.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/clearance" className="btn-primary">
                Browse Clearance Stock
              </Link>
            </div>

            <div className="mt-8">
              <SearchBar
                variant="hero"
                placeholder="Search by brand, part number, model or product..."
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-steel-400">
                  Popular
                </span>
                {brands.slice(0, 6).map((brand) => (
                  <Link key={brand.slug} href={`/search?q=${encodeURIComponent(brand.name)}`} className="chip">
                    {brand.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-card border border-navy-100 bg-navy-900 lg:min-h-[520px]">
            <Image
              src={img(photo.warehouseAisle, 1400, 1600)}
              alt="Industrial products"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {inventoryStats.map(([value, label]) => (
                  <div key={label} className="rounded-md border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
                    <p className="text-lg font-extrabold text-white sm:text-xl">{value}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-steel-300">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
                Live product catalogue
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-y border-navy-100 bg-navy-50/50">
        <div className="shell">
          <SectionHeading
            eyebrow="Live catalogue"
            title="Products from WooCommerce"
            description="Product details, images, pricing and availability are shown when provided by WooCommerce."
            action={{ label: "Browse all", href: "/clearance" }}
          />
          <div className="mt-8">
            <ClearanceStockTabs products={products} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Browse by brand"
            title="Products by manufacturer"
            description="Brand pages are generated from the products currently available in WooCommerce."
            action={{ label: "All brands", href: "/brands" }}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.slice(0, 8).map((brand) => (
              <BrandCard key={brand.slug} brand={brand} count={countByBrand(products, brand.name)} />
            ))}
          </div>
        </div>
      </section>

      <section className="section border-y border-navy-100 bg-navy-50/50">
        <div className="shell">
          <SectionHeading
            eyebrow="Why Engineerparts?"
            title="A simpler way to browse"
            description="Search the live catalogue, review available details, and enquire when you need more information."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((item) => (
              <div key={item.title} className="card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-600/10 text-brand-700">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {item.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-bold text-navy-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-950">
        <div className="shell py-16 lg:py-20">
          <BulkDealSection />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <ClearanceAlerts />
          <p className="mt-6 text-xs text-steel-500">
            {formatNumber(products.length)} live product listings are currently loaded from WooCommerce.
          </p>
        </div>
      </section>
    </>
  );
}
