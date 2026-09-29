import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryCard({ category, count }: { category: Category; count: number }) {
  return (
    <Link
      href={`/clearance/${category.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-all hover:border-brand-300 hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-navy-50">
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200">
            {count} items in clearance
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-white">{category.name}</h3>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 p-4">
        <p className="text-sm leading-relaxed text-steel-600">{category.description}</p>
        <span aria-hidden className="mt-0.5 shrink-0 text-brand-600 transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </div>
    </Link>
  );
}
