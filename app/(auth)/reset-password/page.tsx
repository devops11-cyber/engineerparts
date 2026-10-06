import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage({ searchParams }: { searchParams: { key?: string; login?: string } }) {
  return <ResetPasswordForm resetKey={searchParams.key} login={searchParams.login} />;
}