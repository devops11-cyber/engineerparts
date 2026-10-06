import type { Metadata } from "next";
import Link from "next/link";
import { getAccountResource } from "@/lib/auth-server";
import type { CustomerEnquiry, CustomerOrder } from "@/lib/account";

export const metadata: Metadata = {
  title: "Account",
  description: "Engineerparts.com customer account for clearance orders and enquiries.",
};

export default async function AccountPage() {
  const [orderData, enquiryData] = await Promise.all([
    getAccountResource<{ ok: true; orders: CustomerOrder[] }>("orders"),
    getAccountResource<{ ok: true; enquiries: CustomerEnquiry[] }>("enquiries"),
  ]);
  const orders = orderData?.orders ?? []; const enquiries = enquiryData?.enquiries ?? [];
  return <div><h2 className="text-xl font-extrabold">Account dashboard</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><DashboardCard label="Orders" value={String(orders.length)} href="/account/orders" /><DashboardCard label="Enquiries" value={String(enquiries.length)} href="/account/enquiries" /><DashboardCard label="Cart" value="Continue shopping" href="/cart" /></div><div className="mt-7 grid gap-5 xl:grid-cols-2"><section className="card p-5"><h2 className="font-extrabold">Recent orders</h2>{orders.length ? orders.slice(0, 3).map((order) => <Link key={order.id} href={`/account/orders/${order.id}`} className="mt-3 block border-t border-navy-100 pt-3 text-sm font-semibold">Order #{order.number} <span className="float-right text-steel-500">{order.status}</span></Link>) : <p className="mt-3 text-sm text-steel-600">You have not placed any orders yet.</p>}</section><section className="card p-5"><h2 className="font-extrabold">Recent enquiries</h2>{enquiries.length ? enquiries.slice(0, 3).map((item) => <Link key={item.reference} href="/account/enquiries" className="mt-3 block border-t border-navy-100 pt-3 text-sm font-semibold">{item.reference} <span className="float-right capitalize text-steel-500">{item.status}</span></Link>) : <p className="mt-3 text-sm text-steel-600">You have not submitted any enquiries yet.</p>}</section></div></div>;
}

function DashboardCard({ label, value, href }: { label: string; value: string; href: string }) { return <Link href={href} className="card p-5 transition-shadow hover:shadow-lift"><p className="eyebrow text-brand-700">{label}</p><p className="mt-2 text-xl font-extrabold text-navy-950">{value}</p></Link>; }
