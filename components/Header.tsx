"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";
import { useCart } from "@/components/providers/CartProvider";
import { useEnquiry } from "@/components/providers/EnquiryProvider";
import { primaryNav } from "@/lib/nav";
import { track } from "@/lib/analytics";
import { WHATSAPP_NUMBER, cn, whatsappLink } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { count } = useCart();
  const { openEnquiry } = useEnquiry();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  function onWhatsApp(context = "General enquiry") {
    track("whatsapp_click", { source: context });
    const message = encodeURIComponent(
      `Hello Engineerparts.com, I would like to enquire about your clearance stock. (${context})`,
    );
    window.open(whatsappLink(decodeURIComponent(message)), "_blank", "noopener");
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-navy-100 bg-white transition-shadow",
          scrolled && "shadow-header",
        )}
      >
        <div className="shell flex items-center gap-4 py-3 lg:gap-6">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden lg:block">
            <Logo />
          </div>

          <div className="hidden flex-1 lg:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            <HeaderAction
              href="/account"
              label="Account"
              icon={<UserIcon />}
              className="hidden xl:flex"
            />
            <HeaderAction
              href="/my-enquiries"
              label="My Enquiries"
              icon={<InboxIcon />}
              className="hidden xl:flex"
            />
            <HeaderAction
              href="/cart"
              label="Cart"
              icon={<CartIcon />}
              badge={count}
              className="hidden sm:flex"
            />
            {WHATSAPP_NUMBER ? <button
              type="button"
              onClick={() => onWhatsApp("Header button")}
              className="btn hidden h-10 border border-emerald-300 bg-emerald-50 px-3 text-emerald-800 hover:bg-emerald-100 lg:inline-flex"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon />
              <span className="text-xs font-semibold">WhatsApp</span>
            </button> : null}
            <button
              type="button"
              onClick={() => openEnquiry({ mode: "bulk", heading: "Sell / Enquire a Lot" })}
              className="btn-signal btn-sm hidden lg:inline-flex"
            >
              Sell / Enquire a Lot
            </button>

            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-navy-200 text-navy-800 sm:hidden"
              aria-label={`Cart, ${count} items`}
            >
              <CartIcon />
              {count > 0 ? <CountBubble count={count} /> : null}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-navy-200 text-navy-900 lg:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        <div className="shell pb-3 lg:hidden">
          <SearchBar />
        </div>

        <nav className="hidden border-t border-navy-100 lg:block">
          <div className="shell flex items-center gap-1">
            {primaryNav.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setCategoriesOpen(true)}
                  onMouseLeave={() => setCategoriesOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setCategoriesOpen((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-3.5 py-3.5 text-[13px] font-semibold uppercase tracking-wide transition-colors",
                      isActive(item.href)
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-navy-800 hover:border-navy-300 hover:text-brand-700",
                    )}
                    aria-expanded={categoriesOpen}
                  >
                    {item.label}
                    <ChevronIcon />
                  </button>
                  {categoriesOpen ? (
                    <div className="absolute left-0 top-full z-50 w-[560px] animate-fade-in rounded-b-md border border-navy-100 bg-white p-3 shadow-lift">
                      <div className="grid grid-cols-2 gap-1">
                        {item.children.map((category) => (
                          <Link
                            key={category.href}
                            href={category.href}
                            className="rounded-md px-3 py-2.5 transition-colors hover:bg-navy-50"
                          >
                            <span className="block text-sm font-semibold text-navy-900">
                              {category.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-steel-500">
                              {category.description}
                            </span>
                          </Link>
                        ))}
                      </div>
                      <Link
                        href="/clearance"
                        className="mt-2 block border-t border-navy-100 px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-brand-700 hover:text-brand-500"
                      >
                        View all clearance stock &rarr;
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "border-b-2 px-3.5 py-3.5 text-[13px] font-semibold uppercase tracking-wide transition-colors",
                    isActive(item.href)
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-navy-800 hover:border-navy-300 hover:text-brand-700",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
            <button
              type="button"
              onClick={() => openEnquiry({ mode: "bulk", heading: "Sell / Enquire a Lot" })}
              className="ml-auto py-2.5 text-[13px] font-semibold uppercase tracking-wide text-signal-600 hover:text-signal-700"
            >
              Sell / Enquire a Lot
            </button>
          </div>
        </nav>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-navy-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto bg-white pb-24">
            <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
              <Logo compact />
              {WHATSAPP_NUMBER ? <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-navy-200"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button> : null}
            </div>

            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/account" className="btn-outline btn-sm justify-start">
                  <UserIcon /> Account
                </Link>
                <Link href="/my-enquiries" className="btn-outline btn-sm justify-start">
                  <InboxIcon /> My Enquiries
                </Link>
              </div>
              <button
                type="button"
                onClick={() => onWhatsApp("Mobile menu")}
                className="btn btn-sm mt-2 w-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <WhatsAppIcon /> WhatsApp Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openEnquiry({ mode: "bulk", heading: "Sell / Enquire a Lot" });
                }}
                className="btn-signal btn-sm mt-2 w-full"
              >
                Sell / Enquire a Lot
              </button>
            </div>

            <nav className="border-t border-navy-100">
              <Link
                href="/clearance"
                className="block border-b border-navy-50 px-4 py-3.5 text-sm font-semibold uppercase tracking-wide text-navy-900"
              >
                Clearance Stock
              </Link>
              {primaryNav
                .filter((item) => !item.children && item.href !== "/clearance")
                .map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block border-b border-navy-50 px-4 py-3.5 text-sm font-semibold uppercase tracking-wide text-navy-900"
                  >
                    {item.label}
                  </Link>
                ))}
            </nav>

            <div className="px-4 py-4">
              <Link href="/about" className="text-xs leading-relaxed text-steel-600">
                About Engineerparts.com
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function HeaderAction({
  href,
  label,
  icon,
  badge,
  className = "",
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-md border border-transparent px-2.5 py-2 text-navy-800 transition-colors hover:border-navy-200 hover:text-brand-700",
        className,
      )}
    >
      {icon}
      <span className="text-xs font-semibold leading-tight">
        {label}
        {label === "Cart" ? ` (${badge ?? 0})` : ""}
      </span>
    </Link>
  );
}

function CountBubble({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal-600 px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M3.5 13.5V7.5A2 2 0 0 1 5.5 5.5h13a2 2 0 0 1 2 2v6m-17 0V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5m-17 0h4l1 2h6l1-2h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M3 5h2l2.2 10.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L20 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17.5" cy="20" r="1.3" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.9 9.9 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2Zm5.75 13.9c-.24.68-1.42 1.3-1.96 1.34-.5.05-1.12.08-1.8-.1-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.2-4.98-4.4-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.13 1.02-2.43.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.09.2-.14.32-.28.5-.14.17-.3.38-.43.51-.14.14-.29.29-.13.57.17.29.74 1.22 1.58 1.97 1.09.97 2 1.28 2.29 1.42.28.14.45.12.62-.07.17-.2.72-.84.91-1.12.19-.29.38-.24.64-.14.26.09 1.66.78 1.94.92.29.14.48.21.55.33.07.12.07.7-.17 1.38Z" />
    </svg>
  );
}

export { WhatsAppIcon };
