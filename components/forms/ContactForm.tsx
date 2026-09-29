"use client";

import { useState } from "react";
import { submitLead } from "@/lib/leads";

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
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
  enquiryType: "Product enquiry",
  reference: "",
  message: "",
};

const TYPES = [
  "Product enquiry",
  "Make an offer",
  "Whole lot enquiry",
  "Equipment enquiry",
  "Bulk / large quantity",
  "Sell or consign stock",
  "Other",
];

export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.company.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please provide your name, company, email and a message.");
      return;
    }
    setState("sending");
    try {
      const lead = await submitLead({
        lead_type: "general_contact",
        company: form.company,
        contact: form.name,
        email: form.email,
        phone: form.phone,
        country: form.country,
        sku: form.reference || undefined,
        message: [`Enquiry type: ${form.enquiryType}`, form.reference ? `Reference: ${form.reference}` : "", form.message]
          .filter(Boolean)
          .join("\n"),
        source: "contact_page",
      });
      setReference(lead.lead_id);
      setState("done");
    } catch {
      setState("idle");
      setError("Something went wrong. Please try again or use WhatsApp.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-card border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-lg font-bold text-emerald-900">Enquiry received</p>
        <p className="mt-2 text-sm text-emerald-800">
          Your reference is <span className="font-mono font-semibold">{reference}</span>. The
          clearance desk will respond during the next working day.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY);
            setState("idle");
          }}
          className="btn-navy btn-sm mt-5"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-navy-100 bg-white p-6 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <input className="field" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </Field>
        <Field label="Company" required>
          <input className="field" value={form.company} onChange={(e) => update("company", e.target.value)} required />
        </Field>
        <Field label="Email" required>
          <input type="email" className="field" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </Field>
        <Field label="Phone">
          <input className="field" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </Field>
        <Field label="Country">
          <input className="field" value={form.country} onChange={(e) => update("country", e.target.value)} />
        </Field>
        <Field label="Enquiry type">
          <select className="field" value={form.enquiryType} onChange={(e) => update("enquiryType", e.target.value)}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Product / SKU / Lot reference (optional)">
            <input
              className="field"
              value={form.reference}
              onChange={(e) => update("reference", e.target.value)}
              placeholder="Enter a product name, SKU or reference"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Message" required>
            <textarea
              rows={5}
              className="field resize-y"
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              required
            />
          </Field>
        </div>
      </div>
      {error ? (
        <p className="mt-4 rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm font-semibold text-signal-700">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === "sending"} className="btn-primary">
          {state === "sending" ? "Sending..." : "Send Enquiry"}
        </button>
        <p className="text-[11px] text-steel-500">Used only to respond to this enquiry.</p>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required ? <span className="text-signal-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
