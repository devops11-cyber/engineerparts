"use client";

import { useEffect, useMemo, useState } from "react";
import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { submitLead } from "@/lib/leads";
import { cn, formatNumber, formatPrice, isPurchasable } from "@/lib/utils";
import type { LeadType } from "@/lib/types";

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  quantity: string;
  budget: string;
  enquiryType: string;
  reference: string;
  message: string;
}

const EMPTY: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  country: "",
  quantity: "",
  budget: "",
  enquiryType: "Product enquiry",
  reference: "",
  message: "",
};

const ENQUIRY_TYPES = [
  "Product enquiry",
  "Whole lot enquiry",
  "Equipment enquiry",
  "Bulk / large quantity",
  "Sell or consign stock",
  "Other",
];

export function EnquiryModal() {
  const { target, closeEnquiry } = useEnquiry();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode = target?.mode ?? "product";
  const product = target?.product;
  const lot = target?.lot;
  const unit = target?.equipment;

  const leadType: LeadType = useMemo(() => {
    if (mode === "lot") return "whole_lot_enquiry";
    if (mode === "equipment") return "equipment_enquiry";
    if (mode === "bulk") return "bulk_deal";
    return "product_enquiry";
  }, [mode]);

  const headline =
    target?.heading ??
    (mode === "lot"
        ? "Whole lot enquiry"
        : mode === "equipment"
          ? "Enquire about this unit"
          : mode === "bulk"
            ? "Bulk enquiry"
            : "Product enquiry");

  useEffect(() => {
    if (!target) return;
    setForm({
      ...EMPTY,
      quantity: product ? "1" : lot ? String(lot.total_quantity) : "1",
      reference: lot?.lot_reference ?? unit?.reference ?? product?.sku ?? "",
      enquiryType: mode === "lot" ? "Whole lot enquiry" : "Product enquiry",
    });
    setSubmitted(null);
    setError(null);
  }, [target, product, lot, unit, mode]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeEnquiry();
    }
    if (target) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [target, closeEnquiry]);

  if (!target) return null;

  const availableQuantity = product
    ? product.quantity_available
    : lot
      ? lot.total_quantity
      : unit
        ? unit.quantity
        : null;

  const listedPrice = product?.price ?? lot?.price ?? unit?.price ?? null;
  const contextLabel = product
    ? `${product.name} (${product.sku})`
    : lot
      ? `${lot.lot_reference} - ${lot.name}`
      : unit
        ? `${unit.reference} - ${unit.name}`
        : "";

  const quantityWanted = Number(form.quantity) || 0;
  const exceedsAvailable =
    availableQuantity !== null && quantityWanted > availableQuantity && mode !== "bulk";

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      setError("Please provide your name, company and email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please provide a valid email address.");
      return;
    }
    if (exceedsAvailable) {
      setError(
        `Only ${formatNumber(availableQuantity ?? 0)} units are available. Please reduce the quantity or contact us about the full lot.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const listingUrl =
        typeof window !== "undefined"
          ? window.location.origin + window.location.pathname
          : "";

      const lead = await submitLead({
        lead_type: leadType,
        company: form.company.trim(),
        contact: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        quantity: mode === "product" || mode === "lot" || mode === "equipment" ? quantityWanted : undefined,
        budget: form.budget || undefined,
        message: [
          form.message,
          mode === "bulk" ? `Enquiry type: ${form.enquiryType}` : "",
          form.reference ? `Reference: ${form.reference}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        product_id: product?.id,
        sku: product?.sku,
        part_number: product?.part_number,
        lot_id: lot?.id,
        equipment_id: unit?.id,
        listing_url: listingUrl,
        source: `web_${mode}`,
      });

      setSubmitted(lead.lead_id);
      toast("Enquiry submitted. Reference " + lead.lead_id);
    } catch {
      setError("Something went wrong submitting your enquiry. Please try again or use WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-950/60 p-4 sm:items-center">
      <div className="relative w-full max-w-2xl animate-fade-up rounded-card border border-navy-100 bg-white shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-navy-100 p-5">
          <div>
            <p className="eyebrow text-brand-600">Enquiry</p>
            <h2 className="mt-1 text-xl font-extrabold text-navy-900">{headline}</h2>
            {contextLabel ? <p className="mt-1 text-sm text-steel-600">{contextLabel}</p> : null}
          </div>
          <button
            type="button"
            onClick={closeEnquiry}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-navy-200 text-navy-700 hover:bg-navy-50"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="p-6">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-base font-bold text-emerald-900">Enquiry received</p>
              <p className="mt-1.5 text-sm text-emerald-800">
                Your reference is{" "}
                <span className="font-mono font-semibold">{submitted}</span>. A member of the
                Engineerparts.com clearance desk will respond during the next working day.
              </p>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {contextLabel ? (
                <div>
                  <dt className="text-xs text-steel-500">Item / reference</dt>
                  <dd className="font-semibold text-navy-900">{contextLabel}</dd>
                </div>
              ) : null}
              {availableQuantity !== null ? (
                <div>
                  <dt className="text-xs text-steel-500">Available quantity</dt>
                  <dd className="font-semibold text-navy-900">{formatNumber(availableQuantity)} units</dd>
                </div>
              ) : null}
              {listedPrice !== null ? (
                <div>
                  <dt className="text-xs text-steel-500">Listed price</dt>
                  <dd className="font-semibold text-navy-900">{formatPrice(listedPrice)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-steel-500">Contact</dt>
                <dd className="font-semibold text-navy-900">{form.email}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={closeEnquiry} className="btn-navy btn-sm">
                Close
              </button>
              <a href="/my-enquiries" className="btn-outline btn-sm">
                View my enquiries
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-5">
            {product ? (
              <ContextPanel
                rows={[
                  ["Product", product.name],
                  ["SKU", product.sku],
                  ["Part number", product.part_number],
                  ["Condition", product.condition],
                  ["Quantity available", product.quantity_available === null ? "Contact for quantity" : `${formatNumber(product.quantity_available)} units`],
                  ["Listed price", formatPrice(product.price, product.currency)],
                ]}
                note={
                  product.status === "Reserved"
                    ? `This item is currently ${product.status}. Your enquiry will be logged and we will confirm if it becomes available.`
                    : !isPurchasable(product.status)
                      ? "This item is sold. Tell us what you need and we will match similar clearance stock."
                      : undefined
                }
              />
            ) : null}

            {lot ? (
              <ContextPanel
                rows={[
                  ["Lot reference", lot.lot_reference],
                  ["Lot name", lot.name],
                  ["Available quantity", `${formatNumber(lot.total_quantity)} units`],
                  ["Line items", String(lot.items.length)],
                  ["Listed price", formatPrice(lot.price)],
                ]}
              />
            ) : null}

            {unit ? (
              <ContextPanel
                rows={[
                  ["Reference", unit.reference],
                  ["Unit", unit.name],
                  ["Manufacturer / model", `${unit.manufacturer} ${unit.model}`],
                  ["Serial number", unit.serial_number],
                  ["Year / hours", `${unit.year} / ${formatNumber(unit.operating_hours)} h`],
                  ["Listed price", formatPrice(unit.price)],
                ]}
              />
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <input
                  className="field"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Full name"
                  required
                />
              </Field>
              <Field label="Company" required>
                <input
                  className="field"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Company name"
                  required
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  className="field"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  className="field"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+44 ..."
                />
              </Field>
              <Field label="Country">
                <input
                  className="field"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="Country"
                />
              </Field>

              {mode === "bulk" ? (
                <>
                  <Field label="Enquiry type">
                    <select
                      className="field"
                      value={form.enquiryType}
                      onChange={(e) => update("enquiryType", e.target.value)}
                    >
                      {ENQUIRY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Product / SKU / Lot reference">
                    <input
                      className="field"
                      value={form.reference}
                      onChange={(e) => update("reference", e.target.value)}
                      placeholder="e.g. SKU or lot reference"
                    />
                  </Field>
                  <Field label="Approx. quantity / budget">
                    <input
                      className="field"
                      value={form.budget}
                      onChange={(e) => update("budget", e.target.value)}
                      placeholder="e.g. 50 units or a target budget"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field
                    label={mode === "lot" ? "Quantity required from lot" : "Quantity required"}
                    hint={availableQuantity !== null ? `${formatNumber(availableQuantity)} available` : undefined}
                  >
                    <input
                      type="number"
                      min={1}
                      max={availableQuantity ?? undefined}
                      className="field"
                      value={form.quantity}
                      onChange={(e) => update("quantity", e.target.value)}
                    />
                  </Field>
                  {mode === "product" || mode === "equipment" ? (
                    <Field label="Budget / target price (optional)">
                      <input
                        className="field"
                        value={form.budget}
                        onChange={(e) => update("budget", e.target.value)}
                        placeholder="Optional"
                      />
                    </Field>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-4">
              <Field label="Message">
                <textarea
                  rows={4}
                  className="field resize-y"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Tell us about your requirement, delivery location or timescales."
                />
              </Field>
            </div>

            {error ? (
              <p className="mt-4 rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm font-semibold text-signal-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-4">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Submitting..." : "Submit Enquiry"}
              </button>
              <button type="button" onClick={closeEnquiry} className="btn-outline">
                Cancel
              </button>
              <p className="text-[11px] leading-relaxed text-steel-500">
                Your details are used only to respond to this enquiry.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required ? <span className="text-signal-600"> *</span> : null}
        {hint ? <span className="ml-2 font-normal normal-case tracking-normal text-steel-500">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function ContextPanel({ rows, note }: { rows: [string, string][]; note?: string }) {
  return (
    <div className="rounded-md border border-navy-100 bg-navy-50/70 p-4">
      <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className={cn("min-w-0", label === "Product" || label === "Lot name" || label === "Unit" ? "sm:col-span-2" : "")}>
            <dt className="text-steel-500">{label}</dt>
            <dd className="font-semibold text-navy-900">{value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-3 border-t border-navy-200 pt-3 text-xs font-semibold text-navy-700">{note}</p> : null}
    </div>
  );
}
