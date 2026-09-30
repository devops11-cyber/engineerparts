"use client";

import Image from "next/image";
import Link from "next/link";
import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConditionPill, ListingBadges, StatusPill } from "@/components/ui/Badge";
import type { Lot } from "@/lib/types";
import { downloadCsv } from "@/lib/download";
import { formatNumber, formatPrice, relativeAdded } from "@/lib/utils";

export function LotCard({ lot }: { lot: Lot }) {
  const { openEnquiry } = useEnquiry();
  const { toast } = useToast();

  function onDownload() {
    downloadCsv(
      `${lot.lot_reference}-inventory.csv`,
      lot.items.map((item) => ({
        Item: item.item,
        Brand: item.brand,
        "Part Number": item.part_number,
        Description: item.description,
        Quantity: item.quantity,
        Condition: item.condition,
      })),
      { reference: lot.lot_reference, source: "lot_card" },
    );
    toast(`${lot.lot_reference} inventory list downloaded`);
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-shadow hover:shadow-lift">
      <Link href={`/lots/${lot.lot_reference}`} className="relative block aspect-[16/10] overflow-hidden bg-navy-50">
        <Image
          src={lot.images[0]}
          alt={lot.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <ListingBadges badges={["LOT", ...(lot.status === "Available" ? (["CLEARANCE"] as const) : [])]} className="absolute left-3 top-3" />
        <span className="absolute bottom-3 left-3 rounded-sm bg-navy-950/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
          {lot.lot_reference}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Clearance lot</p>
          <StatusPill status={lot.status} />
        </div>

        <h3 className="mt-2 text-[17px] font-bold leading-snug text-navy-900">
          <Link href={`/lots/${lot.lot_reference}`} className="hover:text-brand-700">
            {lot.name}
          </Link>
        </h3>

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          <div>
            <dt className="text-steel-500">Approx. total units</dt>
            <dd className="font-semibold text-navy-800">{formatNumber(lot.total_quantity)}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Line items</dt>
            <dd className="font-semibold text-navy-800">{lot.items.length}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Warehouse</dt>
            <dd className="font-semibold text-navy-800">{lot.location}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Added</dt>
            <dd className="font-semibold text-navy-800">{relativeAdded(lot.added_date)}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <ConditionPill condition={lot.condition} />
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between border-t border-navy-100 pt-3">
            <div>
              <p className="text-xl font-extrabold text-navy-900">{formatPrice(lot.price)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openEnquiry({ mode: "lot", lot })}
              className="btn-primary btn-sm flex-1"
            >
              Enquire for Whole Lot
            </button>
            <button type="button" onClick={onDownload} className="btn-outline btn-sm">
              Download Lot List
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
