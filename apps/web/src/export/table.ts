import { zip } from './zip.ts';
import { mapWithProgress, noProgress, part, type Progress } from './progress.ts';

/** A sheet of plain values; the first row is the header. */
export interface Sheet { name: string; rows: (string | number | boolean | null)[][] }

const cellText = (v: string | number | boolean | null) => v === null ? '' : String(v);

/** CSV with a BOM so Excel reads UTF-8. `;` where the decimal separator is a comma, as Excel expects there. */
export async function toCsv(rows: Sheet['rows'], locale: string, p: Progress = noProgress): Promise<string> {
  const sep = (1.5).toLocaleString(locale).includes(',') ? ';' : ',';
  const quote = (s: string) => /[",;\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
  const lines = await mapWithProgress(rows, r => r.map(v => quote(cellText(v))).join(sep), part(p, 0, 1, 'write'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Characters XML 1.0 does not allow at all.
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

export function columnName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Excel sheet names: at most 31 characters, none of []:*?/\, unique in the workbook. */
function sheetNames(sheets: Sheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((s, i) => {
    const base = (s.name.replace(/[[\]:*?/\\]/g, ' ').trim() || `Sheet${i + 1}`).slice(0, 31);
    let name = base;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base.slice(0, 31 - String(k).length - 1)} ${k}`;
    used.add(name.toLowerCase());
    return name;
  });
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Strings go to the shared table once each: profile, object and access names repeat on every row. */
class SharedStrings {
  readonly list: string[] = [];
  private readonly index = new Map<string, number>();
  ref(s: string): number {
    let i = this.index.get(s);
    if (i === undefined) { i = this.list.length; this.index.set(s, i); this.list.push(s); }
    return i;
  }
}

const enc = new TextEncoder();

/** Encodes the parts a slice at a time, so a big file never becomes one giant string. */
async function encodeParts(count: number, part: (i: number) => string, p: Progress, slice = 2000): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < count; i += slice) {
    let s = '';
    for (let k = i; k < Math.min(count, i + slice); k++) s += part(k);
    chunks.push(enc.encode(s));
    await p(Math.min(count, i + slice) / count);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

async function sheetXml(rows: Sheet['rows'], strings: SharedStrings, p: Progress): Promise<Uint8Array> {
  const width = rows.reduce((w, r) => Math.max(w, r.length), 1);
  const cols = Array.from({ length: width }, (_, j) => columnName(j));
  const filter = rows.length > 1 ? `<autoFilter ref="A1:${cols[width - 1]}${rows.length}"/>` : '';
  const head = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>`;
  const tail = `</sheetData>${filter}</worksheet>`;
  return encodeParts(rows.length + 2, k => {
    if (k === 0) return head;
    if (k === rows.length + 1) return tail;
    const i = k - 1, r = rows[i]!, style = i === 0 ? ' s="1"' : '';
    let out = `<row r="${i + 1}">`;
    for (let j = 0; j < r.length; j++) {
      const v = r[j], ref = `${cols[j]}${i + 1}`;
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'number' && Number.isFinite(v)) out += `<c r="${ref}"${style}><v>${v}</v></c>`;
      else if (typeof v === 'boolean') out += `<c r="${ref}"${style} t="b"><v>${v ? 1 : 0}</v></c>`;
      else out += `<c r="${ref}"${style} t="s"><v>${strings.ref(String(v))}</v></c>`;
    }
    return out + '</row>';
  }, p);
}

/** An .xlsx workbook with a bold, frozen and filterable header row on every sheet. */
export async function toXlsx(sheets: Sheet[], p: Progress = noProgress): Promise<Uint8Array> {
  const names = sheetNames(sheets);
  // Writing the XML takes most of the time; split it by row count.
  const totalRows = sheets.reduce((n, s) => n + s.rows.length, 0) || 1;
  const strings = new SharedStrings();
  const xml: Uint8Array[] = [];
  let before = 0;
  for (const s of sheets) {
    xml.push(await sheetXml(s.rows, strings, part(p, 0.75 * before / totalRows, 0.75 * (before + s.rows.length) / totalRows, 'write')));
    before += s.rows.length;
  }
  const shared = await encodeParts(strings.list.length + 2, k =>
    k === 0 ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="${NS}" count="${strings.list.length}" uniqueCount="${strings.list.length}">`
      : k === strings.list.length + 1 ? '</sst>'
        : `<si><t xml:space="preserve">${xmlEscape(strings.list[k - 1]!)}</t></si>`, part(p, 0.75, 0.8, 'write'));
  return zip([
    { path: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { path: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { path: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${names.map((n, i) => `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { path: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rId${sheets.length + 2}" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>` },
    { path: 'xl/styles.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    { path: 'xl/sharedStrings.xml', content: shared },
    ...xml.map((content, i) => ({ path: `xl/worksheets/sheet${i + 1}.xml`, content }))
  ], part(p, 0.8, 1, 'compress'));
}

/** Today's date for file names, e.g. 2026-10-16. */
export const stamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Safe piece of a file name. */
export const slug = (s: string) => s.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'export';

export function download(name: string, content: string | Uint8Array, type: string) {
  const blob = new Blob([content as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_TYPE = 'text/csv;charset=utf-8';
