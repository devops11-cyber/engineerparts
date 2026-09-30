import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ConditionPill, ListingBadges, StatusPill } from "@/components/ui/Badge";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { DocumentList } from "@/components/product/DocumentList";
import { SpecTable } from "@/components/product/SpecTable";
import { ProductCard } from "@/components/cards/ProductCard";
import { TrackView } from "@/components/TrackView";
import { getLotByReference } from "@/lib/data/lots";
import { brandSlug } from "@/lib/data/brands";
import { formatDate, formatNumber } from "@/lib/utils";
import { getProduct, getProducts } from "@/lib/woocommerce";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} - ${product.sku}`,
    description: `${product.condition !== "Not provided" ? `${product.condition}. ` : ""}${product.quantity_available === null ? "Contact for quantity" : `${formatNumber(product.quantity_available)} units available`}. Clearance stock from Engineerparts.com.`,
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const products = await getProducts();
  const product = products.find((item) => item.slug === params.slug);
  if (!product) notFound();

  const lot = getLotByReference(product.lot_id);
  const related = products
    .filter(
      (item) =>
        item.id !== product.id &&
        item.status !== "Sold" &&
        (item.category === product.category || item.brand === product.brand),
    )
    .slice(0, 4);
  const similar = products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.status !== "Sold" &&
        p.category === product.category,
    )
    .slice(0, 4);

  const stockRows = [
    ["Status", product.status],
    ["Quantity available", product.quantity_available === null ? "Contact for quantity" : `${formatNumber(product.quantity_available)} units`],
    ["Warehouse", product.warehouse_location],
    ["Dispatch", product.lead_time],
    ["Listed", product.added_date ? formatDate(product.added_date) : "Not provided"],
  ].filter(([, value]) => value !== "Not provided");

  return (
    <>
      <TrackView
        event="product_view"
        payload={{ sku: product.sku, name: product.name, price: product.price, status: product.status }}
      />

      <section className="border-b border-navy-100 bg-navy-50/60">
        <div className="shell py-4">
          <Breadcrumbs
            items={[
              { label: "Clearance Stock", href: "/clearance" },
              { label: product.sku },
            ]}
          />
        </div>
      </section>

      <section className="section pt-8">
        <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <ProductGallery images={product.images} alt={product.name} />
          </div>

          <div>
            <ListingBadges badges={product.badges} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                href={`/brands/${brandSlug(product.brand)}`}
                className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700 hover:text-brand-500"
              >
                {product.brand}
              </Link>
              <StatusPill status={product.status} />
              {product.condition !== "Not provided" ? <ConditionPill condition={product.condition} /> : null}
            </div>

            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">
              {product.name}
            </h1>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-navy-100 bg-white p-4 text-xs shadow-card">
              <Meta label="SKU" value={product.sku} />
              <Meta label="Manufacturer part number" value={product.part_number} />
              <Meta label="Model" value={product.model} />
              <Meta label="Manufacturer" value={product.manufacturer} />
              <Meta label="Category" value={product.subcategory} />
              <Meta label="Subcategory" value={product.subcategory} />
            </dl>

            <div className="mt-5">
              <ProductActions product={product} />
            </div>

            {lot ? (
              <div className="mt-5 rounded-card border border-brand-200 bg-brand-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-800">
                  Part of clearance lot
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-900">
                  {lot.lot_reference} &middot; {lot.name}
                </p>
                <p className="mt-1 text-xs text-steel-600">
                  {formatNumber(lot.total_quantity)} units across {lot.items.length} line items.
                </p>
                <Link href={`/lots/${lot.lot_reference}`} className="btn-outline btn-sm mt-3">
                  View whole lot
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-t border-navy-100 bg-navy-50/40">
        <div className="shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Description</h2>
              <p className="mt-3 text-sm leading-relaxed text-steel-700">{product.description}</p>
            </div>

            {product.condition !== "Not provided" || product.condition_notes !== "Not provided" ? (
              <div>
                <h2 className="text-lg font-extrabold text-navy-900">Condition notes</h2>
                <div className="mt-3 rounded-card border border-navy-100 bg-white p-4">
                  {product.condition !== "Not provided" ? <ConditionPill condition={product.condition} /> : null}
                  {product.condition_notes !== "Not provided" ? (
                    <p className="mt-3 text-sm leading-relaxed text-steel-700">{product.condition_notes}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Specifications</h2>
              <div className="mt-3">
                <SpecTable specs={product.specifications} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Documents</h2>
              <div className="mt-3">
                <DocumentList
                  documents={product.documents}
                  reference={product.sku}
                  source="product_page"
                />
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-card border border-navy-100 bg-white p-5 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">
                Stock information
              </h2>
              <dl className="mt-4 divide-y divide-navy-100 text-sm">
                {stockRows.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-steel-500">{label}</dt>
                    <dd className="text-right font-semibold text-navy-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t border-navy-100 pt-4 text-xs leading-relaxed text-steel-500">
                Product details are loaded from WooCommerce. Send an enquiry if information is missing.
              </p>
            </div>

            <div className="rounded-card border border-navy-100 bg-white p-5 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">
                Product notes
              </h2>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-steel-600">
                <li>Images and product details are supplied by WooCommerce.</li>
                <li>Quantity is shown only when stock management provides an exact value.</li>
                <li>Products without complete details can be submitted as enquiries.</li>
              </ul>
            </div>

          </aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow={product.status === "Sold" ? "Sold - similar available stock" : "Related clearance stock"}
            title={product.status === "Sold" ? "Similar units currently available" : "More from this category"}
            action={{ label: "View all clearance", href: "/clearance" }}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(product.status === "Sold" ? similar : related).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value || value === "Not provided") return null;
  return (
    <div className="min-w-0">
      <dt className="text-steel-500">{label}</dt>
      <dd className="truncate font-semibold text-navy-900" title={value}>
        {value}
      </dd>
    </div>
  );
}
