import { xmlEscape } from './table.ts';
import type { ZipEntry } from './zip.ts';

export const API_VERSION = '62.0';

/** One profile or permission set to write, with the access to each exported field (0 none, 1 read, 2 edit). */
export interface MetaTarget { kind: 'Profile' | 'PermissionSet'; fullName: string; access: (0 | 1 | 2)[] }

const FOLDER = { Profile: 'profiles', PermissionSet: 'permissionsets' } as const;
const SUFFIX = { Profile: 'profile', PermissionSet: 'permissionset' } as const;

function permissionFile(t: MetaTarget, fields: string[]): string {
  const entries = fields.map((f, i) => ({ f, a: t.access[i] ?? 0 })).sort((x, y) => x.f.localeCompare(y.f))
    .map(({ f, a }) => `    <fieldPermissions>\n        <editable>${a === 2}</editable>\n        <field>${xmlEscape(f)}</field>\n        <readable>${a > 0}</readable>\n    </fieldPermissions>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${t.kind} xmlns="http://soap.sforce.com/2006/04/metadata">\n${entries.join('\n')}\n</${t.kind}>\n`;
}

/**
 * Field permissions in Salesforce DX source format: one file per profile or permission set holding only the
 * exported fields, plus manifest/package.xml. Deploying it sets exactly these fields and leaves the rest alone.
 */
export function fieldPermissionBundle(targets: MetaTarget[], fields: string[], root = 'force-app/main/default'): ZipEntry[] {
  const members = (kind: MetaTarget['kind']) => targets.filter(t => t.kind === kind).map(t => t.fullName).sort();
  const types = (['PermissionSet', 'Profile'] as const).filter(k => members(k).length)
    .map(k => `    <types>\n${members(k).map(m => `        <members>${xmlEscape(m)}</members>`).join('\n')}\n        <name>${k}</name>\n    </types>`);
  return [
    { path: 'manifest/package.xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n${types.join('\n')}\n    <version>${API_VERSION}</version>\n</Package>\n` },
    ...targets.map(t => ({ path: `${root}/${FOLDER[t.kind]}/${t.fullName}.${SUFFIX[t.kind]}-meta.xml`, content: permissionFile(t, fields) })),
    { path: 'sfdx-project.json', content: JSON.stringify({ packageDirectories: [{ path: 'force-app', default: true }], sourceApiVersion: API_VERSION }, null, 2) + '\n' }
  ];
}
