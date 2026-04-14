function escapeCsvCell(cell: unknown): string {
  const s = cell == null ? "" : String(cell);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function encodeCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\n");
}

export function csvAttachmentFilename(prefix: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${prefix}-${d}.csv`;
}
