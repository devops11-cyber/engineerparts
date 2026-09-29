export type AnalyticsEventName =
  | "product_view"
  | "equipment_view"
  | "lot_view"
  | "category_view"
  | "search"
  | "search_no_results"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "enquiry_submit"
  | "offer_submit"
  | "whole_lot_enquiry"
  | "equipment_enquiry"
  | "bulk_deal_enquiry"
  | "clearance_alert_signup"
  | "whatsapp_click"
  | "document_download"
  | "brand_view";

interface EventRecord {
  name: AnalyticsEventName;
  payload: Record<string, unknown>;
  ts: string;
}

const BUFFER_LIMIT = 200;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    engineerpartsAnalytics?: EventRecord[];
  }
}

function push(record: EventRecord) {
  if (typeof window === "undefined") return;

  window.engineerpartsAnalytics = window.engineerpartsAnalytics ?? [];
  window.engineerpartsAnalytics.push(record);

  if (window.engineerpartsAnalytics.length > BUFFER_LIMIT) {
    window.engineerpartsAnalytics.splice(0, window.engineerpartsAnalytics.length - BUFFER_LIMIT);
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: record.name, ...record.payload, ts: record.ts });

  try {
    const body = JSON.stringify(record);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    void 0;
  }
}

export function track(name: AnalyticsEventName, payload: Record<string, unknown> = {}) {
  push({ name, payload, ts: new Date().toISOString() });
}

export function readEvents(): EventRecord[] {
  if (typeof window === "undefined") return [];
  return window.engineerpartsAnalytics ?? [];
}
