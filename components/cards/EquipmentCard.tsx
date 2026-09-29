"use client";

import Image from "next/image";
import Link from "next/link";
import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { ConditionPill, ListingBadges, StatusPill } from "@/components/ui/Badge";
import { useToast } from "@/components/providers/ToastProvider";
import type { Equipment } from "@/lib/types";
import { formatNumber, formatPrice, relativeAdded } from "@/lib/utils";

export function EquipmentCard({ unit }: { unit: Equipment }) {
  const { openEnquiry } = useEnquiry();
  const { toast } = useToast();

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-shadow hover:shadow-lift">
      <Link href={`/equipment/${unit.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-navy-50">
        <Image
          src={unit.images[0]}
          alt={unit.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <ListingBadges badges={["EQUIPMENT", "CLEARANCE"]} className="absolute left-3 top-3" />
        <span className="absolute bottom-3 left-3 rounded-sm bg-navy-950/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
          {unit.reference}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
            {unit.manufacturer}
          </p>
          <StatusPill status={unit.status} />
        </div>

        <h3 className="mt-2 text-[17px] font-bold leading-snug text-navy-900">
          <Link href={`/equipment/${unit.slug}`} className="hover:text-brand-700">
            {unit.name}
          </Link>
        </h3>

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          <div>
            <dt className="text-steel-500">Model</dt>
            <dd className="font-semibold text-navy-800">{unit.model}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Serial number</dt>
            <dd className="truncate font-semibold text-navy-800" title={unit.serial_number}>
              {unit.serial_number}
            </dd>
          </div>
          <div>
            <dt className="text-steel-500">Year</dt>
            <dd className="font-semibold text-navy-800">{unit.year}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Operating hours</dt>
            <dd className="font-semibold text-navy-800">{formatNumber(unit.operating_hours)} h</dd>
          </div>
          <div>
            <dt className="text-steel-500">Location</dt>
            <dd className="font-semibold text-navy-800">{unit.location}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Added</dt>
            <dd className="font-semibold text-navy-800">{relativeAdded(unit.added_date)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap gap-2">
          <ConditionPill condition={unit.condition} />
          <span className="text-[11px] text-steel-500">{unit.capacity}</span>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between border-t border-navy-100 pt-3">
            <div>
              <p className="text-xl font-extrabold text-navy-900">{formatPrice(unit.price)}</p>
              <p className="text-[11px] text-steel-500">
                {unit.price !== null ? "AED" : "Enquire for pricing"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openEnquiry({ mode: "equipment", equipment: unit })}
              className="btn-primary btn-sm flex-1"
            >
              Enquire About This Unit
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(unit.serial_number).catch(() => undefined);
                toast(`Serial ${unit.serial_number} copied`);
              }}
              className="btn-outline btn-sm"
            >
              Copy Serial
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
