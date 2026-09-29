import Link from "next/link";

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Engineerparts.com home">
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-brand-600">
        <span className="absolute inset-x-0 bottom-0 h-1 bg-black" aria-hidden />
        <span className="display text-[17px] font-extrabold leading-none tracking-tight text-white">
          EP
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={[
            "display text-[17px] font-extrabold tracking-tight",
            light ? "text-white" : "text-navy-900",
          ].join(" ")}
        >
          Engineerparts<span className="text-brand-600">.com</span>
        </span>
        {compact ? null : (
          <span
            className={[
              "mt-1 text-[9px] font-bold uppercase tracking-[0.16em]",
              light ? "text-steel-400" : "text-steel-500",
            ].join(" ")}
          >
            Industrial surplus
          </span>
        )}
      </span>
    </Link>
  );
}
