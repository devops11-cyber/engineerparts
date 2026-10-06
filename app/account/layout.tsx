import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth-server";
import { AccountNavigation } from "@/components/account/AccountNavigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account");
  return <section className="section bg-navy-50"><div className="shell"><div className="mb-7"><p className="eyebrow text-brand-700">Customer account</p><h1 className="mt-2 text-2xl font-extrabold text-navy-950 sm:text-3xl">Welcome, {customer.firstName || customer.displayName}</h1><p className="mt-1 text-sm text-steel-600">{customer.company || customer.email}</p></div><div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><aside><AccountNavigation /></aside><div className="min-w-0">{children}</div></div></div></section>;
}