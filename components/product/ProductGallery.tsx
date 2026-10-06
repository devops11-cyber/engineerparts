"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  alt,
  label = "Actual Item Photos",
}: {
  images: string[];
  alt: string;
  label?: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-navy-100 bg-navy-50">
        <Image
          src={current}
          alt={`${alt} - photo ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-contain p-3 sm:p-5"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-navy-950/85 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          {label}
        </span>
        <span className="absolute bottom-3 right-3 rounded-sm bg-navy-950/75 px-2 py-1 text-[11px] font-semibold text-white">
          {active + 1} / {images.length}
        </span>
      </div>

      <div className="no-scrollbar mt-3 flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Show photo ${index + 1}`}
            aria-pressed={active === index}
            className={cn(
              "relative aspect-[4/3] w-24 shrink-0 snap-start overflow-hidden rounded-md border bg-navy-50 transition-colors sm:w-auto",
              active === index ? "border-brand-600 ring-1 ring-brand-500" : "border-navy-100 hover:border-navy-300",
            )}
          >
            <Image src={image} alt="" fill sizes="120px" className="object-contain p-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
