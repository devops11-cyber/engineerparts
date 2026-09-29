import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ConditionPill, ListingBadges, StatusPill } from "@/components/ui/Badge";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SpecTable } from "@/components/product/SpecTable";
import { DocumentList } from "@/components/product/DocumentList";
import { EquipmentActions } from "@/components/equipment/EquipmentActions";
import { TrackView } from "@/components/TrackView";
import { equipment, getEquipment } from "@/lib/data/equipment";
import { formatDate, formatNumber } from "@/lib/utils";

export function generateStaticParams() {
  return equipment.map((unit) => ({ item: unit.slug }));
}

export function generateMetadata({ params }: { params: { item: string } }): Metadata {
  const unit = getEquipment(params.item);
  if (!unit) return { title: "Equipment not found" };
  return {
    title: `${unit.name} - ${unit.reference}`,
    description: `${unit.manufacturer} ${unit.model}, ${unit.year}, ${formatNumber(unit.operating_hours)} hours. ${unit.condition}. Located at ${unit.location}.`,
  };
}

export default function EquipmentDetailPage({ params }: { params: { item: string } }) {
  const unit = getEquipment(params.item);
  if (!unit) notFound();

  const others = equipment.filter((e) => e.id !== unit.id).slice(0, 3);

  return (
    <>
      <TrackView
        event="equipment_view"
        payload={{ reference: unit.reference, name: unit.name, status: unit.status }}
      />

      <section className="border-b border-navy-100 bg-navy-50/60">
        <div className="shell py-4">
          <Breadcrumbs
            items={[
              { label: "Equipment", href: "/equipment" },
              { label: unit.reference },
            ]}
          />
        </div>
      </section>

      <section className="section pt-8">
        <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <ProductGallery images={unit.images} alt={unit.name} label="Actual Unit Photos" />
          </div>
          <div>
            <ListingBadges badges={["EQUIPMENT", "CLEARANCE"]} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
                {unit.manufacturer}
              </span>
              <StatusPill status={unit.status} />
              <ConditionPill condition={unit.condition} />
            </div>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">
              {unit.name}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-steel-600">{unit.description}</p>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-navy-100 bg-white p-4 text-xs shadow-card">
              <Meta label="Equipment reference" value={unit.reference} />
              <Meta label="Serial number" value={unit.serial_number} />
              <Meta label="Manufacturer" value={unit.manufacturer} />
              <Meta label="Model" value={unit.model} />
              <Meta label="Year" value={String(unit.year)} />
              <Meta label="Operating hours" value={`${formatNumber(unit.operating_hours)} h`} />
              <Meta label="Capacity" value={unit.capacity} />
              <Meta label="Quantity" value={`${formatNumber(unit.quantity)} unit(s)`} />
            </dl>

            <div className="mt-5">
              <EquipmentActions unit={unit} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-navy-100 bg-navy-50/40">
        <div className="shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Condition</h2>
              <div className="mt-3 rounded-card border border-navy-100 bg-white p-4">
                <ConditionPill condition={unit.condition} />
                <p className="mt-3 text-sm leading-relaxed text-steel-700">{unit.condition_notes}</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Technical specifications</h2>
              <div className="mt-3">
                <SpecTable specs={unit.specifications} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Inspection information</h2>
              <div className="mt-3 rounded-card border border-navy-100 bg-white p-4 text-sm leading-relaxed text-steel-700">
                {unit.inspection}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Documents</h2>
              <div className="mt-3">
                <DocumentList documents={unit.documents} reference={unit.reference} source="equipment_page" />
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-card border border-navy-100 bg-white p-5 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">
                Asset record
              </h2>
              <dl className="mt-4 divide-y divide-navy-100 text-sm">
                {[
                  ["Location", unit.location],
                  ["Availability", unit.status],
                  ["Quantity", `${formatNumber(unit.quantity)} unit(s)`],
                  ["Listed", formatDate(unit.added_date)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-steel-500">{label}</dt>
                    <dd className="text-right font-semibold text-navy-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-card border border-navy-100 bg-navy-50 p-5">
              <p className="text-sm font-semibold text-navy-900">Clearance equipment only</p>
              <p className="mt-1 text-xs leading-relaxed text-steel-600">
                Units listed here are used, surplus or decommissioned assets. New catalogue equipment
                is never listed on Engineerparts.com.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="More equipment"
            title="Other units released to clearance"
            action={{ label: "All equipment", href: "/equipment" }}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <Link
                key={item.id}
                href={`/equipment/${item.slug}`}
                className="group flex items-center gap-4 rounded-card border border-navy-100 bg-white p-4 shadow-card transition-shadow hover:shadow-lift"
              >
                <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded border border-navy-100 bg-navy-50">
                  <Image src={item.images[0]} alt="" fill sizes="80px" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    {item.reference}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-navy-900 group-hover:text-brand-700">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-steel-500">
                    {item.year} &middot; {formatNumber(item.operating_hours)} h &middot; {item.condition}
                  </span>
                </span>
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
