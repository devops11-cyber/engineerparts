import { EnquiriesView } from "@/components/account/AccountViews";
import { getAccountResource } from "@/lib/auth-server";
import type { CustomerEnquiry } from "@/lib/account";

export default async function EnquiriesPage() { const data = await getAccountResource<{ ok: true; enquiries: CustomerEnquiry[] }>("enquiries"); return <div><h2 className="text-xl font-extrabold">Enquiries / RFQs</h2><p className="mt-1 text-sm text-steel-600">Persistent enquiries associated with your verified WooCommerce account.</p><div className="mt-5">{data ? <EnquiriesView enquiries={data.enquiries} /> : <p className="card p-5 text-sm text-signal-700">Enquiries are temporarily unavailable.</p>}</div></div>; }