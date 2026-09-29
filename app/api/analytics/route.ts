import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyticsRecord {
  name: string;
  payload: Record<string, unknown>;
  ts: string;
}

const globalStore = globalThis as unknown as { __engineerpartsAnalytics?: AnalyticsRecord[] };

function store(): AnalyticsRecord[] {
  if (!globalStore.__engineerpartsAnalytics) globalStore.__engineerpartsAnalytics = [];
  return globalStore.__engineerpartsAnalytics;
}

export async function POST(request: Request) {
  try {
    const record = (await request.json()) as AnalyticsRecord;
    if (!record?.name) {
      return NextResponse.json({ ok: false, error: "Missing event name" }, { status: 422 });
    }
    const list = store();
    list.unshift({ ...record, ts: record.ts ?? new Date().toISOString() });
    if (list.length > 1000) list.length = 1000;
    return NextResponse.json({ ok: true, name: record.name });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  const list = store();
  const counts: Record<string, number> = {};
  list.forEach((record) => {
    counts[record.name] = (counts[record.name] ?? 0) + 1;
  });
  return NextResponse.json({ ok: true, total: list.length, counts, recent: list.slice(0, 25) });
}
