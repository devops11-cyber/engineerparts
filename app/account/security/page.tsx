import { SecurityForm } from "@/components/account/AccountForms";
import { getAccountResource } from "@/lib/auth-server";
import type { AccountCustomer } from "@/lib/account";

export default async function SecurityPage() { const data = await getAccountResource<{ ok: true; customer: AccountCustomer }>(); return <div><h2 className="text-xl font-extrabold">Account security</h2><p className="mt-1 text-sm text-steel-600">Manage your password and active EngineerParts sessions.</p><div className="mt-5">{data ? <SecurityForm activeSessionCount={data.customer.activeSessionCount} /> : <p className="card p-5 text-sm text-signal-700">Security information is temporarily unavailable.</p>}</div></div>; }