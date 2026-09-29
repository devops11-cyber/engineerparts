import type { SpecItem } from "@/lib/types";

export function SpecTable({ specs }: { specs: SpecItem[] }) {
  if (!specs.length) return <p className="text-sm text-steel-500">No specifications recorded.</p>;
  return (
    <div className="overflow-hidden rounded-card border border-navy-100">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-navy-100">
          {specs.map((spec) => (
            <tr key={`${spec.label}-${spec.value}`} className="even:bg-navy-50/50">
              <th scope="row" className="w-1/3 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-steel-500">
                {spec.label}
              </th>
              <td className="px-4 py-3 font-semibold text-navy-900">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
