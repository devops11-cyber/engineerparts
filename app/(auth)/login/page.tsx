import type { Metadata } from "next";
import { LoginForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: { redirect?: string; verified?: string; reset?: string } }) {
  return <LoginForm redirectTo={searchParams.redirect} verified={searchParams.verified === "1"} reset={searchParams.reset === "1"} />;
}