"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import type { WooCountry } from "@/lib/woocommerce";
import type { AccountCustomer, CustomerAddress } from "@/lib/account";

interface CheckoutAddress {
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CheckoutState {
  billing: CheckoutAddress & { email: string; phone: string };
  shipping: CheckoutAddress;
  sameAsBilling: boolean;
  saveAddress: boolean;
}

const EMPTY_ADDRESS: CheckoutAddress = {
  firstName: "",
  lastName: "",
  company: "",
  country: "AE",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
};

const EMPTY: CheckoutState = {
  billing: { ...EMPTY_ADDRESS, email: "", phone: "" },
  shipping: { ...EMPTY_ADDRESS },
  sameAsBilling: true,
  saveAddress: false,
};

export function CheckoutForm({ countries }: { countries: WooCountry[] }) {
  const { items, subtotal, shipping, tax, total, shippingLabel, freeShippingRemaining, freeShippingLabel, quoteLoading, quoteError, stockValid, setQuoteCountry, updateQuantity, removeItem, clear, ready } = useCart();
  const { authenticated, loading: authLoading } = useAuth();
  const [form, setForm] = useState<CheckoutState>(EMPTY);
  const [state, setState] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const edited = useRef(false);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    fetch("/api/account", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? (await response.json()) as { customer: AccountCustomer } : null)
      .then((data) => {
        if (!data || edited.current) return;
        const billing = checkoutBilling(data.customer.billingAddress, data.customer);
        const savedShipping = checkoutAddress(data.customer.shippingAddress);
        const hasShipping = Boolean(savedShipping.address1);
        setForm({ billing, shipping: hasShipping ? savedShipping : checkoutAddress(data.customer.billingAddress), sameAsBilling: !hasShipping || addressesMatch(data.customer.billingAddress, data.customer.shippingAddress), saveAddress: false });
        setQuoteCountry(billing.country || "AE");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [authenticated, setQuoteCountry]);

  const currency = items[0]?.currency ?? "";

  function updateAddress<K extends keyof CheckoutState["billing"]>(key: K, value: CheckoutState["billing"][K]) {
    edited.current = true;
    setForm((current) => ({
      ...current,
      billing: { ...current.billing, [key]: value },
    }));
    if (key === "country") setQuoteCountry(String(value));
  }

  function updateShipping<K extends keyof CheckoutState["shipping"]>(key: K, value: CheckoutState["shipping"][K]) {
    edited.current = true;
    setForm((current) => ({ ...current, shipping: { ...current.shipping, [key]: value } }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!stockValid) {
      setError("One or more items exceed current WordPress stock. Please update your cart.");
      return;
    }
    if (
      !form.billing.firstName.trim() ||
      !form.billing.lastName.trim() ||
      !form.billing.email.trim() ||
      !form.billing.phone.trim() ||
      !form.billing.address1.trim() ||
      !form.billing.city.trim()
    ) {
      setError("Please complete all required billing fields.");
      return;
    }
    setState("submitting");
    track("begin_checkout", { item_count: items.length, value: total });

    const reference = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const order = {
      order_id: reference,
      customer: { billing: form.billing, shipping: form.sameAsBilling ? undefined : form.shipping },
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      saveAddress: authenticated && form.saveAddress,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const result = (await response.json()) as { error?: string; payment_url?: string };
      if (!response.ok || !result.payment_url) {
        throw new Error(result.error || "Unable to start payment");
      }
      clear();
      window.location.assign(result.payment_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to place order");
      setState("idle");
    }
  }

  if (!ready) return <p className="text-sm text-steel-600">Loading checkout...</p>;

  if (!items.length) {
    return (
      <div className="rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-6 text-center sm:p-10">
        <p className="text-lg font-bold text-navy-900">Your cart is empty</p>
        <Link href="/clearance" className="btn-primary mt-5 inline-flex">
          Browse clearance stock
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
      <div className="min-w-0 space-y-6">
        {!authLoading && !authenticated ? <div className="rounded-md border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-800"><Link href="/login?redirect=/checkout" className="font-bold text-brand-700">Sign in</Link> to prefill saved details, or continue with guest checkout. New customer? <Link href="/register" className="font-bold text-brand-700">Create an account</Link>.</div> : null}
        <section className="rounded-card border border-navy-100 bg-white p-4 shadow-card sm:p-6">
          <h2 className="text-lg font-extrabold uppercase text-navy-900">Billing details</h2>
          <div className="mt-5">
            <AddressFields
              address={form.billing}
              countries={countries}
              onChange={updateAddress}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Phone *</span>
                <input type="tel" autoComplete="tel" className="field" value={form.billing.phone} onChange={(e) => updateAddress("phone", e.target.value)} required />
              </label>
              <label className="block">
                <span className="field-label">Email address *</span>
                <input type="email" autoComplete="email" className="field" value={form.billing.email} onChange={(e) => updateAddress("email", e.target.value)} required />
              </label>
            </div>
          </div>
        </section>

        <label className="flex items-center gap-2 text-sm font-semibold text-navy-800"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.sameAsBilling} onChange={(event) => { edited.current = true; setForm((current) => ({ ...current, sameAsBilling: event.target.checked })); }} />Shipping address is the same as billing</label>
        {!form.sameAsBilling ? <section className="rounded-card border border-navy-100 bg-white p-4 shadow-card sm:p-6"><h2 className="text-lg font-extrabold uppercase text-navy-900">Shipping address</h2><div className="mt-5"><AddressFields address={form.shipping} countries={countries} onChange={updateShipping} /></div></section> : null}
        {authenticated ? <label className="flex items-center gap-2 text-sm font-semibold text-navy-800"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.saveAddress} onChange={(event) => setForm((current) => ({ ...current, saveAddress: event.target.checked }))} />Save these addresses to my account</label> : null}

      </div>

      <aside aria-label="Order review" className="min-w-0 h-fit rounded-card border border-navy-100 bg-white p-5 shadow-card lg:sticky lg:top-36">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Order review</h2>
        <ul className="mt-4 divide-y divide-navy-100 text-sm">
          {items.map((line) => (
            <li key={line.productId} className="py-3">
              <div className="flex justify-between gap-3">
                <span className="min-w-0">
                <span className="block truncate font-semibold text-navy-900">{line.name}</span>
                  <span className="text-xs text-steel-500">{line.sku}</span>
                </span>
                <span className="shrink-0 font-semibold text-navy-900">
                  {formatPrice(line.unitPrice * line.quantity, line.currency)}
                </span>
              </div>
              <div className="mt-3">
                <QuantityStepper
                  value={line.quantity}
                  max={line.maxQuantity}
                  disabled={line.maxQuantity < 1}
                  onChange={(value) => updateQuantity(line.productId, value)}
                />
                {line.maxQuantity < 1 ? <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-signal-700"><span>Out of stock in WordPress.</span><button type="button" className="underline" onClick={() => removeItem(line.productId)}>Remove item</button></div> : null}
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-navy-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-steel-600">Subtotal</dt>
            <dd className="font-semibold">{formatPrice(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-steel-600">{shippingLabel}</dt>
            <dd className="font-semibold">{quoteLoading ? "Calculating..." : formatPrice(shipping, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-steel-600">VAT</dt>
            <dd className="font-semibold">{quoteLoading ? "Calculating..." : formatPrice(tax, currency)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-extrabold">{formatPrice(total, currency)}</dd>
          </div>
        </dl>
        <section aria-labelledby="payment-method-heading" className="mt-5 border-t border-navy-100 pt-4">
          <h3 id="payment-method-heading" className="text-sm font-bold text-navy-900">Payment method</h3>
          <div className="mt-3 flex items-start gap-3 rounded-md border border-brand-300 bg-brand-50 px-3 py-3">
            <span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-[5px] border-brand-600 bg-white" />
            <div>
              <p className="text-sm font-semibold text-navy-900">Online payment via Nomod</p>
              <p className="mt-1 text-xs leading-relaxed text-steel-600">
                You’ll continue to Nomod’s secure payment page to complete your payment.
              </p>
            </div>
          </div>
        </section>
        {freeShippingRemaining && freeShippingRemaining > 0 ? (
          <p className="mt-3 rounded-md bg-navy-50 px-3 py-2 text-xs font-semibold text-navy-700">
            Add {formatPrice(freeShippingRemaining, currency)} more to unlock {freeShippingLabel ?? "free shipping"}.
          </p>
        ) : null}
        {quoteError ? <p className="mt-3 text-xs font-semibold text-signal-700">WooCommerce totals are temporarily unavailable. Product subtotal is shown.</p> : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-signal-200 bg-signal-50 px-3 py-2 text-xs font-semibold text-signal-700">
            {error}
          </p>
        ) : null}
        {!stockValid ? <p role="status" className="mt-4 text-xs font-semibold text-signal-700">{quoteLoading ? "Checking current WordPress stock..." : quoteError ? "Could not verify current stock. Please reload and try again." : "Update your cart to match current WordPress stock before checkout."}</p> : null}
        <button type="submit" disabled={state === "submitting" || !stockValid} className="btn-primary mt-5 w-full">
          {state === "submitting" ? "Preparing payment..." : "Continue to payment"}
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-steel-500">
          Placing an order confirms stock subject to warehouse check. Sold items cannot be purchased.
        </p>
      </aside>
    </form>
  );
}

function AddressFields({
  address,
  countries,
  onChange,
}: {
  address: CheckoutAddress;
  countries: WooCountry[];
  onChange: (key: keyof CheckoutAddress, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="field-label">First name *</span>
        <input autoComplete="given-name" className="field" value={address.firstName} onChange={(event) => onChange("firstName", event.target.value)} required />
      </label>
      <label className="block">
        <span className="field-label">Last name *</span>
        <input autoComplete="family-name" className="field" value={address.lastName} onChange={(event) => onChange("lastName", event.target.value)} required />
      </label>
      <label className="block sm:col-span-2">
        <span className="field-label">Company name (optional)</span>
        <input autoComplete="organization" className="field" value={address.company} onChange={(event) => onChange("company", event.target.value)} />
      </label>
      <label className="block sm:col-span-2">
        <span className="field-label">Country / Region *</span>
        <select autoComplete="country" className="field" value={address.country} onChange={(event) => onChange("country", event.target.value)} required>
          {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="field-label">Street address *</span>
        <input autoComplete="address-line1" className="field" value={address.address1} onChange={(event) => onChange("address1", event.target.value)} placeholder="House number and street name" required />
      </label>
      <label className="block sm:col-span-2">
        <span className="sr-only">Apartment, suite, unit, etc. (optional)</span>
        <input autoComplete="address-line2" className="field" value={address.address2} onChange={(event) => onChange("address2", event.target.value)} placeholder="Apartment, suite, unit, etc. (optional)" />
      </label>
      <label className="block">
        <span className="field-label">Town / City *</span>
        <input autoComplete="address-level2" className="field" value={address.city} onChange={(event) => onChange("city", event.target.value)} required />
      </label>
      <label className="block">
        <span className="field-label">State / County (optional)</span>
        <input autoComplete="address-level1" className="field" value={address.state} onChange={(event) => onChange("state", event.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">Postal code (optional)</span>
        <input autoComplete="postal-code" className="field" value={address.postalCode} onChange={(event) => onChange("postalCode", event.target.value)} />
      </label>
    </div>
  );
}

function checkoutAddress(address: CustomerAddress): CheckoutAddress {
  return { firstName: address.firstName, lastName: address.lastName, company: address.company, country: address.country || "AE", address1: address.address1, address2: address.address2, city: address.city, state: address.state, postalCode: address.postalCode };
}

function checkoutBilling(address: CustomerAddress, customer: AccountCustomer): CheckoutState["billing"] {
  return { ...checkoutAddress(address), email: address.email || customer.email, phone: address.phone || customer.phone };
}

function addressesMatch(left: CustomerAddress, right: CustomerAddress): boolean {
  return ["firstName", "lastName", "company", "address1", "address2", "city", "state", "postalCode", "country"].every((key) => left[key as keyof CustomerAddress] === right[key as keyof CustomerAddress]);
}
