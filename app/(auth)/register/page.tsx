import type { Metadata } from "next";
import { RegisterForm } from "@/components/account/AuthForms";
import { getWooCommerceCountries } from "@/lib/woocommerce";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  return <RegisterForm countries={await getWooCommerceCountries()} />;
}