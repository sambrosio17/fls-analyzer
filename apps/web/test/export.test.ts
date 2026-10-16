import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, zip } from '../src/export/zip.ts';
import { columnName, toCsv, toXlsx } from '../src/export/table.ts';
import { fieldPermissionBundle, metadataBundle } from '../src/export/metadata.ts';
import { getExportState, runExport } from '../src/export/progress.ts';

const unzipList = (data: Uint8Array) => {
  const dir = mkdtempSync(join(tmpdir(), 'zip-'));
  const file = join(dir, 'a.zip');
  writeFileSync(file, data);
  return { dir, file };
};

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('writes an archive Python can read back', async () => {
    const { file } = unzipList(await zip([{ path: 'a.txt', content: 'ciao' }, { path: 'dir/è.xml', content: '<x/>' }]));
    const out = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("|".join(n+"="+z.read(n).decode() for n in z.namelist()))', file]).toString().trim();
    expect(out).toBe('a.txt=ciao|dir/è.xml=<x/>');
  });
});

describe('csv', () => {
  it('quotes when needed and uses ; where the decimal separator is a comma', async () => {
    expect(await toCsv([['a', 'b,c'], ['say "hi"', 1]], 'en-US')).toBe('﻿a,"b,c"\r\n"say ""hi""",1\r\n');
    expect(await toCsv([['a', 'b;c']], 'it-IT')).toBe('﻿a;"b;c"\r\n');
  });
});

describe('xlsx', () => {
  it('names columns like Excel', () => {
    expect([0, 25, 26, 51, 52, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA']);
  });
  it('writes a workbook with escaped shared strings', async () => {
    const { file } = unzipList(await toXlsx([{ name: 'FLS: Account', rows: [['Field', 'Read'], ['A & B <x>', true], ['n', 3]] }]));
    const out = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(z.read("xl/workbook.xml").decode()); print(z.read("xl/sharedStrings.xml").decode()); print(z.read("xl/worksheets/sheet1.xml").decode())', file]).toString();
    expect(out).toContain('name="FLS  Account"');
    expect(out).toContain('<si><t xml:space="preserve">A &amp; B &lt;x&gt;</t></si>');
    expect(out).toContain('<c r="A2" t="s"><v>2</v></c>');
    expect(out).toContain('<c r="B2" t="b"><v>1</v></c>');
    expect(out).toContain('<c r="B3"><v>3</v></c>');
  });
});

describe('metadata bundle', () => {
  it('writes field permissions per profile and permission set with a package.xml', () => {
    const files = fieldPermissionBundle([
      { kind: 'Profile', fullName: 'Admin', access: [2, 0] },
      { kind: 'PermissionSet', fullName: 'Sales_Ops', access: [1, 2] }
    ], ['Account.Rating', 'Account.Industry']);
    const byPath = Object.fromEntries(files.map(f => [f.path, String(f.content)]));
    expect(Object.keys(byPath)).toEqual([
      'manifest/package.xml', 'force-app/main/default/profiles/Admin.profile-meta.xml',
      'force-app/main/default/permissionsets/Sales_Ops.permissionset-meta.xml', 'sfdx-project.json'
    ]);
    expect(byPath['manifest/package.xml']).toContain('<members>Sales_Ops</members>\n        <name>PermissionSet</name>');
    const admin = byPath['force-app/main/default/profiles/Admin.profile-meta.xml']!;
    expect(admin.indexOf('Account.Industry')).toBeLessThan(admin.indexOf('Account.Rating'));
    expect(admin).toContain('<editable>false</editable>\n        <field>Account.Industry</field>\n        <readable>false</readable>');
    expect(admin).toContain('<editable>true</editable>\n        <field>Account.Rating</field>\n        <readable>true</readable>');
  });
});

describe('apex metadata bundle', () => {
  it('writes classAccesses with the class names, namespace included', () => {
    const files = fieldPermissionBundle([{ kind: 'PermissionSet', fullName: 'Sales_Ops', access: [1, 0] }],
      ['ApexClass.AccountController', 'ApexClass.SBQQ__QuoteCalculator'], 'apex');
    const ps = String(files.find(f => f.path.endsWith('Sales_Ops.permissionset-meta.xml'))!.content);
    expect(ps).toContain('<classAccesses>\n        <apexClass>AccountController</apexClass>\n        <enabled>true</enabled>\n    </classAccesses>');
    expect(ps).toContain('<apexClass>SBQQ__QuoteCalculator</apexClass>\n        <enabled>false</enabled>');
    expect(ps).not.toContain('fieldPermissions');
  });
});

describe('progress', () => {
  it('reports rising progress up to 1 while writing a big workbook', async () => {
    const seen: number[] = [];
    const rows = Array.from({ length: 5000 }, (_, i) => [`field ${i}`, i % 2 === 0, i]);
    await toXlsx([{ name: 'A', rows }, { name: 'B', rows }], async f => { seen.push(f); });
    expect(seen.length).toBeGreaterThan(10);
    expect(seen.every((f, i) => i === 0 || f >= seen[i - 1]!)).toBe(true);
    expect(seen.at(-1)).toBe(1);
  });
  it('writes the same bytes with a progress callback as without', async () => {
    const rows = [['a', 1], ['b', true]];
    expect(await toCsv(rows, 'en-US', async () => {})).toBe(await toCsv(rows, 'en-US'));
  });
  it('runs one export at a time and keeps the note it returns', async () => {
    let release!: () => void;
    let second = false;
    const first = runExport('A', () => new Promise<string>(r => { release = () => r('left out'); }));
    await new Promise(r => setTimeout(r, 5));
    await runExport('B', () => { second = true; });
    expect(second).toBe(false);
    release();
    await first;
    expect(getExportState()).toMatchObject({ label: 'A', status: 'done', message: 'left out' });
  });
});

describe('change set metadata', () => {
  it('writes only each target\'s own rows, Apex classes before fields', () => {
    const files = metadataBundle([
      { kind: 'PermissionSet', fullName: 'Sales_Ops', entries: [{ name: 'Account.Rating', access: 0 }, { name: 'ApexClass.InvoiceBatch', access: 1 }] },
      { kind: 'Profile', fullName: 'Admin', entries: [{ name: 'Contact.Email', access: 2 }] }
    ]);
    const byPath = Object.fromEntries(files.map(f => [f.path, String(f.content)]));
    const ps = byPath['force-app/main/default/permissionsets/Sales_Ops.permissionset-meta.xml']!;
    expect(ps.indexOf('<classAccesses>')).toBeLessThan(ps.indexOf('<fieldPermissions>'));
    expect(ps).toContain('<field>Account.Rating</field>\n        <readable>false</readable>');
    expect(ps).not.toContain('Contact.Email');
    expect(byPath['force-app/main/default/profiles/Admin.profile-meta.xml']).not.toContain('Account.Rating');
    expect(byPath['manifest/package.xml']).toContain('<members>Sales_Ops</members>\n        <name>PermissionSet</name>');
  });
});
