"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatNumber, formatPrice } from "@/lib/utils";

export function CartView() {
  const { items, subtotal, shipping, tax, total, shippingLabel, freeShippingRemaining, freeShippingLabel, quoteLoading, quoteError, stockValid, updateQuantity, removeItem, ready } = useCart();
  const currency = items[0]?.currency ?? "";

  if (!ready) {
    return <p className="text-sm text-steel-600">Loading cart...</p>;
  }

  if (!items.length) {
    return (
      <div className="rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-6 text-center sm:p-10">
        <p className="text-lg font-bold text-navy-900">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
          Add fixed-price clearance items from the stock pages. Enquiry-only and sold items cannot be
          purchased.
        </p>
        <Link href="/clearance" className="btn-primary mt-5 inline-flex">
          Browse clearance stock
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)]">
      <div className="space-y-4">
        {items.map((line) => (
          <article key={line.productId} aria-label={`${line.name}, SKU ${line.sku}`} className="flex flex-col gap-4 rounded-card border border-navy-100 bg-white p-4 shadow-card sm:flex-row">
            <Link href={`/product/${line.slug}`} className="relative h-28 w-full shrink-0 overflow-hidden rounded-md border border-navy-100 bg-navy-50 sm:h-28 sm:w-36">
              <Image src={line.image} alt={line.name} fill sizes="144px" className="object-contain p-2" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">{line.brand}</p>
              <h2 className="mt-1 text-sm font-bold text-navy-900">
                <Link href={`/product/${line.slug}`} className="hover:text-brand-700">
                  {line.name}
                </Link>
              </h2>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-steel-600 sm:grid-cols-3">
                <div>
                  <dt>SKU</dt>
                  <dd className="font-semibold text-navy-800">{line.sku}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd className="font-semibold text-navy-800">{line.condition}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt>Warehouse</dt>
                  <dd className="font-semibold text-navy-800">{line.warehouse}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <QuantityStepper
                  value={line.quantity}
                  max={line.maxQuantity}
                  disabled={line.maxQuantity < 1}
                  onChange={(value) => updateQuantity(line.productId, value)}
                />
                {line.maxQuantity < 1 ? <p className="mt-2 text-xs font-semibold text-signal-700">Out of stock in WordPress. Remove this item to continue.</p> : null}
                <p className="text-xs text-steel-500">Max {formatNumber(line.maxQuantity)} available</p>
              </div>
            </div>
            <div className="flex shrink-0 items-end justify-between gap-4 border-t border-navy-100 pt-3 sm:flex-col sm:border-0 sm:pt-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-steel-500">{formatPrice(line.unitPrice, line.currency)} each</p>
                <p className="mt-1 text-lg font-extrabold text-navy-900">
                  {formatPrice(line.unitPrice * line.quantity, line.currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(line.productId)}
                aria-label={`Remove ${line.name} from cart`}
                className="text-xs font-semibold text-signal-600 hover:text-signal-700"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      <aside aria-label="Order summary" className="h-fit rounded-card border border-navy-100 bg-white p-5 shadow-card lg:sticky lg:top-36">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Order summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-steel-600">Subtotal</dt>
            <dd className="font-semibold text-navy-900">{formatPrice(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-steel-600">{shippingLabel}</dt>
            <dd className="font-semibold text-navy-900">{quoteLoading ? "Calculating..." : formatPrice(shipping, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-steel-600">VAT</dt>
            <dd className="font-semibold text-navy-900">{quoteLoading ? "Calculating..." : formatPrice(tax, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-navy-100 pt-3 text-base">
            <dt className="font-bold text-navy-900">Total</dt>
            <dd className="font-extrabold text-navy-900">{formatPrice(total, currency)}</dd>
          </div>
        </dl>
        {freeShippingRemaining && freeShippingRemaining > 0 ? (
          <p className="mt-3 rounded-md bg-navy-50 px-3 py-2 text-xs font-semibold text-navy-700">
            Add {formatPrice(freeShippingRemaining, currency)} more to unlock {freeShippingLabel ?? "free shipping"}.
          </p>
        ) : null}
        {quoteError ? <p className="mt-3 text-xs font-semibold text-signal-700">WooCommerce totals are temporarily unavailable. Product subtotal is shown.</p> : null}
        <p className="mt-3 text-[11px] leading-relaxed text-steel-500">
          Product prices, shipping, VAT and totals are calculated live by WooCommerce for the selected quantities.
        </p>
        {!stockValid ? <p role="status" className="mt-4 text-xs font-semibold text-signal-700">{quoteLoading ? "Checking current WordPress stock..." : quoteError ? "Could not verify current stock. Please reload and try again." : "Update your cart to match current WordPress stock before checkout."}</p> : null}
        <Link href="/checkout" aria-disabled={!stockValid} className={`btn-primary mt-5 w-full ${stockValid ? "" : "pointer-events-none opacity-50"}`}>
          Proceed to checkout
        </Link>
        <Link href="/clearance" className="btn-outline mt-2 w-full">
          Continue browsing
        </Link>
      </aside>
    </div>
  );
}
