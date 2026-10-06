import type { SpecItem } from "@/lib/types";

export function SpecTable({ specs }: { specs: SpecItem[] }) {
  if (!specs.length) return <p className="text-sm text-steel-500">No specifications recorded.</p>;
  return (
    <div className="overflow-hidden rounded-card border border-navy-100">
      <table aria-label="Product specifications" className="w-full text-sm">
        <tbody className="divide-y divide-navy-100">
          {specs.map((spec) => (
            <tr key={`${spec.label}-${spec.value}`} className="grid even:bg-navy-50/50 sm:table-row">
              <th scope="row" className="px-4 pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-steel-500 sm:w-1/3 sm:py-3">
                {spec.label}
              </th>
              <td className="break-words px-4 pb-3 font-semibold text-navy-900 sm:py-3">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
