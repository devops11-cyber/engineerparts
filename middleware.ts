import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/account";

function loginRedirect(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

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
        if (response.status !== 401) {
          // Account authority is erroring but hasn't said the session is invalid:
          // ask for a fresh sign-in without clearing the cookie.
          return loginRedirect(request);
        }
      } catch {
        // Account authority unreachable: ask for a fresh sign-in but keep the
        // session cookie so it resumes once WordPress is back.
        return loginRedirect(request);
      }
    }
  }
  const response = loginRedirect(request);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/account/:path*"],
};