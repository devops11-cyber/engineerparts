import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, type AuthResponse, type Customer } from "@/lib/account";

function configuration() {
  const wordpressUrl = (process.env.WORDPRESS_URL || process.env.WOOCOMMERCE_URL)?.replace(/\/$/, "");
  const proxySecret = process.env.ENGINEERPARTS_PROXY_SECRET;
  return wordpressUrl && proxySecret ? { wordpressUrl, proxySecret } : null;
}

export async function wordpressAccountRequest<T extends { ok: boolean } = AuthResponse & { token?: string; expiresAt?: string }>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT"; body?: unknown; token?: string; clientIp?: string } = {},
): Promise<{ status: number; data: T }> {
  const config = configuration();
  if (!config) {
    return { status: 503, data: { ok: false, error: "Account service is not configured." } as unknown as T };
  }

  try {
    const response = await fetch(`${config.wordpressUrl}/wp-json/engineerparts/v1/${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-EngineerParts-Proxy-Secret": config.proxySecret,
        ...(options.token ? { "X-EngineerParts-Session": options.token } : {}),
        ...(options.clientIp ? { "X-EngineerParts-Client-IP": options.clientIp } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) {
      return {
        status: 503,
        data: {
          ok: false,
          error: "The EngineerParts account endpoint was not found on the configured WordPress site. Confirm the account plugin is installed and active there.",
        } as unknown as T,
      };
    }
    const raw = (await response.json()) as unknown;
    if (!raw || typeof raw !== "object" || !("ok" in raw) || typeof raw.ok !== "boolean") {
      return { status: 502, data: { ok: false, error: "Account service returned an invalid response." } as unknown as T };
    }
    return { status: response.status, data: raw as T };
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: path,
      category: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "wordpress_unavailable",
    }));
    return { status: 503, data: { ok: false, error: "Account service is temporarily unavailable." } as unknown as T };
  }
}

export const getCurrentCustomer = cache(async (): Promise<Customer | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const response = await wordpressAccountRequest("auth/me", { token });
  return response.status === 200 && response.data.customer ? response.data.customer : null;
});

export async function getAccountResource<T extends { ok: boolean }>(path = ""): Promise<T | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const response = await wordpressAccountRequest<T>(`account${path ? `/${path}` : ""}`, { token });
  return response.status === 200 && response.data.ok ? response.data : null;
}