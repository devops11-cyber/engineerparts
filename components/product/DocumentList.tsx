"use client";

import { useToast } from "@/components/providers/ToastProvider";
import type { DocumentRef } from "@/lib/types";
import { track } from "@/lib/analytics";

export function DocumentList({
  documents,
  reference,
  source,
}: {
  documents: DocumentRef[];
  reference: string;
  source: string;
}) {
  const { toast } = useToast();

  if (!documents.length) {
    return <p className="text-sm text-steel-500">No documents published for this listing yet.</p>;
  }

  return (
    <ul className="divide-y divide-navy-100 rounded-card border border-navy-100">
      {documents.map((doc) => (
        <li key={doc.name} className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-[10px] font-bold text-white">
              {doc.type}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-900">{doc.name}</p>
              <p className="text-xs text-steel-500">
                {doc.size} &middot; {reference}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              track("document_download", { reference, source, document: doc.name, format: doc.type });
              toast(`${doc.name} requested. The clearance desk will send this document.`);
            }}
            className="btn-outline btn-sm shrink-0"
          >
            Download
          </button>
        </li>
      ))}
    </ul>
  );
}
