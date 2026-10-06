"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readLeads } from "@/lib/leads";
import type { Lead } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function EnquiryList() {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    setLeads(readLeads());
  }, []);

  if (leads === null) {
    return <p className="text-sm text-steel-600">Loading enquiries...</p>;
  }

  if (!leads.length) {
    return (
      <div className="rounded-card border border-dashed border-navy-200 bg-navy-50/60 p-6 text-center sm:p-10">
        <p className="text-lg font-bold text-navy-900">No enquiries yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
          When you enquire or request a whole lot, the reference will appear here.
        </p>
        <Link href="/clearance" className="btn-primary mt-5 inline-flex">
          Browse clearance stock
        </Link>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Enquiries table, scroll horizontally for more columns" tabIndex={0} className="overflow-x-auto rounded-card border border-navy-100 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-navy-900 text-left text-[11px] font-bold uppercase tracking-wide text-white">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {leads.map((lead) => (
            <tr key={lead.lead_id} className="even:bg-navy-50/50">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">{lead.lead_id}</td>
              <td className="px-4 py-3 capitalize text-navy-800">{lead.lead_type.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-navy-800">
                {lead.sku || lead.lot_id || lead.equipment_id || "General"}
              </td>
              <td className="px-4 py-3 text-navy-800">{lead.company}</td>
              <td className="px-4 py-3 font-semibold capitalize text-navy-900">{lead.status}</td>
              <td className="px-4 py-3 text-steel-600">{formatDate(lead.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
