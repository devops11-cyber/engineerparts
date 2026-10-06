import { OrdersView } from "@/components/account/AccountViews";
import { getAccountResource } from "@/lib/auth-server";
import type { CustomerOrder } from "@/lib/account";

export default async function OrdersPage() { const data = await getAccountResource<{ ok: true; orders: CustomerOrder[] }>("orders"); return <div><h2 className="text-xl font-extrabold">Orders</h2><p className="mt-1 text-sm text-steel-600">Orders placed with your WooCommerce customer account.</p><div className="mt-5">{data ? <OrdersView orders={data.orders} /> : <p className="card p-5 text-sm text-signal-700">Orders are temporarily unavailable.</p>}</div></div>; }