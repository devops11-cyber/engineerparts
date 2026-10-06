import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, light = false }: { items: Crumb[]; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="no-scrollbar max-w-full overflow-x-auto text-xs">
      <ol className={["flex w-max min-w-full items-center gap-1.5 whitespace-nowrap", light ? "text-steel-300" : "text-steel-500"].join(" ")}>
        <li>
          <Link href="/" className="transition-colors hover:text-brand-500">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden className={light ? "text-steel-500" : "text-steel-300"}>
              /
            </span>
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-brand-500">
                {item.label}
              </Link>
            ) : (
              <span className={["block max-w-[14rem] truncate", light ? "text-white" : "text-navy-800"].join(" ")}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
