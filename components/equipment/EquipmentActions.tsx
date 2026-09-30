"use client";

import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { track } from "@/lib/analytics";
import type { Equipment } from "@/lib/types";
import {
  absoluteUrl,
  equipmentWhatsAppMessage,
  formatNumber,
  formatPrice,
  whatsappLink,
} from "@/lib/utils";

export function EquipmentActions({ unit }: { unit: Equipment }) {
  const { openEnquiry } = useEnquiry();

  function onWhatsApp() {
    track("whatsapp_click", { source: "Equipment page", reference: unit.reference });
    window.open(
      whatsappLink(
        equipmentWhatsAppMessage({
          name: unit.name,
          reference: unit.reference,
          serial_number: unit.serial_number,
          url: absoluteUrl(`/equipment/${unit.slug}`),
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
          <p className="text-3xl font-extrabold tracking-tight text-navy-900">
            {formatPrice(unit.price)}
          </p>
          <p className="mt-1 text-xs text-steel-500">
            {unit.price !== null ? "Freight quoted separately." : "Price on enquiry."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">Units available</p>
          <p className="text-lg font-extrabold text-navy-900">{formatNumber(unit.quantity)}</p>
        </div>
      </div>

      {unit.status === "Reserved" ? (
        <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-800">
          This unit is currently reserved. Enquiries are logged and we will confirm if it is released.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openEnquiry({ mode: "equipment", equipment: unit })}
          className="btn-primary sm:col-span-2"
        >
          Enquire About This Unit
        </button>
        <button type="button" onClick={onWhatsApp} className="btn border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100">
          WhatsApp Us
        </button>
      </div>

      <dl className="mt-5 space-y-2 border-t border-navy-100 pt-4 text-xs text-steel-600">
        <Row label="Reference" value={unit.reference} />
        <Row label="Serial number" value={unit.serial_number} />
        <Row label="Year" value={String(unit.year)} />
        <Row label="Operating hours" value={`${formatNumber(unit.operating_hours)} h`} />
        <Row label="Location" value={unit.location} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right font-semibold text-navy-800">{value}</dd>
    </div>
  );
}
