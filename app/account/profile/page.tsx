import { ProfileForm } from "@/components/account/AccountForms";
import { getAccountResource } from "@/lib/auth-server";
import type { AccountCustomer } from "@/lib/account";

export default async function ProfilePage() { const data = await getAccountResource<{ ok: true; customer: AccountCustomer }>(); return <div><h2 className="text-xl font-extrabold">Profile</h2><p className="mt-1 text-sm text-steel-600">Manage your contact and B2B company details.</p><div className="mt-5">{data ? <ProfileForm customer={data.customer} /> : <Unavailable />}</div></div>; }
function Unavailable() { return <p className="card p-5 text-sm text-signal-700">Account details are temporarily unavailable.</p>; }