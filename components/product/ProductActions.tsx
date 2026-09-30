"use client";

import { useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import type { Product } from "@/lib/types";
import {
  absoluteUrl,
  formatNumber,
  formatPrice,
  isPurchasable,
  productWhatsAppMessage,
  whatsappLink,
} from "@/lib/utils";
import { track } from "@/lib/analytics";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { openEnquiry } = useEnquiry();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const purchasable = isPurchasable(product.status) && product.price !== null && product.quantity_available !== null && product.quantity_available > 0;
  const wooPurchasable = isPurchasable(product.status) && product.price !== null && Boolean(product.woocommerce_checkout_url);
  const sold = product.status === "Sold";

  function onAddToCart() {
    if (!purchasable || product.price === null || product.quantity_available === null) return;
    addItem(
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        condition: product.condition,
        unitPrice: product.price,
        currency: product.currency,
        maxQuantity: product.quantity_available,
        image: product.images[0],
        warehouse: product.warehouse_location,
      },
      quantity,
    );
    toast(`${quantity} x ${product.sku} added to cart`);
  }

  function onWooCommerceCheckout() {
    if (!wooPurchasable || product.price === null) return;
    addItem(
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        condition: product.condition,
        unitPrice: product.price,
        currency: product.currency,
        maxQuantity: product.quantity_available ?? 99,
        image: product.images[0],
        warehouse: product.warehouse_location,
      },
      quantity,
    );
    track("begin_checkout", {
      product_id: product.id,
      sku: product.sku,
      quantity,
      value: (product.price ?? 0) * quantity,
      provider: "woocommerce",
    });
    window.location.assign("/checkout");
  }

  function onWhatsApp() {
    track("whatsapp_click", { source: "Product page", sku: product.sku });
    window.open(
      whatsappLink(
        productWhatsAppMessage({
          name: product.name,
          sku: product.sku,
          part_number: product.part_number,
          url: absoluteUrl(`/product/${product.slug}`),
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
            {formatPrice(product.price, product.currency)}
          </p>
          {product.price === null ? <p className="mt-1 text-xs text-steel-500">Price on enquiry.</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">
            Quantity available
          </p>
          <p className="text-lg font-extrabold text-navy-900">
            {product.quantity_available === null ? "Contact for quantity" : `${formatNumber(product.quantity_available)} units`}
          </p>
        </div>
      </div>

      {sold ? (
        <div className="mt-4 rounded-md border border-steel-300 bg-steel-100 px-4 py-3 text-sm font-semibold text-steel-700">
          This item is sold and cannot be purchased. You can still send an enquiry.
        </div>
      ) : null}

      {product.status === "Reserved" ? (
        <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-800">
          This item is currently {product.status.toLowerCase()}. Enquiries are still logged and we
          will confirm if it is released.
        </div>
      ) : null}

      {(purchasable || wooPurchasable) && product.quantity_available !== null ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <QuantityStepper value={quantity} max={product.quantity_available} onChange={setQuantity} />
          <span className="text-xs text-steel-500">
            Max {formatNumber(product.quantity_available)} per order
          </span>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {wooPurchasable ? (
          <button type="button" onClick={onWooCommerceCheckout} className="btn-primary sm:col-span-2">
            Buy Now with WooCommerce
          </button>
        ) : null}
        {purchasable ? (
          <button type="button" onClick={onAddToCart} className="btn-outline sm:col-span-2">
            Add to Cart
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => openEnquiry({ mode: "product", product })}
          className={purchasable ? "btn-outline" : "btn-navy sm:col-span-2"}
        >
          Enquire About This Item
        </button>
        <button type="button" onClick={onWhatsApp} className="btn border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100">
          WhatsApp
        </button>
        {product.listing_type === "Whole Lot" || (product.quantity_available ?? 0) >= 100 ? (
          <button
            type="button"
            onClick={() => openEnquiry({ mode: "lot", product })}
            className="btn-outline sm:col-span-2"
          >
            Enquire for Whole Lot
          </button>
        ) : null}
      </div>

      <ul className="mt-5 space-y-2 border-t border-navy-100 pt-4 text-xs text-steel-600">
        {product.warehouse_location !== "Not provided" ? (
          <li className="flex items-center justify-between gap-3">
            <span>Warehouse location</span>
            <span className="text-right font-semibold text-navy-800">{product.warehouse_location}</span>
          </li>
        ) : null}
        {product.lead_time !== "Not provided" ? (
          <li className="flex items-center justify-between gap-3">
            <span>Dispatch</span>
            <span className="text-right font-semibold text-navy-800">{product.lead_time}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
