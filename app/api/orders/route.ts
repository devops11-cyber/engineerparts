import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalStore = globalThis as unknown as { __engineerpartsOrders?: unknown[] };

function store(): unknown[] {
  if (!globalStore.__engineerpartsOrders) globalStore.__engineerpartsOrders = [];
  return globalStore.__engineerpartsOrders;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    store().unshift({ ...payload, received_at: new Date().toISOString() });
    return NextResponse.json({
      ok: true,
      order_id: payload.order_id,
      queued_for: ["database", "email", "erp"],
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, count: store().length, orders: store() });
}
