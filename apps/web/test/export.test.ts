import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, zip } from '../src/export/zip.ts';
import { columnName, toCsv, toXlsx } from '../src/export/table.ts';
import { fieldPermissionBundle } from '../src/export/metadata.ts';

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
  it('writes an archive Python can read back', () => {
    const { file } = unzipList(zip([{ path: 'a.txt', content: 'ciao' }, { path: 'dir/è.xml', content: '<x/>' }]));
    const out = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("|".join(n+"="+z.read(n).decode() for n in z.namelist()))', file]).toString().trim();
    expect(out).toBe('a.txt=ciao|dir/è.xml=<x/>');
  });
});

describe('csv', () => {
  it('quotes when needed and uses ; where the decimal separator is a comma', () => {
    expect(toCsv([['a', 'b,c'], ['say "hi"', 1]], 'en-US')).toBe('﻿a,"b,c"\r\n"say ""hi""",1\r\n');
    expect(toCsv([['a', 'b;c']], 'it-IT')).toBe('﻿a;"b;c"\r\n');
  });
});

describe('xlsx', () => {
  it('names columns like Excel', () => {
    expect([0, 25, 26, 51, 52, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA']);
  });
  it('writes a workbook with escaped inline strings', () => {
    const { file } = unzipList(toXlsx([{ name: 'FLS: Account', rows: [['Field', 'Read'], ['A & B <x>', true], ['n', 3]] }]));
    const out = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(z.read("xl/workbook.xml").decode()); print(z.read("xl/worksheets/sheet1.xml").decode())', file]).toString();
    expect(out).toContain('name="FLS  Account"');
    expect(out).toContain('A &amp; B &lt;x&gt;');
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
