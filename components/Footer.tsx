"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { track } from "@/lib/analytics";
import { WHATSAPP_NUMBER, whatsappLink } from "@/lib/utils";

export function Footer() {
  function onWhatsApp() {
    track("whatsapp_click", { source: "Footer" });
  }

  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-steel-300">
      <div className="shell py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(2,1fr)]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-steel-400">
              Industrial products loaded from the live Engineerparts WooCommerce catalogue.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {WHATSAPP_NUMBER ? <a
                href={whatsappLink("")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onWhatsApp}
                className="chip-dark"
              >
                WhatsApp
              </a> : null}
            </div>
          </div>

          <FooterColumn
            title="Clearance Stock"
            links={[
              { label: "All Clearance Stock", href: "/clearance" },
              { label: "Recently Added", href: "/recently-added" },
              { label: "Brands", href: "/brands" },
            ]}
          />

          <FooterColumn
            title="Company"
            links={[
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
              { label: "My Enquiries", href: "/my-enquiries" },
              { label: "Cart", href: "/cart" },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Terms & Conditions", href: "/terms" },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-navy-800 pt-7 text-xs text-steel-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Engineerparts.com. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms &amp; Conditions
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="eyebrow text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
