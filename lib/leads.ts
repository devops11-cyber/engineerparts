import type { Lead, LeadType } from "@/lib/types";
import { track } from "@/lib/analytics";

export interface LeadInput {
  lead_type: LeadType;
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  quantity?: number;
  budget?: string;
  message?: string;
  product_id?: string;
  sku?: string;
  part_number?: string;
  lot_id?: string;
  equipment_id?: string;
  listing_url?: string;
  source?: string;
}

const STORAGE_KEY = "engineerparts.leads";

function makeLeadId(): string {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `EP-${ymd}-${seq}`;
}

function persist(lead: Lead) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: Lead[] = raw ? JSON.parse(raw) : [];
    list.unshift(lead);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    void 0;
  }
}

export function readLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Lead[]) : [];
  } catch {
    return [];
  }
}

const EVENT_BY_TYPE: Record<LeadType, "enquiry_submit" | "whole_lot_enquiry" | "equipment_enquiry" | "bulk_deal_enquiry" | "clearance_alert_signup"> = {
  product_enquiry: "enquiry_submit",
  whole_lot_enquiry: "whole_lot_enquiry",
  equipment_enquiry: "equipment_enquiry",
  bulk_deal: "bulk_deal_enquiry",
  clearance_alert: "clearance_alert_signup",
  general_contact: "enquiry_submit",
};

export async function submitLead(input: LeadInput): Promise<Lead> {
  const draft: Lead = {
    lead_id: makeLeadId(),
    lead_type: input.lead_type,
    product_id: input.product_id,
    sku: input.sku,
    sku_or_part: input.sku,
    part_number: input.part_number,
    lot_id: input.lot_id,
    equipment_id: input.equipment_id,
    company: input.company,
    contact: input.contact,
    email: input.email,
    phone: input.phone,
    country: input.country,
    quantity: input.quantity,
    budget: input.budget,
    message: input.message,
    source: input.source ?? "web",
    listing_url: input.listing_url,
    status: "new",
    created_at: new Date().toISOString(),
  };

  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const result = (await response.json()) as { lead_id?: string; received_at?: string; error?: string };
  if (!response.ok || !result.lead_id) throw new Error(result.error || "Unable to submit your enquiry.");
  const lead = { ...draft, lead_id: result.lead_id, created_at: result.received_at ?? draft.created_at };
  persist(lead);
  track(EVENT_BY_TYPE[input.lead_type], { lead_id: lead.lead_id, sku: lead.sku, lot_id: lead.lot_id, equipment_id: lead.equipment_id, quantity: lead.quantity });
  return lead;
}
