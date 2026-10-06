import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <section className="section bg-navy-50"><div className="shell flex min-h-[65vh] items-center justify-center">{children}</div></section>;
}