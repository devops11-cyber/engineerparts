import { NextRequest, NextResponse } from "next/server";
import { wordpressAccountRequest } from "@/lib/auth-server";
import { SESSION_COOKIE } from "@/lib/account";

type Method = "GET" | "POST" | "PUT";
type ProxyData = { ok: boolean; error?: string; code?: string; [key: string]: unknown };

const ALLOWED: Record<Method, RegExp[]> = {
  GET: [/^$/, /^orders$/, /^orders\/\d+$/, /^enquiries$/, /^saved-products$/],
  POST: [/^orders\/\d+\/reorder$/, /^enquiries\/claim$/, /^saved-products$/],
  PUT: [/^$/, /^addresses$/, /^security\/password$/],
};

function sameOrigin(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

function routePath(params: { path?: string[] }): string {
  return params.path?.join("/") ?? "";
}

function safeResult(path: string, data: ProxyData): ProxyData {
  if (!data.ok) return { ok: false, error: data.error || "Unable to complete this request.", code: data.code };
  if (path === "orders") return { ok: true, orders: data.orders };
  if (/^orders\/\d+$/.test(path)) return { ok: true, order: data.order };
  if (/^orders\/\d+\/reorder$/.test(path)) return { ok: true, items: data.items };
  if (path === "enquiries") return { ok: true, enquiries: data.enquiries };
  if (path === "enquiries/claim") return { ok: true, claimed: data.claimed };
  if (path === "saved-products") return { ok: true, saved: data.saved, productIds: data.productIds };
  return { ok: true, message: data.message, customer: data.customer };
}

async function proxy(request: NextRequest, params: { path?: string[] }, method: Method) {
  const path = routePath(params);
  if (!ALLOWED[method].some((pattern) => pattern.test(path))) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  if (method !== "GET" && !sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 32_768) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }
  let body: unknown;
  if (method !== "GET") {
    try {
      body = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 422 });
    }
  }
  const result = await wordpressAccountRequest<ProxyData>(`account${path ? `/${path}` : ""}`, { method, body, token });
  const response = NextResponse.json(safeResult(path, result.data), { status: result.status });
  if (result.status === 401) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params, "GET");
}

export function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params, "POST");
}

export function PUT(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params, "PUT");
}