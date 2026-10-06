"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { CUSTOMER_TYPES, safeRedirect, validPassword, type AuthResponse } from "@/lib/account";
import type { WooCountry } from "@/lib/woocommerce";

async function authRequest(action: string, body: Record<string, unknown>): Promise<AuthResponse> {
  const response = await fetch(`/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as AuthResponse;
  if (!response.ok) throw new Error(data.error || "Unable to complete this request.");
  return data;
}

export function LoginForm({ redirectTo, verified, reset }: { redirectTo?: string; verified?: boolean; reset?: boolean }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authRequest("login", { email, password, remember });
      await refreshUser();
      router.replace(safeRedirect(redirectTo));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Incorrect email or password.");
      setSubmitting(false);
    }
  }

  return (
    <AuthCard eyebrow="Customer account" title="Sign in" description="Access your orders, enquiries and saved account details.">
      {verified ? <Status>Thanks, your email is verified. You can sign in now.</Status> : null}
      {reset ? <Status>Your password has been updated. Sign in with your new password.</Status> : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email address" htmlFor="login-email">
          <input id="login-email" type="email" autoComplete="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <PasswordInput id="login-password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-brand-600" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-700 hover:text-brand-600">Forgot password?</Link>
        </div>
        <FormError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
      </form>
      <p className="mt-6 border-t border-navy-100 pt-5 text-center text-sm text-steel-600">
        New to EngineerParts? <Link href="/register" className="font-semibold text-brand-700">Create account</Link>
      </p>
    </AuthCard>
  );
}

interface RegisterState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  password: string;
  confirmPassword: string;
  jobTitle: string;
  department: string;
  companyWebsite: string;
  country: string;
  vatNumber: string;
  customerType: string;
}

const EMPTY_REGISTER: RegisterState = {
  firstName: "", lastName: "", email: "", phone: "", company: "", password: "", confirmPassword: "",
  jobTitle: "", department: "", companyWebsite: "", country: "AE", vatNumber: "", customerType: "",
};

export function RegisterForm({ countries }: { countries: WooCountry[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_REGISTER);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof RegisterState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const passwordReady = validPassword(form.password);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!passwordReady) return setError("Password must be at least 8 characters and contain letters and numbers.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      await authRequest("register", payload);
      router.push(`/verify-email?sent=1&email=${encodeURIComponent(form.email)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create your account. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthCard eyebrow="Trade customer" title="Create an account" description="Create your WooCommerce customer account for faster purchasing and account services." wide>
      <form onSubmit={submit} className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="first-name"><input id="first-name" className="field" autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} required /></Field>
          <Field label="Last name" htmlFor="last-name"><input id="last-name" className="field" autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} required /></Field>
          <Field label="Email address" htmlFor="register-email"><input id="register-email" type="email" className="field" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></Field>
          <Field label="Mobile number" htmlFor="register-phone"><input id="register-phone" type="tel" className="field" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} required /></Field>
          <div className="sm:col-span-2"><Field label="Company name" htmlFor="company"><input id="company" className="field" autoComplete="organization" value={form.company} onChange={(event) => update("company", event.target.value)} required /></Field></div>
          <Field label="Password" htmlFor="register-password"><PasswordInput id="register-password" value={form.password} onChange={(value) => update("password", value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" /></Field>
          <Field label="Confirm password" htmlFor="confirm-password"><input id="confirm-password" type={showPassword ? "text" : "password"} className="field" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required /></Field>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs" aria-live="polite">
          <span className={`h-1.5 flex-1 rounded-full ${form.password.length >= 8 ? "bg-emerald-500" : "bg-navy-100"}`} />
          <span className={`h-1.5 flex-1 rounded-full ${passwordReady ? "bg-emerald-500" : "bg-navy-100"}`} />
          <span className="text-steel-600">{passwordReady ? "Password meets requirements" : "8+ characters with letters and numbers"}</span>
        </div>
        <details className="mt-6 rounded-md border border-navy-100 bg-navy-50/60 p-4">
          <summary className="cursor-pointer text-sm font-bold text-navy-900">Optional business details</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Job title" htmlFor="job-title"><input id="job-title" className="field" autoComplete="organization-title" value={form.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} /></Field>
            <Field label="Department" htmlFor="department"><input id="department" className="field" value={form.department} onChange={(event) => update("department", event.target.value)} /></Field>
            <Field label="Company website" htmlFor="company-website"><input id="company-website" type="url" className="field" autoComplete="url" value={form.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} /></Field>
            <Field label="Country" htmlFor="country"><select id="country" className="field" autoComplete="country" value={form.country} onChange={(event) => update("country", event.target.value)}>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></Field>
            <Field label="VAT / TRN number" htmlFor="vat-number"><input id="vat-number" className="field" value={form.vatNumber} onChange={(event) => update("vatNumber", event.target.value)} /></Field>
            <Field label="Customer type" htmlFor="customer-type"><select id="customer-type" className="field" value={form.customerType} onChange={(event) => update("customerType", event.target.value)}><option value="">Select customer type</option>{CUSTOMER_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
          </div>
        </details>
        <FormError message={error} />
        <button type="submit" className="btn-primary mt-5 w-full" disabled={submitting}>{submitting ? "Creating account..." : "Create account"}</button>
      </form>
      <p className="mt-6 border-t border-navy-100 pt-5 text-center text-sm text-steel-600">Already registered? <Link href="/login" className="font-semibold text-brand-700">Sign in</Link></p>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const data = await authRequest("forgot-password", { email });
      setMessage(data.message ?? "If an account exists, password reset instructions have been sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send reset instructions.");
    } finally { setSubmitting(false); }
  }

  return <AuthCard eyebrow="Account recovery" title="Reset your password" description="Enter your account email. We will send a secure reset link if an account exists.">{message ? <Status>{message}</Status> : <form onSubmit={submit} className="mt-6 space-y-4"><Field label="Email address" htmlFor="forgot-email"><input id="forgot-email" type="email" autoComplete="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field><FormError message={error} /><button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Sending..." : "Send reset instructions"}</button></form>}<p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-brand-700">Back to sign in</Link></p></AuthCard>;
}

export function ResetPasswordForm({ resetKey, login }: { resetKey?: string; login?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!resetKey || !login) return setError("This password reset link is invalid or incomplete.");
    if (!validPassword(password)) return setError("Password must be at least 8 characters and contain letters and numbers.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try { await authRequest("reset-password", { key: resetKey, login, password }); router.replace("/login?reset=1"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to reset your password."); setSubmitting(false); }
  }

  return <AuthCard eyebrow="Account security" title="Choose a new password" description="Use at least 8 characters with a combination of letters and numbers."><form onSubmit={submit} className="mt-6 space-y-4"><Field label="New password" htmlFor="new-password"><PasswordInput id="new-password" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((value) => !value)} autoComplete="new-password" /></Field><Field label="Confirm password" htmlFor="confirm-new-password"><input id="confirm-new-password" type={visible ? "text" : "password"} autoComplete="new-password" className="field" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></Field><FormError message={error} /><button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Updating password..." : "Update password"}</button></form></AuthCard>;
}

export function VerifyEmailForm({ token, email, sent }: { token?: string; email?: string; sent?: boolean }) {
  const [state, setState] = useState<"working" | "success" | "waiting" | "error">(sent ? "waiting" : "working");
  const [message, setMessage] = useState(sent ? "Account created. Check your email for a verification link before signing in." : "Verifying your email...");
  const started = useRef(false);

  useEffect(() => {
    if (sent || started.current) return;
    started.current = true;
    if (!token || !email) { setState("error"); setMessage("This verification link is invalid or incomplete."); return; }
    authRequest("verify-email", { token, email }).then((data) => { setState("success"); setMessage(data.message ?? "Email verified."); }).catch((caught) => { setState("error"); setMessage(caught instanceof Error ? caught.message : "Unable to verify this email."); });
  }, [email, sent, token]);

  async function resend() {
    if (!email) return;
    try { const data = await authRequest("resend-verification", { email }); setState("waiting"); setMessage(data.message ?? "A new verification email has been sent."); }
    catch (caught) { setState("error"); setMessage(caught instanceof Error ? caught.message : "Unable to resend verification."); }
  }

  return <AuthCard eyebrow="Email verification" title={state === "success" ? "Email verified" : "Check your email"} description={message}><div className="mt-6 flex flex-col gap-3 sm:flex-row">{state === "success" ? <Link href="/login?verified=1" className="btn-primary flex-1">Continue to sign in</Link> : <button type="button" className="btn-outline flex-1" onClick={resend} disabled={!email || state === "working"}>Resend verification</button>}<Link href="/login" className="btn-outline flex-1">Back to sign in</Link></div></AuthCard>;
}

function AuthCard({ eyebrow, title, description, wide = false, children }: { eyebrow: string; title: string; description: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`card w-full p-5 sm:p-7 ${wide ? "max-w-3xl" : "max-w-lg"}`}><p className="eyebrow text-brand-700">{eyebrow}</p><h1 className="mt-2 text-2xl font-extrabold text-navy-950 sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-steel-600">{description}</p>{children}</div>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="field-label">{label}</label>{children}</div>;
}

function PasswordInput({ id, value, onChange, visible, onToggle, autoComplete = "current-password" }: { id: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; autoComplete?: "current-password" | "new-password" }) {
  return <div className="relative"><input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} className="field pr-16" value={value} onChange={(event) => onChange(event.target.value)} required /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 px-3 text-xs font-bold text-brand-700" aria-label={`${visible ? "Hide" : "Show"} password`}>{visible ? "Hide" : "Show"}</button></div>;
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-4 rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm font-semibold text-signal-700">{message}</p> : null;
}

function Status({ children }: { children: React.ReactNode }) {
  return <p role="status" className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{children}</p>;
}