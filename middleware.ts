import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/account";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const wordpressUrl = (process.env.WORDPRESS_URL || process.env.WOOCOMMERCE_URL)?.replace(/\/$/, "");
    const proxySecret = process.env.ENGINEERPARTS_PROXY_SECRET;
    if (wordpressUrl && proxySecret) {
      try {
        const response = await fetch(`${wordpressUrl}/wp-json/engineerparts/v1/auth/me`, {
          headers: { "X-EngineerParts-Proxy-Secret": proxySecret, "X-EngineerParts-Session": token },
          cache: "no-store",
        });
        if (response.ok) return NextResponse.next();
      } catch {
        // Fall through to a fresh sign-in when the account authority is unavailable.
      }
    }
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(login);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/account/:path*"],
};