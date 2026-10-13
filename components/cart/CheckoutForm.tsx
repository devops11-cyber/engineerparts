"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { track } from "@/lib/analytics";
import { CONTACT_EMAIL, CONTACT_PHONE, formatPrice, isPlausibleAddress, isValidInternationalPhone, normalizePhone } from "@/lib/utils";
import type { WooCountry } from "@/lib/woocommerce";
import type { AccountCustomer, CustomerAddress } from "@/lib/account";

const ORDER_SUBMISSION_ERROR = "We could not submit your order. Please try again or contact our sales team.";

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
  acceptPolicies: boolean;
}

type CheckoutStep = 1 | 2 | 3;
type PurchaseType = "individual" | "business";
type PaymentMethod = "nomod";

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
  acceptPolicies: false,
};

export function CheckoutForm({ countries }: { countries: WooCountry[] }) {
  const { items, subtotal, shipping, tax, total, shippingLabel, freeShippingRemaining, freeShippingLabel, quoteLoading, quoteError, stockValid, setQuoteCountry, updateQuantity, removeItem, clear, ready } = useCart();
  const { authenticated, loading: authLoading } = useAuth();
  const [form, setForm] = useState<CheckoutState>(EMPTY);
  const [step, setStep] = useState<CheckoutStep>(1);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("individual");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("nomod");
  const [state, setState] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const edited = useRef(false);
  const orderReference = useRef<string | null>(null);

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
        const shipping = hasShipping ? savedShipping : checkoutAddress(data.customer.billingAddress);
        const sameAsBilling = !hasShipping || addressesMatch(data.customer.billingAddress, data.customer.shippingAddress);
        setForm({ ...EMPTY, billing, shipping, sameAsBilling });
        setPurchaseType(billing.company ? "business" : "individual");
        setQuoteCountry((sameAsBilling ? billing.country : shipping.country) || "AE");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [authenticated, setQuoteCountry]);

  const currency = items[0]?.currency ?? "";

  function updateAddress<K extends keyof CheckoutState["billing"]>(key: K, value: CheckoutState["billing"][K]) {
    edited.current = true;
    setForm((current) => {
      const billing = { ...current.billing, [key]: value };
      return {
        ...current,
        billing,
        shipping: current.sameAsBilling ? current.shipping : {
          ...current.shipping,
          firstName: key === "firstName" ? String(value) : current.shipping.firstName,
          lastName: key === "lastName" ? String(value) : current.shipping.lastName,
          company: key === "company" ? String(value) : current.shipping.company,
        },
      };
    });
    if (key === "country" && form.sameAsBilling) setQuoteCountry(String(value));
  }

  function updateShipping<K extends keyof CheckoutState["shipping"]>(key: K, value: CheckoutState["shipping"][K]) {
    edited.current = true;
    setForm((current) => ({ ...current, shipping: { ...current.shipping, [key]: value } }));
    if (key === "country" && !form.sameAsBilling) setQuoteCountry(String(value));
  }

  function validateDetails(): boolean {
    if (
      form.billing.firstName.trim().length < 2 ||
      form.billing.lastName.trim().length < 2 ||
      !form.billing.email.trim() ||
      !form.billing.phone.trim() ||
      (purchaseType === "business" && !form.billing.company.trim())
    ) {
      setError("Please complete your contact details.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.billing.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!isValidInternationalPhone(form.billing.phone)) {
      setError("Enter a valid phone number with its country code, such as +971501234567.");
      return false;
    }
    return true;
  }

  function validateDelivery(): boolean {
    if (!isPlausibleAddress(form.billing.address1) || form.billing.city.trim().length < 2) {
      setError("Please enter a valid billing and delivery street address and city.");
      return false;
    }
    if (!form.sameAsBilling && (!isPlausibleAddress(form.shipping.address1) || form.shipping.city.trim().length < 2)) {
      setError("Please enter a valid shipping street address and city.");
      return false;
    }
    return true;
  }

  function continueToNextStep() {
    setError(null);
    if (step === 1 && validateDetails()) setStep(2);
    if (step === 2 && validateDelivery()) setStep(3);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (step !== 3) {
      continueToNextStep();
      return;
    }
    if (!validateDetails()) {
      setStep(1);
      return;
    }
    if (!validateDelivery()) {
      setStep(2);
      return;
    }
    if (!form.acceptPolicies) {
      setError("Please accept the Terms & Conditions and acknowledge the Privacy Policy to continue.");
      return;
    }
    if (!stockValid) {
      setError("One or more items exceed current stock. Please update your cart.");
      return;
    }
    setState("submitting");
    track("begin_checkout", { item_count: items.length, value: total });

    if (!orderReference.current) {
      orderReference.current = `ORD-${Date.now().toString(36).toUpperCase()}`;
    }
    const reference = orderReference.current;
    const order = {
      order_id: reference,
      customer: {
        billing: { ...form.billing, email: form.billing.email.trim().toLowerCase(), phone: normalizePhone(form.billing.phone) },
        shipping: form.sameAsBilling ? undefined : form.shipping,
      },
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      saveAddress: authenticated && form.saveAddress,
      acceptPolicies: form.acceptPolicies,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const result = (await response.json().catch(() => null)) as { error?: string; code?: string; payment_url?: string; order_number?: string } | null;
      if (!response.ok || !result?.payment_url) {
        if (response.status === 409 && result?.error) {
          setError(result.error);
        } else if (result?.code === "payment_handoff_failed") {
          setError(result.error ?? "Your order was created, but secure payment could not be started. Please contact support before placing another order.");
        } else {
          setError(ORDER_SUBMISSION_ERROR);
        }
        setState("idle");
        return;
      }
      clear();
      window.location.assign(result.payment_url);
    } catch {
      setError(ORDER_SUBMISSION_ERROR);
      setState("idle");
    }
  }

  if (!ready) return <p className="text-sm text-steel-600">Loading checkout...</p>;

  if (state === "submitting") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center" role="status" aria-live="polite">
        <span className="mb-5 h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-brand-600" aria-hidden="true" />
        <h1 className="text-xl font-extrabold text-navy-900">Preparing your secure payment</h1>
        <p className="mt-3 text-sm leading-relaxed text-steel-600">
          Your order is being submitted. We’ll redirect you to Nomod shortly. Please don’t refresh or close this page.
        </p>
      </div>
    );
  }

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
        <div className="rounded-md border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-navy-800">
          <p className="font-bold">This places a real order</p>
          <p className="mt-1 text-xs leading-relaxed text-steel-700">Submitting creates an order and starts secure payment. Final prices, shipping, tax and stock are confirmed by the store.</p>
        </div>
        <ol aria-label="Checkout steps" className="grid grid-cols-3 gap-2">
          {(["Your details", "Delivery", "Review"] as const).map((label, index) => {
            const targetStep = (index + 1) as CheckoutStep;
            const active = step === targetStep;
            const complete = step > targetStep;
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    if (complete) {
                      setError(null);
                      setStep(targetStep);
                    }
                  }}
                  disabled={!complete && !active}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-center gap-2 border-b-2 px-1 pb-3 text-left text-sm ${active ? "border-brand-600 font-bold text-navy-900" : complete ? "border-brand-300 text-navy-700" : "border-navy-100 text-steel-400"}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-brand-600 text-white" : complete ? "bg-brand-100 text-brand-800" : "bg-navy-100 text-steel-500"}`}>{complete ? "✓" : targetStep}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {step === 1 ? (
          <section className="card p-4 sm:p-6">
            <h2 className="text-lg font-extrabold text-navy-900">Your details</h2>
            <fieldset className="mt-5">
              <legend className="field-label">I am buying as</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(["individual", "business"] as const).map((type) => (
                  <label key={type} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-semibold ${purchaseType === type ? "border-brand-400 bg-brand-50 text-navy-900" : "border-navy-200 text-steel-700"}`}>
                    <input type="radio" name="purchase-type" value={type} checked={purchaseType === type} onChange={() => setPurchaseType(type)} className="accent-brand-600" />
                    {type === "individual" ? "An individual" : "A business"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">First name *</span>
                <input autoComplete="given-name" minLength={2} className="field" value={form.billing.firstName} onChange={(event) => updateAddress("firstName", event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Last name *</span>
                <input autoComplete="family-name" minLength={2} className="field" value={form.billing.lastName} onChange={(event) => updateAddress("lastName", event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Email address *</span>
                <input type="email" autoComplete="email" className="field" value={form.billing.email} onChange={(event) => updateAddress("email", event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Phone number *</span>
                <input type="tel" autoComplete="tel" inputMode="tel" className="field" value={form.billing.phone} onChange={(event) => updateAddress("phone", event.target.value)} placeholder="+971 50 123 4567" />
              </label>
              {purchaseType === "business" ? (
                <label className="block sm:col-span-2">
                  <span className="field-label">Company name *</span>
                  <input autoComplete="organization" className="field" value={form.billing.company} onChange={(event) => updateAddress("company", event.target.value)} />
                </label>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Link href="/cart" className="text-sm font-semibold text-brand-700 underline">Back to cart</Link>
              <button type="button" onClick={continueToNextStep} className="btn-primary">Next</button>
            </div>
          </section>
        ) : null}
        {step === 2 ? (
          <section className="card p-4 sm:p-6">
            <h2 className="text-lg font-extrabold text-navy-900">How would you like to receive your order?</h2>
            <div className="mt-4 rounded-md border border-brand-300 bg-brand-50 px-4 py-3">
              <p className="text-sm font-semibold text-navy-900">Delivery</p>
              <p className="mt-1 text-xs text-steel-600">Delivered to the address you provide. The delivery charge is shown in your order summary.</p>
            </div>
            <h3 className="mt-6 text-sm font-bold text-navy-900">Billing and delivery address</h3>
            <div className="mt-4">
              <AddressFields address={form.billing} countries={countries} onChange={updateAddress} includeIdentity={false} />
            </div>
            <label className="mt-5 flex items-start gap-2 text-sm text-navy-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                checked={!form.sameAsBilling}
                onChange={(event) => {
                  edited.current = true;
                  const sameAsBilling = !event.target.checked;
                  setForm((current) => ({
                    ...current,
                    sameAsBilling,
                    shipping: sameAsBilling ? current.shipping : {
                      ...current.shipping,
                      firstName: current.billing.firstName,
                      lastName: current.billing.lastName,
                      company: current.billing.company,
                    },
                  }));
                  setQuoteCountry(sameAsBilling ? form.billing.country : form.shipping.country);
                }}
              />
              <span>Ship to a different address</span>
            </label>
            {!form.sameAsBilling ? (
              <div className="mt-5 border-t border-navy-100 pt-5">
                <h3 className="text-sm font-bold text-navy-900">Shipping address</h3>
                <div className="mt-4">
                  <AddressFields address={form.shipping} countries={countries} onChange={updateShipping} includeIdentity={false} />
                </div>
              </div>
            ) : null}
            {authenticated ? <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-navy-800"><input type="checkbox" className="h-4 w-4 shrink-0 accent-brand-600" checked={form.saveAddress} onChange={(event) => setForm((current) => ({ ...current, saveAddress: event.target.checked }))} />Save these addresses to my account</label> : null}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" onClick={() => { setError(null); setStep(1); }} className="text-sm font-semibold text-brand-700 underline">Back</button>
              <button type="button" onClick={continueToNextStep} className="btn-primary">Next</button>
            </div>
          </section>
        ) : null}
        {step === 3 ? (
          <section className="card p-4 sm:p-6">
            <section aria-labelledby="review-payment-heading">
              <h2 id="review-payment-heading" className="text-lg font-extrabold text-navy-900">Payment method</h2>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-brand-300 bg-brand-50 px-4 py-4">
                <input
                  type="radio"
                  name="payment-method"
                  value="nomod"
                  checked={paymentMethod === "nomod"}
                  onChange={() => setPaymentMethod("nomod")}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-navy-900">Pay with cards, wallets, or pay-later options</span>
                  <span className="mt-1 block text-xs leading-relaxed text-steel-600">You’ll choose an available card, wallet, or pay-later option on Nomod’s secure payment page.</span>
                  <span aria-label="Cards, digital wallets, and pay later" className="mt-3 flex flex-wrap gap-2">
                    {["Cards", "Digital wallets", "Pay later"].map((option) => (
                      <span key={option} className="rounded border border-navy-200 bg-white px-2 py-1 text-[11px] font-semibold text-navy-700">{option}</span>
                    ))}
                  </span>
                </span>
              </label>
            </section>
            <section aria-labelledby="review-order-heading" className="mt-6">
              <h2 id="review-order-heading" className="text-lg font-extrabold text-navy-900">Review</h2>
              <dl className="mt-3 divide-y divide-navy-100 border-y border-navy-100 text-sm">
              <div className="py-3">
                <dt className="font-semibold text-navy-900">Customer</dt>
                <dd className="mt-1 text-steel-600">{form.billing.firstName} {form.billing.lastName}{purchaseType === "business" && form.billing.company ? ` · ${form.billing.company}` : ""}<br />{form.billing.email}<br />{form.billing.phone}</dd>
              </div>
              <div className="py-3">
                <dt className="font-semibold text-navy-900">Delivery address</dt>
                <dd className="mt-1 text-steel-600">{addressSummary(form.sameAsBilling ? form.billing : form.shipping, countries)}</dd>
              </div>
              </dl>
              <ul className="mt-3 divide-y divide-navy-100 text-sm">
                {items.map((line) => (
                  <li key={line.productId} className="flex justify-between gap-3 py-3">
                    <span className="text-navy-800">{line.name} <span className="text-steel-500">× {line.quantity}</span></span>
                    <span className="shrink-0 font-semibold text-navy-900">{formatPrice(line.unitPrice * line.quantity, line.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <label className="mt-5 flex items-start gap-2 text-sm text-navy-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                checked={form.acceptPolicies}
                onChange={(event) => setForm((current) => ({ ...current, acceptPolicies: event.target.checked }))}
              />
              <span>I agree to the <Link href="/terms" className="font-semibold text-brand-700 underline">Terms &amp; Conditions</Link> and acknowledge the <Link href="/privacy-policy" className="font-semibold text-brand-700 underline">Privacy Policy</Link>.</span>
            </label>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" onClick={() => { setError(null); setStep(2); }} className="text-sm font-semibold text-brand-700 underline">Back</button>
              <button type="submit" disabled={!stockValid} className="btn-primary">
                Place order
              </button>
            </div>
          </section>
        ) : null}
        {error ? <p role="alert" className="rounded-md border border-signal-200 bg-signal-50 px-3 py-2 text-sm font-semibold text-signal-700">{error}</p> : null}
      </div>

      <aside aria-label="Order review" className="card min-w-0 h-fit p-5 lg:sticky lg:top-36">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Order summary</h2>
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
                {line.maxQuantity < 1 ? <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-signal-700"><span>Out of stock.</span><button type="button" className="underline" onClick={() => removeItem(line.productId)}>Remove item</button></div> : null}
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
            <dd className="font-extrabold">{quoteLoading ? "Calculating..." : formatPrice(total, currency)}</dd>
          </div>
        </dl>
        {freeShippingRemaining && freeShippingRemaining > 0 ? (
          <p className="mt-3 rounded-md bg-navy-50 px-3 py-2 text-xs font-semibold text-navy-700">
            Add {formatPrice(freeShippingRemaining, currency)} more to unlock {freeShippingLabel ?? "free shipping"}.
          </p>
        ) : null}
        {quoteError ? <p className="mt-3 text-xs font-semibold text-signal-700">Shipping and tax totals are temporarily unavailable. Product subtotal is shown.</p> : null}
        {!stockValid ? <p role="status" className="mt-4 text-xs font-semibold text-signal-700">{quoteLoading ? "Checking current stock..." : quoteError ? "Could not verify current stock. Please reload and try again." : "Update your cart to match current stock before checkout."}</p> : null}
        <section className="mt-4 border-t border-navy-100 pt-4 text-xs text-steel-600" aria-label="Checkout support">
          <p className="font-semibold text-navy-800">Need help with your order?</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {CONTACT_EMAIL ? <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : null}
            {CONTACT_PHONE ? <a className="underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a> : null}
            <Link className="underline" href="/contact">Contact support</Link>
          </div>
        </section>
      </aside>
    </form>
  );
}

function AddressFields({
  address,
  countries,
  onChange,
  includeIdentity = true,
}: {
  address: CheckoutAddress;
  countries: WooCountry[];
  onChange: (key: keyof CheckoutAddress, value: string) => void;
  includeIdentity?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {includeIdentity ? (
        <>
          <label className="block">
            <span className="field-label">First name *</span>
            <input autoComplete="given-name" minLength={2} className="field" value={address.firstName} onChange={(event) => onChange("firstName", event.target.value)} required />
          </label>
          <label className="block">
            <span className="field-label">Last name *</span>
            <input autoComplete="family-name" minLength={2} className="field" value={address.lastName} onChange={(event) => onChange("lastName", event.target.value)} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Company name (optional)</span>
            <input autoComplete="organization" className="field" value={address.company} onChange={(event) => onChange("company", event.target.value)} />
          </label>
        </>
      ) : null}
      <label className="block sm:col-span-2">
        <span className="field-label">Country / Region *</span>
        <select autoComplete="country" className="field" value={address.country} onChange={(event) => onChange("country", event.target.value)} required>
          {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="field-label">Street address *</span>
        <input autoComplete="address-line1" minLength={5} className="field" value={address.address1} onChange={(event) => onChange("address1", event.target.value)} placeholder="House number and street name" required />
      </label>
      <label className="block sm:col-span-2">
        <span className="sr-only">Apartment, suite, unit, etc. (optional)</span>
        <input autoComplete="address-line2" className="field" value={address.address2} onChange={(event) => onChange("address2", event.target.value)} placeholder="Apartment, suite, unit, etc. (optional)" />
      </label>
      <label className="block">
        <span className="field-label">Town / City *</span>
        <input autoComplete="address-level2" minLength={2} className="field" value={address.city} onChange={(event) => onChange("city", event.target.value)} required />
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

function addressSummary(address: CheckoutAddress, countries: WooCountry[]): string {
  return [
    address.address1,
    address.address2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    countries.find((country) => country.code === address.country)?.name ?? address.country,
  ].filter(Boolean).join(", ");
}

function checkoutBilling(address: CustomerAddress, customer: AccountCustomer): CheckoutState["billing"] {
  return { ...checkoutAddress(address), email: address.email || customer.email, phone: address.phone || customer.phone };
}

function addressesMatch(left: CustomerAddress, right: CustomerAddress): boolean {
  return ["firstName", "lastName", "company", "address1", "address2", "city", "state", "postalCode", "country"].every((key) => left[key as keyof CustomerAddress] === right[key as keyof CustomerAddress]);
}
