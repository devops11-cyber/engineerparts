import { NextRequest, NextResponse } from "next/server";
import { wordpressAccountRequest } from "@/lib/auth-server";
import { SESSION_COOKIE, type AuthResponse } from "@/lib/account";

const POST_ACTIONS = new Set([
  "register",
  "login",
  "logout",
  "verify-email",
  "resend-verification",
  "forgot-password",
  "reset-password",
]);

function sameOrigin(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(request: NextRequest): string {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.ip ?? "unknown").trim();
}

function responseBody(data: AuthResponse & { token?: string; expiresAt?: string }, status: number) {
  return NextResponse.json(data.ok ? {
    ok: true,
    message: data.message,
    customer: data.customer,
    requiresVerification: data.requiresVerification,
  } : {
    ok: false,
    error: data.error || "Unable to complete this request.",
    code: data.code,
  }, { status });
}

function invalidPayload(action: string, value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Invalid request.";
  const body = value as Record<string, unknown>;
  const text = (key: string, max: number) => typeof body[key] === "string" && body[key].trim().length > 0 && body[key].trim().length <= max;
  const email = text("email", 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email));
  if (action === "logout") return null;
  if (action === "login") return email && text("password", 256) ? null : "Enter a valid email address and password.";
  if (action === "forgot-password" || action === "resend-verification") return email ? null : "Enter a valid email address.";
  if (action === "verify-email") return email && text("token", 128) ? null : "Invalid verification request.";
  if (action === "reset-password") return text("login", 60) && text("key", 128) && text("password", 256) ? null : "Invalid password reset request.";
  if (action === "register") {
    const required = text("firstName", 60) && text("lastName", 60) && email && text("phone", 40) && text("company", 120) && text("password", 256);
    const optional = ["jobTitle", "department", "companyWebsite", "country", "vatNumber", "customerType"]
      .every((key) => body[key] === undefined || (typeof body[key] === "string" && body[key].length <= 200));
    return required && optional ? null : "Unable to create your account. Please check the information and try again.";
  }
  return "Invalid request.";
}

export async function GET(request: NextRequest, { params }: { params: { action: string } }) {
  if (params.action !== "me") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false, customer: null });
  }
  const result = await wordpressAccountRequest("auth/me", { token });
  if (result.status !== 200 || !result.data.customer) {
    const response = NextResponse.json({ authenticated: false, customer: null }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return NextResponse.json({ authenticated: true, customer: result.data.customer });
}

export async function POST(request: NextRequest, { params }: { params: { action: string } }) {
  if (!POST_ACTIONS.has(params.action)) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 32_768) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const validationError = invalidPayload(params.action, body);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 422 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const result = await wordpressAccountRequest(`auth/${params.action}`, {
    method: "POST",
    body,
    token,
    clientIp: clientIp(request),
  });
  const response = responseBody(result.data, result.status);

  if (params.action === "login" && result.status === 200 && result.data.token && result.data.expiresAt) {
    const maxAge = Math.max(0, Math.floor((Date.parse(result.data.expiresAt) - Date.now()) / 1000));
    response.cookies.set(SESSION_COOKIE, result.data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
  }
  if (params.action === "logout") {
    response.cookies.delete(SESSION_COOKIE);
  }
  return response;
}