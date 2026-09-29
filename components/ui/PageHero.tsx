import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

export function PageHero({
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
  tone = "dark",
}: {
  breadcrumbs: Crumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <section className={dark ? "border-b border-navy-800 bg-navy-950" : "border-b border-navy-100 bg-navy-50"}>
      <div className="shell py-9 lg:py-12">
        <Breadcrumbs items={breadcrumbs} light={dark} />
        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className={["eyebrow", dark ? "text-brand-300" : "text-brand-600"].join(" ")}>
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={[
                "mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl",
                dark ? "text-white" : "text-navy-900",
              ].join(" ")}
            >
              {title}
            </h1>
            {description ? (
              <p
                className={[
                  "mt-4 text-sm leading-relaxed sm:text-base",
                  dark ? "text-steel-300" : "text-steel-600",
                ].join(" ")}
              >
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
