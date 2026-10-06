import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage({ searchParams }: { searchParams: { token?: string; email?: string; sent?: string } }) {
  return <VerifyEmailForm token={searchParams.token} email={searchParams.email} sent={searchParams.sent === "1"} />;
}