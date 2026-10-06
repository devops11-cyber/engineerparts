"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["Dashboard", "/account"],
  ["Orders", "/account/orders"],
  ["Enquiries / RFQs", "/account/enquiries"],
  ["Saved Products", "/account/saved-products"],
  ["Addresses", "/account/addresses"],
  ["Profile", "/account/profile"],
  ["Account Security", "/account/security"],
] as const;

export function AccountNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const current = ITEMS.find(([, href]) => pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`)))?.[1] ?? "/account";

  return (
    <>
      <label className="block lg:hidden">
        <span className="field-label">Account section</span>
        <select className="field" value={current} onChange={(event) => router.push(event.target.value)}>
          {ITEMS.map(([label, href]) => <option key={href} value={href}>{label}</option>)}
        </select>
      </label>
      <nav aria-label="Account navigation" className="hidden rounded-card border border-navy-100 bg-white p-2 shadow-card lg:block">
        {ITEMS.map(([label, href]) => {
          const active = pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} className={cn("block rounded-md px-4 py-3 text-sm font-semibold", active ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-navy-50")}>{label}</Link>;
        })}
        <button type="button" onClick={() => void logout()} className="mt-2 w-full border-t border-navy-100 px-4 py-3 text-left text-sm font-semibold text-signal-700">Sign out</button>
      </nav>
    </>
  );
}