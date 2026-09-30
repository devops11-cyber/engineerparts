"use client";

import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadCsv } from "@/lib/download";
import { track } from "@/lib/analytics";
import type { Lot } from "@/lib/types";
import {
  absoluteUrl,
  formatNumber,
  formatPrice,
  lotWhatsAppMessage,
  whatsappLink,
} from "@/lib/utils";

export function LotActions({ lot }: { lot: Lot }) {
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
      { reference: lot.lot_reference, source: "lot_page" },
    );
    toast(`${lot.lot_reference} inventory list downloaded`);
  }

  function onWhatsApp() {
    track("whatsapp_click", { source: "Lot page", lot_reference: lot.lot_reference });
    window.open(
      whatsappLink(
        lotWhatsAppMessage({
          name: lot.name,
          lot_reference: lot.lot_reference,
          url: absoluteUrl(`/lots/${lot.lot_reference}`),
        }),
      ),
      "_blank",
      "noopener",
    );
  }

  return (
    <div className="rounded-card border border-navy-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy-100 pb-4">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-navy-900">{formatPrice(lot.price)}</p>
          <p className="mt-1 text-xs text-steel-500">Collection or freight quoted separately.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">Approx. units</p>
          <p className="text-lg font-extrabold text-navy-900">{formatNumber(lot.total_quantity)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openEnquiry({ mode: "lot", lot })}
          className="btn-primary sm:col-span-2"
        >
          Enquire for Whole Lot
        </button>
        <button type="button" onClick={onDownload} className="btn-outline">
          Download Lot List
        </button>
        <button
          type="button"
          onClick={onWhatsApp}
          className="btn border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 sm:col-span-2"
        >
          WhatsApp about this lot
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-steel-500">
        Quantities are approximate totals from the warehouse count and will be confirmed before
        collection or dispatch.
      </p>
    </div>
  );
}
