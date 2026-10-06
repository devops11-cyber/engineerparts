"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice } from "@/lib/utils";
import type { CustomerAddress, CustomerEnquiry, CustomerOrder, CustomerOrderDetail } from "@/lib/account";
import type { CartItem } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Payment", processing: "Processing", "on-hold": "On Hold",
  completed: "Completed", cancelled: "Cancelled", refunded: "Refunded", failed: "Failed",
};

export function OrdersView({ orders }: { orders: CustomerOrder[] }) {
  if (!orders.length) return <EmptyState title="You haven't placed any orders yet." href="/clearance" action="Browse Products" />;
  return <div className="space-y-3">{orders.map((order) => <article key={order.id} className="card grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-navy-950">Order #{order.number}</h2><OrderStatus status={order.status} /></div><p className="mt-2 text-sm text-steel-600">{formatDate(order.date)} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · {formatPrice(order.total, order.currency)}</p><p className="mt-1 text-xs font-semibold uppercase text-steel-500">Payment: {order.paymentStatus}</p></div><Link href={`/account/orders/${order.id}`} className="btn-outline btn-sm">View details</Link></article>)}</div>;
}

export function OrderDetailView({ order }: { order: CustomerOrderDetail }) {
  return <div className="space-y-5"><section className="card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">Order #{order.number}</h2><OrderStatus status={order.status} /></div><p className="mt-2 text-sm text-steel-600">Placed {formatDate(order.date)} · {order.paymentMethod || "Payment method not recorded"}</p></div><div className="flex flex-wrap gap-2">{order.canPay && order.paymentUrl ? <a href={order.paymentUrl} className="btn-primary btn-sm">Pay Now</a> : null}{order.canReorder ? <OrderAgainButton orderId={order.id} /> : null}</div></div></section><section className="card overflow-hidden"><div className="border-b border-navy-100 px-5 py-4"><h2 className="font-extrabold">Ordered products</h2></div><ul className="divide-y divide-navy-100">{order.items.map((item) => <li key={`${item.productId}-${item.name}`} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div><p className="font-semibold text-navy-950">{item.name}</p><p className="text-steel-500">{formatPrice(item.unitPrice, order.currency)} each</p></div><p>Qty {item.quantity}</p><p className="font-bold">{formatPrice(item.total, order.currency)}</p></li>)}</ul><dl className="ml-auto max-w-sm space-y-2 border-t border-navy-100 p-5 text-sm"><Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} /><Row label="Shipping" value={formatPrice(order.shipping, order.currency)} /><Row label="Tax" value={formatPrice(order.tax, order.currency)} /><Row label="Total" value={formatPrice(order.total, order.currency)} strong /></dl></section><div className="grid gap-5 md:grid-cols-2"><AddressCard title="Billing address" address={order.billingAddress} /><AddressCard title="Shipping address" address={order.shippingAddress} /></div>{order.transactionReference || order.customerNote ? <section className="card p-5 text-sm"><h2 className="font-extrabold">Order information</h2>{order.transactionReference ? <p className="mt-3"><span className="font-semibold">Transaction reference:</span> {order.transactionReference}</p> : null}{order.customerNote ? <p className="mt-2"><span className="font-semibold">Note:</span> {order.customerNote}</p> : null}</section> : null}</div>;
}

export function EnquiriesView({ enquiries }: { enquiries: CustomerEnquiry[] }) {
  if (!enquiries.length) return <EmptyState title="You haven't submitted any enquiries yet." href="/clearance" action="Browse Products" />;
  return <div className="space-y-3">{enquiries.map((item) => <article key={item.reference} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-700">{item.reference}</p><h2 className="mt-1 font-extrabold text-navy-950">{item.productName || item.sku || "General enquiry"}</h2></div><span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-bold capitalize text-navy-800">{item.status.replaceAll("-", " ")}</span></div><p className="mt-3 text-sm text-steel-600">{formatDate(item.date)}{item.quantity ? ` · Quantity ${item.quantity}` : ""}</p>{item.message ? <p className="mt-3 whitespace-pre-line text-sm text-navy-800">{item.message}</p> : null}</article>)}</div>;
}

function OrderAgainButton({ orderId }: { orderId: number }) {
  const router = useRouter(); const { addItem } = useCart(); const { toast } = useToast(); const [loading, setLoading] = useState(false);
  async function reorder() { setLoading(true); try { const response = await fetch(`/api/account/orders/${orderId}/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const data = (await response.json()) as { items?: CartItem[]; error?: string }; if (!response.ok) throw new Error(data.error || "Unable to reorder."); for (const { quantity, ...item } of data.items ?? []) addItem(item, quantity); if (!data.items?.length) throw new Error("No products from this order are currently available."); toast("Available products added at current prices."); router.push("/cart"); } catch (caught) { toast(caught instanceof Error ? caught.message : "Unable to reorder.", "error"); setLoading(false); } }
  return <button type="button" className="btn-outline btn-sm" onClick={() => void reorder()} disabled={loading}>{loading ? "Checking stock..." : "Order Again"}</button>;
}

function OrderStatus({ status }: { status: string }) { const positive = status === "completed" || status === "processing"; return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${positive ? "bg-emerald-100 text-emerald-800" : status === "failed" || status === "cancelled" ? "bg-signal-100 text-signal-700" : "bg-amber-100 text-amber-800"}`}>{STATUS_LABELS[status] || status}</span>; }
function AddressCard({ title, address }: { title: string; address: CustomerAddress }) { return <section className="card p-5"><h2 className="font-extrabold">{title}</h2><address className="mt-3 text-sm not-italic leading-6 text-steel-700">{address.firstName} {address.lastName}<br />{address.company ? <>{address.company}<br /></> : null}{address.address1}<br />{address.address2 ? <>{address.address2}<br /></> : null}{address.city}{address.state ? `, ${address.state}` : ""} {address.postalCode}<br />{address.country}</address></section>; }
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-3 ${strong ? "border-t border-navy-100 pt-2 text-base font-extrabold" : ""}`}><dt>{label}</dt><dd>{value}</dd></div>; }
function EmptyState({ title, href, action }: { title: string; href: string; action: string }) { return <div className="card border-dashed p-8 text-center"><h2 className="text-lg font-extrabold">{title}</h2><Link href={href} className="btn-primary mt-5">{action}</Link></div>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(date); }