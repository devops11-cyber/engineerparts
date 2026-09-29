import type { ConditionGrade, ListingBadge, ProductStatus } from "@/lib/types";
import { conditionTone, statusStyle } from "@/lib/utils";

const BADGE_TONE: Record<ListingBadge, string> = {
  CLEARANCE: "bg-signal-600 text-white",
  SURPLUS: "bg-navy-900 text-white",
  "AGED STOCK": "bg-steel-700 text-white",
  LOT: "bg-brand-700 text-white",
  EQUIPMENT: "bg-navy-800 text-white",
};

export function ListingBadges({ badges, className = "" }: { badges: ListingBadge[]; className?: string }) {
  if (!badges.length) return null;
  return (
    <div className={["flex flex-wrap items-center gap-1.5", className].join(" ")}>
      {badges.map((badge) => (
        <span
          key={badge}
          className={[
            "inline-flex items-center rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            BADGE_TONE[badge],
          ].join(" ")}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

export function StatusPill({ status, className = "" }: { status: ProductStatus; className?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        statusStyle(status),
        className,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function ConditionPill({
  condition,
  className = "",
}: {
  condition: ConditionGrade;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        conditionTone(condition),
        className,
      ].join(" ")}
    >
      {condition}
    </span>
  );
}
