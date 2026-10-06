"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { CUSTOMER_TYPES, validPassword, type AccountCustomer, type CustomerAddress } from "@/lib/account";
import type { WooCountry } from "@/lib/woocommerce";

async function updateAccount(path: string, body: unknown, method: "PUT" | "POST" = "PUT") {
  const response = await fetch(`/api/account${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json()) as { ok: boolean; error?: string; message?: string };
  if (!response.ok) throw new Error(data.error || "Unable to save your changes.");
  return data;
}

export function ProfileForm({ customer }: { customer: AccountCustomer }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: customer.firstName, lastName: customer.lastName, email: customer.email,
    phone: customer.phone, company: customer.company, jobTitle: customer.jobTitle,
    department: customer.department, vatNumber: customer.vatNumber,
    companyWebsite: customer.companyWebsite, customerType: customer.customerType,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const data = await updateAccount("", form); await refreshUser(); toast(data.message || "Profile updated."); router.refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update your profile."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="card p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2">
    <Field label="First name"><input className="field" autoComplete="given-name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required /></Field>
    <Field label="Last name"><input className="field" autoComplete="family-name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required /></Field>
    <Field label="Email"><input className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></Field>
    <Field label="Phone"><input className="field" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
    <Field label="Company"><input className="field" autoComplete="organization" value={form.company} onChange={(e) => update("company", e.target.value)} /></Field>
    <Field label="Job title"><input className="field" autoComplete="organization-title" value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} /></Field>
    <Field label="Department"><input className="field" value={form.department} onChange={(e) => update("department", e.target.value)} /></Field>
    <Field label="VAT / TRN"><input className="field" value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} /></Field>
    <Field label="Company website"><input className="field" type="url" autoComplete="url" value={form.companyWebsite} onChange={(e) => update("companyWebsite", e.target.value)} /></Field>
    <Field label="Customer type"><select className="field" value={form.customerType} onChange={(e) => update("customerType", e.target.value)}><option value="">Select type</option>{CUSTOMER_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
  </div><FormError message={error} /><button className="btn-primary mt-5" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button></form>;
}

export function AddressesForm({ customer, countries }: { customer: AccountCustomer; countries: WooCountry[] }) {
  const router = useRouter(); const { toast } = useToast();
  const [billing, setBilling] = useState(customer.billingAddress);
  const [shipping, setShipping] = useState(customer.shippingAddress);
  const [same, setSame] = useState(JSON.stringify(customer.billingAddress) === JSON.stringify(customer.shippingAddress));
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { const data = await updateAccount("/addresses", { billing, shipping, sameAsBilling: same }); toast(data.message || "Addresses updated."); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update addresses."); } finally { setSaving(false); } }
  return <form onSubmit={submit} className="space-y-5"><AddressPanel title="Billing address" value={billing} onChange={setBilling} countries={countries} billing /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={same} onChange={(e) => setSame(e.target.checked)} />Shipping address is the same as billing</label>{!same ? <AddressPanel title="Shipping address" value={shipping} onChange={setShipping} countries={countries} /> : null}<FormError message={error} /><button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save addresses"}</button></form>;
}

export function SecurityForm({ activeSessionCount }: { activeSessionCount: number }) {
  const router = useRouter(); const { toast } = useToast();
  const [currentPassword, setCurrent] = useState(""); const [newPassword, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); if (!validPassword(newPassword)) return setError("New password must be at least 8 characters and contain letters and numbers."); if (newPassword !== confirm) return setError("Passwords do not match."); setSaving(true); try { await updateAccount("/security/password", { currentPassword, newPassword }); toast("Password changed. Please sign in again."); router.replace("/login"); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to change password."); setSaving(false); } }
  return <div className="space-y-5"><div className="card max-w-2xl p-5 sm:p-6"><p className="eyebrow text-brand-700">Active sessions</p><p className="mt-2 text-2xl font-extrabold">{activeSessionCount}</p><p className="mt-1 text-sm text-steel-600">Changing your password signs out every active session.</p></div><form onSubmit={submit} className="card max-w-2xl space-y-4 p-5 sm:p-6"><Field label="Current password"><input className="field" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required /></Field><Field label="New password"><input className="field" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNext(e.target.value)} required /></Field><Field label="Confirm new password"><input className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></Field><FormError message={error} /><button className="btn-primary" disabled={saving}>{saving ? "Changing password..." : "Change password"}</button></form></div>;
}

function AddressPanel({ title, value, onChange, countries, billing = false }: { title: string; value: CustomerAddress; onChange: (value: CustomerAddress) => void; countries: WooCountry[]; billing?: boolean }) {
  const update = (key: keyof CustomerAddress, next: string) => onChange({ ...value, [key]: next });
  return <section className="card p-5 sm:p-6"><h2 className="text-lg font-extrabold text-navy-900">{title}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="First name"><input className="field" value={value.firstName} onChange={(e) => update("firstName", e.target.value)} required /></Field><Field label="Last name"><input className="field" value={value.lastName} onChange={(e) => update("lastName", e.target.value)} required /></Field><div className="sm:col-span-2"><Field label="Company"><input className="field" value={value.company} onChange={(e) => update("company", e.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Address line 1"><input className="field" value={value.address1} onChange={(e) => update("address1", e.target.value)} required /></Field></div><div className="sm:col-span-2"><Field label="Address line 2"><input className="field" value={value.address2} onChange={(e) => update("address2", e.target.value)} /></Field></div><Field label="City"><input className="field" value={value.city} onChange={(e) => update("city", e.target.value)} required /></Field><Field label="State / Emirate"><input className="field" value={value.state} onChange={(e) => update("state", e.target.value)} /></Field><Field label="Postal code"><input className="field" value={value.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></Field><Field label="Country"><select className="field" value={value.country || "AE"} onChange={(e) => update("country", e.target.value)} required>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></Field>{billing ? <><Field label="Email"><input className="field" type="email" value={value.email} onChange={(e) => update("email", e.target.value)} required /></Field><Field label="Phone"><input className="field" type="tel" value={value.phone} onChange={(e) => update("phone", e.target.value)} required /></Field></> : null}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="field-label">{label}</span>{children}</label>; }
function FormError({ message }: { message: string }) { return message ? <p role="alert" className="mt-4 rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm font-semibold text-signal-700">{message}</p> : null; }