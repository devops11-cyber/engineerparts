"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { track } from "@/lib/analytics";
import { CONTACT_EMAIL, CONTACT_PHONE, formatPrice } from "@/lib/utils";

export interface OrderSummary {
  number: string;
  status: string;
  total: string;
  currency: string;
  paymentUrl: string;
  items: Array<{ name: string; quantity: number; total: string }>;
}

const CONFIRMED_STATUSES = new Set(["processing", "completed", "on-hold"]);
const FAILED_STATUSES = new Set(["failed", "cancelled"]);
const POLL_SCHEDULE_MS = [3000, 5000, 8000, 13000, 20000, 20000, 20000];

type ViewState = "confirmed" | "confirming" | "timed-out" | "failed";

function deriveState(status: string): ViewState {
  if (CONFIRMED_STATUSES.has(status)) return "confirmed";
  if (FAILED_STATUSES.has(status)) return "failed";
  return "confirming";
}

export function OrderSuccessView({
  initialOrder,
  orderId,
  orderKey,
}: {
  initialOrder: OrderSummary;
  orderId: number;
  orderKey: string;
}) {
  const { authenticated } = useAuth();
  const [order, setOrder] = useState(initialOrder);
  const [view, setView] = useState<ViewState>(deriveState(initialOrder.status));
  const tracked = useRef(false);

  useEffect(() => {
    if (view === "confirmed" && !tracked.current) {
      tracked.current = true;
      track("purchase", { order_id: orderId, value: Number(order.total), currency: order.currency });
    }
  }, [view, orderId, order.total, order.currency]);

  useEffect(() => {
    if (view !== "confirming") return;

    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;

    async function poll() {
      controller = new AbortController();
      try {
        const response = await fetch(`/api/orders/${orderId}?order_key=${encodeURIComponent(orderKey)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as { ok?: boolean; order?: OrderSummary } | null;
        if (cancelled) return;
        if (response.ok && data?.ok && data.order) {
          const nextState = deriveState(data.order.status);
          setOrder(data.order);
          if (nextState !== "confirming") {
            setView(nextState);
            return;
          }
        }
      } catch {
        // transient failure — keep polling on schedule
      }
      if (cancelled) return;
      if (attempt >= POLL_SCHEDULE_MS.length) {
        setView("timed-out");
        return;
      }
      const delay = POLL_SCHEDULE_MS[attempt];
      attempt += 1;
      timer = setTimeout(poll, delay);
    }

    timer = setTimeout(poll, POLL_SCHEDULE_MS[0]);
    attempt = 1;

    function onVisible() {
      if (document.visibilityState === "visible" && !cancelled) {
        clearTimeout(timer);
        void poll();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [view, orderId, orderKey]);

  if (view === "confirmed") {
    return (
      <div className="card p-6 sm:p-10">
        <p className="text-lg font-bold text-navy-900">Thank you — your payment was successful</p>
        <p className="mt-2 text-sm text-steel-600">Order #{order.number} is confirmed. We&apos;ve emailed you a receipt.</p>
        <OrderItems order={order} />
        <div className="mt-6 flex flex-wrap gap-3">
          {authenticated ? (
            <Link href="/account/orders" className="btn-primary">View my orders</Link>
          ) : (
            <Link href="/clearance" className="btn-primary">Continue shopping</Link>
          )}
        </div>
        <SupportFooter />
      </div>
    );
  }

  if (view === "failed") {
    return (
      <div className="card p-6 sm:p-10">
        <p className="text-lg font-bold text-navy-900">Payment didn&apos;t go through</p>
        <p className="mt-2 text-sm text-steel-600">Order #{order.number} was not paid. You can try the payment again, or contact our sales team.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {order.paymentUrl ? <a href={order.paymentUrl} className="btn-primary">Try again</a> : null}
        </div>
        <SupportFooter />
      </div>
    );
  }

  if (view === "timed-out") {
    return (
      <div className="card p-6 sm:p-10">
        <p className="text-lg font-bold text-navy-900">Still confirming your payment</p>
        <p className="mt-2 text-sm text-steel-600">
          This is taking longer than usual, but your order #{order.number} is safe. We&apos;ll email your receipt as soon as it clears — no need to keep this tab open.
        </p>
        <SupportFooter />
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-10">
      <p className="text-lg font-bold text-navy-900">Confirming your payment...</p>
      <p className="mt-2 text-sm text-steel-600">Order #{order.number} — this usually takes just a few seconds.</p>
    </div>
  );
}

function OrderItems({ order }: { order: OrderSummary }) {
  return (
    <ul className="mt-5 divide-y divide-navy-100 text-sm">
      {order.items.map((item, index) => (
        <li key={index} className="flex justify-between gap-3 py-3">
          <span className="min-w-0 truncate font-semibold text-navy-900">{item.name} × {item.quantity}</span>
          <span className="shrink-0 font-semibold text-navy-900">{formatPrice(Number(item.total), order.currency)}</span>
        </li>
      ))}
      <li className="flex justify-between gap-3 pt-3 text-base">
        <span className="font-bold">Total</span>
        <span className="font-extrabold">{formatPrice(Number(order.total), order.currency)}</span>
      </li>
    </ul>
  );
}

function SupportFooter() {
  return (
    <section className="mt-6 border-t border-navy-100 pt-4 text-xs text-steel-600">
      <p className="font-semibold text-navy-800">Need help with your order?</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {CONTACT_EMAIL ? <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : null}
        {CONTACT_PHONE ? <a className="underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a> : null}
        <Link className="underline" href="/contact">Contact support</Link>
      </div>
    </section>
  );
}
