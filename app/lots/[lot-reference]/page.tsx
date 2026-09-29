import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ConditionPill, ListingBadges, StatusPill } from "@/components/ui/Badge";
import { ProductGallery } from "@/components/product/ProductGallery";
import { LotActions } from "@/components/lots/LotActions";
import { TrackView } from "@/components/TrackView";
import { lots, getLot } from "@/lib/data/lots";
import { ProductCard } from "@/components/cards/ProductCard";
import { formatDate, formatNumber, formatPrice } from "@/lib/utils";
import { getProducts } from "@/lib/woocommerce";

export function generateStaticParams() {
  return lots.map((lot) => ({ "lot-reference": lot.lot_reference }));
}

export function generateMetadata({ params }: { params: { "lot-reference": string } }): Metadata {
  const lot = getLot(params["lot-reference"]);
  if (!lot) return { title: "Lot not found" };
  return {
    title: `${lot.lot_reference} - ${lot.name}`,
    description: `${formatNumber(lot.total_quantity)} units across ${lot.items.length} line items. ${lot.condition}. Located at ${lot.location}.`,
  };
}

export default async function LotDetailPage({ params }: { params: { "lot-reference": string } }) {
  const lot = getLot(params["lot-reference"]);
  if (!lot) notFound();

  const products = await getProducts();
  const relatedProducts = products.filter((p) => p.lot_id === lot.id).slice(0, 4);
  const others = lots.filter((l) => l.id !== lot.id).slice(0, 3);

  return (
    <>
      <TrackView
        event="lot_view"
        payload={{ lot_reference: lot.lot_reference, name: lot.name, status: lot.status }}
      />

      <section className="border-b border-navy-100 bg-navy-50/60">
        <div className="shell py-4">
          <Breadcrumbs items={[{ label: "Clearance Lots", href: "/lots" }, { label: lot.lot_reference }]} />
        </div>
      </section>

      <section className="section pt-8">
        <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <ProductGallery images={lot.images} alt={lot.name} label="Lot Photos" />
          </div>
          <div>
            <ListingBadges badges={["LOT", "CLEARANCE"]} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
                {lot.lot_reference}
              </span>
              <StatusPill status={lot.status} />
              <ConditionPill condition={lot.condition} />
            </div>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">{lot.name}</h1>
            <p className="mt-3 text-sm leading-relaxed text-steel-600">{lot.description}</p>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-navy-100 bg-white p-4 text-xs shadow-card">
              <Meta label="Lot reference" value={lot.lot_reference} />
              <Meta label="Warehouse" value={lot.location} />
              <Meta label="Approx. total units" value={formatNumber(lot.total_quantity)} />
              <Meta label="Line items" value={String(lot.items.length)} />
              <Meta label="Condition" value={lot.condition} />
              <Meta label="Listed" value={formatDate(lot.added_date)} />
            </dl>

            <div className="mt-5">
              <LotActions lot={lot} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-navy-100 bg-navy-50/40">
        <div className="shell py-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Inventory list</h2>
              <p className="mt-1 text-sm text-steel-600">
                Line items, part numbers, quantities and condition as recorded at the warehouse.
              </p>
            </div>
            <p className="text-sm font-semibold text-navy-800">
              Whole lot listed at {formatPrice(lot.price)}
            </p>
          </div>

          <div className="mt-6 overflow-x-auto rounded-card border border-navy-100 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-navy-900 text-left text-[11px] font-bold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Part Number</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {lot.items.map((item) => (
                  <tr key={`${item.item}-${item.part_number}`} className="even:bg-navy-50/50">
                    <td className="px-4 py-3 font-semibold text-navy-900">{item.item}</td>
                    <td className="px-4 py-3 text-navy-800">{item.brand}</td>
                    <td className="px-4 py-3 font-mono text-xs text-navy-800">{item.part_number}</td>
                    <td className="px-4 py-3 text-steel-700">{item.description}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-900">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-navy-800">{item.condition}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-navy-200 bg-navy-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-navy-700">
                    Approximate total units
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-navy-900">
                    {formatNumber(lot.total_quantity)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {relatedProducts.length ? (
        <section className="section">
          <div className="shell">
            <SectionHeading
              eyebrow="Related listings"
              title="Items from this lot also listed individually"
              action={{ label: "All clearance", href: "/clearance" }}
            />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section border-t border-navy-100 bg-navy-50/40">
        <div className="shell">
          <SectionHeading
            eyebrow="More lots"
            title="Other warehouse lots currently available"
            action={{ label: "All lots", href: "/lots" }}
          />
          <div className="mt-6 flex flex-col gap-3">
            {others.map((item) => (
              <Link
                key={item.id}
                href={`/lots/${item.lot_reference}`}
                className="flex flex-col justify-between gap-3 rounded-card border border-navy-100 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    {item.lot_reference}
                  </p>
                  <p className="mt-1 font-semibold text-navy-900">{item.name}</p>
                </div>
                <p className="text-sm text-steel-600">
                  {formatNumber(item.total_quantity)} units &middot; {item.items.length} lines &middot;{" "}
                  {formatPrice(item.price)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-steel-500">{label}</dt>
      <dd className="truncate font-semibold text-navy-900" title={value}>
        {value}
      </dd>
    </div>
  );
}
