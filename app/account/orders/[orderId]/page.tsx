import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/account/AccountViews";
import { getAccountResource } from "@/lib/auth-server";
import type { CustomerOrderDetail } from "@/lib/account";

export default async function OrderPage({ params }: { params: { orderId: string } }) { if (!/^\d+$/.test(params.orderId)) notFound(); const data = await getAccountResource<{ ok: true; order: CustomerOrderDetail }>(`orders/${params.orderId}`); if (!data) notFound(); return <div><a href="/account/orders" className="text-sm font-semibold text-brand-700">&larr; Back to orders</a><div className="mt-5"><OrderDetailView order={data.order} /></div></div>; }