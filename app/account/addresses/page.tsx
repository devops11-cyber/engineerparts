import { AddressesForm } from "@/components/account/AccountForms";
import { getAccountResource } from "@/lib/auth-server";
import { getWooCommerceCountries } from "@/lib/woocommerce";
import type { AccountCustomer } from "@/lib/account";

export default async function AddressesPage() { const [data, countries] = await Promise.all([getAccountResource<{ ok: true; customer: AccountCustomer }>(), getWooCommerceCountries()]); return <div><h2 className="text-xl font-extrabold">Addresses</h2><p className="mt-1 text-sm text-steel-600">Manage the WooCommerce addresses used for purchasing and delivery.</p><div className="mt-5">{data ? <AddressesForm customer={data.customer} countries={countries} /> : <p className="card p-5 text-sm text-signal-700">Addresses are temporarily unavailable.</p>}</div></div>; }