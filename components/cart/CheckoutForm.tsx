"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";

interface CheckoutState {
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  billingAddress: string;
  shippingAddress: string;
  fulfilment: "delivery" | "collection";
  notes: string;
}

const EMPTY: CheckoutState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  country: "",
  billingAddress: "",
  shippingAddress: "",
  fulfilment: "delivery",
  notes: "",
};

export function CheckoutForm() {
  const { items, subtotal, total, clear, ready } = useCart();
  const [form, setForm] = useState<CheckoutState>(EMPTY);
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState("");

  const snapshot = useMemo(() => items, [items]);

  function update<K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (
      !form.name.trim() ||
      !form.company.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.country.trim()
    ) {
      setError("Please complete name, company, email, phone and country.");
      return;
    }
    if (form.fulfilment === "delivery" && !form.shippingAddress.trim()) {
      setError("Please provide a shipping address, or choose collection.");
      return;
    }

    setState("submitting");
    track("begin_checkout", { item_count: items.length, value: total });

    const reference = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const order = {
      order_id: reference,
      customer: form,
      items,
      subtotal,
      total,
      currency: "AED",
      payment_status: "placeholder",
      created_at: new Date().toISOString(),
    };

    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
    } catch {
      void 0;
    }

    track("purchase", { order_id: reference, value: total, item_count: items.length });
    setOrderRef(reference);
    clear();
    setState("done");
  }

  if (!ready) return <p className="text-sm text-steel-600">Loading checkout...</p>;

  if (!snapshot.length && state !== "done") {
    return (
      <div className="rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-10 text-center">
        <p className="text-lg font-bold text-navy-900">Your cart is empty</p>
        <Link href="/clearance" className="btn-primary mt-5 inline-flex">
          Browse clearance stock
        </Link>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="rounded-card border border-emerald-200 bg-white p-8 shadow-card">
        <p className="eyebrow text-emerald-700">Order confirmed</p>
        <h2 className="mt-2 text-2xl font-extrabold text-navy-900">Thank you. Your clearance order is logged.</h2>
        <p className="mt-3 text-sm text-steel-700">
          Reference <span className="font-mono font-semibold">{orderRef}</span>. This is an order
          request — we will confirm stock and freight before dispatch or collection.
        </p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-steel-500">Contact</dt>
            <dd className="font-semibold text-navy-900">{form.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-steel-500">Fulfilment</dt>
            <dd className="font-semibold text-navy-900">
              {form.fulfilment === "collection" ? "Collection by appointment" : "Delivery / freight"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/clearance" className="btn-navy">
            Continue browsing
          </Link>
          <Link href="/my-enquiries" className="btn-outline">
            View my enquiries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
      <div className="space-y-6">
        <section className="rounded-card border border-navy-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-extrabold text-navy-900">Customer details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Name *</span>
              <input className="field" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </label>
            <label className="block">
              <span className="field-label">Company *</span>
              <input className="field" value={form.company} onChange={(e) => update("company", e.target.value)} required />
            </label>
            <label className="block">
              <span className="field-label">Email *</span>
              <input type="email" className="field" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </label>
            <label className="block">
              <span className="field-label">Phone *</span>
              <input className="field" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">Country *</span>
              <input className="field" value={form.country} onChange={(e) => update("country", e.target.value)} required />
            </label>
          </div>
        </section>

        <section className="rounded-card border border-navy-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-extrabold text-navy-900">Billing &amp; shipping</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="field-label">Billing address *</span>
              <textarea rows={3} className="field resize-y" value={form.billingAddress} onChange={(e) => update("billingAddress", e.target.value)} />
            </label>
            <fieldset>
              <legend className="field-label">Fulfilment</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.fulfilment === "delivery"}
                    onChange={() => update("fulfilment", "delivery")}
                  />
                  Delivery / freight quote
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.fulfilment === "collection"}
                    onChange={() => update("fulfilment", "collection")}
                  />
                  Collection by appointment
                </label>
              </div>
            </fieldset>
            {form.fulfilment === "delivery" ? (
              <label className="block">
                <span className="field-label">Shipping address *</span>
                <textarea rows={3} className="field resize-y" value={form.shippingAddress} onChange={(e) => update("shippingAddress", e.target.value)} />
              </label>
            ) : (
              <p className="rounded-md border border-navy-100 bg-navy-50 px-4 py-3 text-xs text-steel-600">
                Collection is by appointment at the warehouse shown on each line. The clearance desk
                will confirm a date after the order is logged.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-card border border-navy-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-extrabold text-navy-900">Payment</h2>
          <p className="mt-2 text-sm text-steel-600">
            Payment method: order request — we will confirm. No payment is taken on this page.
          </p>
          <label className="mt-4 block">
            <span className="field-label">Order notes</span>
            <textarea rows={3} className="field resize-y" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="PO number, delivery constraints, inspection requests." />
          </label>
        </section>
      </div>

      <aside className="h-fit rounded-card border border-navy-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Order review</h2>
        <ul className="mt-4 divide-y divide-navy-100 text-sm">
          {items.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-navy-900">{line.name}</span>
                <span className="text-xs text-steel-500">
                  {line.sku} &middot; qty {line.quantity}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-navy-900">
                {formatPrice(line.unitPrice * line.quantity, line.currency)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-navy-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-steel-600">Subtotal</dt>
            <dd className="font-semibold">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-bold">Total (AED)</dt>
            <dd className="font-extrabold">{formatPrice(total)}</dd>
          </div>
        </dl>
        {error ? (
          <p className="mt-4 rounded-md border border-signal-200 bg-signal-50 px-3 py-2 text-xs font-semibold text-signal-700">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={state === "submitting"} className="btn-primary mt-5 w-full">
          {state === "submitting" ? "Placing order..." : "Place order"}
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-steel-500">
          Placing an order confirms stock subject to warehouse check. Sold items cannot be purchased.
        </p>
      </aside>
    </form>
  );
}
