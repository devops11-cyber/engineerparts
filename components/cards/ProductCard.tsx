"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";
import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConditionPill, ListingBadges, StatusPill } from "@/components/ui/Badge";
import type { Product } from "@/lib/types";
import { cn, formatNumber, formatPrice, isPurchasable, relativeAdded } from "@/lib/utils";

export function ProductCard({ product, layout = "grid" }: { product: Product; layout?: "grid" | "list" }) {
  const { addItem } = useCart();
  const { openEnquiry } = useEnquiry();
  const { toast } = useToast();

  const purchasable = isPurchasable(product.status) && product.price !== null && product.quantity_available !== null && product.quantity_available > 0;
  const wooPurchasable = isPurchasable(product.status) && product.price !== null && Boolean(product.woocommerce_checkout_url);
  const priceLabel = formatPrice(product.price, product.currency);
  const list = layout === "list";

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
      1,
    );
    toast(`${product.sku} added to cart`);
  }

  function onWooCommerceCheckout() {
    if (!wooPurchasable || product.price === null) return;
    addItem({
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
    });
    window.location.assign("/checkout");
  }

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-shadow hover:shadow-lift",
        list ? "flex-col sm:flex-row" : "h-full flex-col",
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className={cn(
          "relative block shrink-0 overflow-hidden bg-navy-50",
          list ? "sm:w-64" : "",
        )}
        aria-label={product.name}
      >
        <div className={cn("relative", list ? "aspect-[4/3] sm:h-full sm:aspect-auto" : "aspect-[4/3]")}>
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {product.status === "Sold" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-950/55">
              <span className="rounded-sm border border-white/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                Sold
              </span>
            </div>
          ) : null}
        </div>
        <ListingBadges badges={product.badges} className="absolute left-3 top-3" />
      </Link>

      <div className={cn("flex min-w-0 flex-1 flex-col p-4", list ? "sm:p-5" : "")}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
            {product.brand}
          </p>
          <StatusPill status={product.status} />
        </div>

        <h3 className={cn("mt-2 font-bold leading-snug text-navy-900", list ? "text-lg" : "text-[15px]")}>
          <Link href={`/product/${product.slug}`} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div>
            <dt className="text-steel-500">SKU</dt>
            <dd className="font-semibold text-navy-800">{product.sku}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-steel-500">Part number</dt>
            <dd className="truncate font-semibold text-navy-800" title={product.part_number}>
              {product.part_number}
            </dd>
          </div>
          <div>
            <dt className="text-steel-500">Quantity available</dt>
            <dd className="font-semibold text-navy-800">
              {product.quantity_available === null ? "Contact for quantity" : `${formatNumber(product.quantity_available)} units`}
            </dd>
          </div>
          <div>
            <dt className="text-steel-500">Added</dt>
            <dd className="font-semibold text-navy-800">{relativeAdded(product.added_date)}</dd>
          </div>
        </dl>

        {list ? <p className="mt-3 text-sm leading-relaxed text-steel-600">{product.description}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {product.condition !== "Not provided" ? <ConditionPill condition={product.condition} /> : null}
          {product.warehouse_location !== "Not provided" ? (
            <span className="text-[11px] text-steel-500">{product.warehouse_location}</span>
          ) : null}
        </div>

        <div className="mt-auto pt-4">
          <div className="border-t border-navy-100 pt-3">
            <p className="text-xl font-extrabold tracking-tight text-navy-900">{priceLabel}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {product.listing_type === "Whole Lot" ? (
              <button
                type="button"
                onClick={() => openEnquiry({ mode: "lot", product })}
                className="btn-primary btn-sm flex-1"
              >
                Enquire for Whole Lot
              </button>
            ) : (
              <>
                {wooPurchasable ? (
                  <button type="button" onClick={onWooCommerceCheckout} className="btn-primary btn-sm flex-1">
                    Buy Now
                  </button>
                ) : null}
                {purchasable ? (
                  <button type="button" onClick={onAddToCart} className="btn-outline btn-sm flex-1">
                    Add to Cart
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEnquiry({ mode: "product", product })}
                  className={cn("btn-sm", purchasable ? "btn-outline" : "btn-navy flex-1")}
                >
                  {product.status === "Sold" ? "Enquire About Similar" : "Enquire Now"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
