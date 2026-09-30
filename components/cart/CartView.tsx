"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatNumber, formatPrice } from "@/lib/utils";

export function CartView() {
  const { items, subtotal, total, updateQuantity, removeItem, ready } = useCart();
  const currency = items[0]?.currency ?? "";

  if (!ready) {
    return <p className="text-sm text-steel-600">Loading cart...</p>;
  }

  if (!items.length) {
    return (
      <div className="rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-10 text-center">
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
          <article key={line.productId} className="flex flex-col gap-4 rounded-card border border-navy-100 bg-white p-4 shadow-card sm:flex-row">
            <Link href={`/product/${line.slug}`} className="relative h-28 w-full shrink-0 overflow-hidden rounded-md border border-navy-100 bg-navy-50 sm:h-28 sm:w-36">
              <Image src={line.image} alt={line.name} fill sizes="144px" className="object-cover" />
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
                  onChange={(value) => updateQuantity(line.productId, value)}
                />
                <p className="text-xs text-steel-500">Max {formatNumber(line.maxQuantity)} available</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-between">
              <div className="text-right">
                <p className="text-sm font-semibold text-steel-500">{formatPrice(line.unitPrice, line.currency)} each</p>
                <p className="mt-1 text-lg font-extrabold text-navy-900">
                  {formatPrice(line.unitPrice * line.quantity, line.currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(line.productId)}
                className="text-xs font-semibold text-signal-600 hover:text-signal-700"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-card border border-navy-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Order summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-steel-600">Subtotal</dt>
            <dd className="font-semibold text-navy-900">{formatPrice(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-navy-100 pt-3 text-base">
            <dt className="font-bold text-navy-900">Total</dt>
            <dd className="font-extrabold text-navy-900">{formatPrice(total, currency)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-steel-500">
          Prices use the currency supplied by WooCommerce. Collection or freight is confirmed after the order request is logged.
        </p>
        <Link href="/checkout" className="btn-primary mt-5 w-full">
          Proceed to checkout
        </Link>
        <Link href="/clearance" className="btn-outline mt-2 w-full">
          Continue browsing
        </Link>
      </aside>
    </div>
  );
}
