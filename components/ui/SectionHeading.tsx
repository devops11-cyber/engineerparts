import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  light = false,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  light?: boolean;
  align?: "left" | "center";
}) {
  return (
    <div
      className={[
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" ? "text-center sm:text-left" : "",
      ].join(" ")}
    >
      <div className={align === "center" ? "mx-auto max-w-2xl sm:mx-0" : "max-w-2xl"}>
        {eyebrow ? (
          <p className={["eyebrow mb-2", light ? "text-brand-300" : "text-brand-600"].join(" ")}>
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={[
            "text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[34px]",
            light ? "text-white" : "text-navy-900",
          ].join(" ")}
        >
          {title}
        </h2>
        {description ? (
          <p className={["mt-3 text-sm leading-relaxed sm:text-base", light ? "text-steel-300" : "text-steel-600"].join(" ")}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className={[
            "group inline-flex shrink-0 items-center gap-2 text-sm font-semibold transition-colors",
            light ? "text-white hover:text-brand-300" : "text-brand-700 hover:text-brand-500",
          ].join(" ")}
        >
          {action.label}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </Link>
      ) : null}
    </div>
  );
}
