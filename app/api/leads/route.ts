import { NextResponse } from "next/server";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalStore = globalThis as unknown as { __engineerpartsLeads?: Lead[] };

function store(): Lead[] {
  if (!globalStore.__engineerpartsLeads) globalStore.__engineerpartsLeads = [];
  return globalStore.__engineerpartsLeads;
}

export async function POST(request: Request) {
  let payload: Partial<Lead>;
  try {
    payload = (await request.json()) as Partial<Lead>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const required: Array<keyof Lead> = ["lead_type", "email", "contact"];
  const missing = required.filter((key) => !payload[key]);

  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing required fields: ${missing.join(", ")}` },
      { status: 422 },
    );
  }

  const lead: Lead = {
    ...(payload as Lead),
    lead_id: payload.lead_id ?? `LEAD-${Date.now().toString(36).toUpperCase()}`,
    status: payload.status ?? "new",
    created_at: payload.created_at ?? new Date().toISOString(),
    source: payload.source ?? "web",
  };

  store().unshift(lead);

  return NextResponse.json({
    ok: true,
    lead_id: lead.lead_id,
    received_at: lead.created_at,
    queued_for: ["database", "email", "crm"],
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, count: store().length, leads: store() });
}
