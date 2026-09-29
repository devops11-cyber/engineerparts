import { track } from "@/lib/analytics";

function triggerDownload(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export interface DownloadRow {
  [key: string]: string | number;
}

export function downloadCsv(
  filename: string,
  rows: DownloadRow[],
  meta: { reference: string; source: string },
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ];
  track("document_download", { reference: meta.reference, source: meta.source, format: "csv" });
  triggerDownload(filename, "text/csv;charset=utf-8", lines.join("\n"));
}
