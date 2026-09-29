"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { lots } from "@/lib/data/lots";
import { equipment } from "@/lib/data/equipment";
import { track } from "@/lib/analytics";
import {
  absoluteUrl,
  equipmentWhatsAppMessage,
  lotWhatsAppMessage,
  whatsappLink,
} from "@/lib/utils";

export function FloatingWhatsApp() {
  const pathname = usePathname();

  const link = useMemo(() => {
    const productMatch = pathname.match(/^\/product\/(.+)$/);
    if (productMatch) {
      return whatsappLink(
        `Hello Engineerparts.com, I would like to enquire about this product: ${absoluteUrl(pathname)}`,
      );
    }

    const lotMatch = pathname.match(/^\/lots\/(.+)$/);
    if (lotMatch) {
      const lot = lots.find(
        (l) => l.lot_reference.toLowerCase() === lotMatch[1].toLowerCase() || l.slug === lotMatch[1],
      );
      if (lot) {
        return whatsappLink(
          lotWhatsAppMessage({
            name: lot.name,
            lot_reference: lot.lot_reference,
            url: absoluteUrl(`/lots/${lot.lot_reference}`),
          }),
        );
      }
    }

    const equipmentMatch = pathname.match(/^\/equipment\/(.+)$/);
    if (equipmentMatch) {
      const unit = equipment.find(
        (e) => e.slug === equipmentMatch[1] || e.reference.toLowerCase() === equipmentMatch[1].toLowerCase(),
      );
      if (unit) {
        return whatsappLink(
          equipmentWhatsAppMessage({
            name: unit.name,
            reference: unit.reference,
            serial_number: unit.serial_number,
            url: absoluteUrl(`/equipment/${unit.slug}`),
          }),
        );
      }
    }

    return whatsappLink(
      `Hello Engineerparts.com, I would like to enquire about your clearance stock. (Page: ${pathname})`,
    );
  }, [pathname]);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { source: "Floating button", page: pathname })}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full bg-emerald-500 py-3.5 pl-3.5 pr-5 text-sm font-semibold text-white shadow-lift transition-transform hover:scale-[1.03] hover:bg-emerald-600"
      aria-label="Chat with Engineerparts.com on WhatsApp"
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.9 9.9 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2Zm5.75 13.9c-.24.68-1.42 1.3-1.96 1.34-.5.05-1.12.08-1.8-.1-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.2-4.98-4.4-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.13 1.02-2.43.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.09.2-.14.32-.28.5-.14.17-.3.38-.43.51-.14.14-.29.29-.13.57.17.29.74 1.22 1.58 1.97 1.09.97 2 1.28 2.29 1.42.28.14.45.12.62-.07.17-.2.72-.84.91-1.12.19-.29.38-.24.64-.14.26.09 1.66.78 1.94.92.29.14.48.21.55.33.07.12.07.7-.17 1.38Z" />
      </svg>
      <span className="hidden sm:inline">WhatsApp Us</span>
    </a>
  );
}
