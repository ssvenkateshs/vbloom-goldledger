/**
 * Minimal RFC 4180 CSV codec. Fields are quoted when they contain a comma,
 * quote, CR or LF; quotes are doubled. Output uses CRLF line endings and a
 * UTF-8 BOM is *not* added (spreadsheet apps detect UTF-8 without it; the BOM
 * breaks naive parsers).
 */

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: readonly string[], rows: readonly CsvRow[]): string {
  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvEscape(row[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // tolerate a BOM on input
  for (; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Parse CSV with a header row into objects keyed by header. */
export function parseCsvObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body.map((r) => {
    const obj: Record<string, string> = {};
    keys.forEach((k, idx) => {
      obj[k] = r[idx] ?? '';
    });
    return obj;
  });
}
