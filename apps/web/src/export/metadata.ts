import { xmlEscape } from './table.ts';
import type { ZipEntry } from './zip.ts';

export const API_VERSION = '62.0';

/** One profile or permission set to write, with the access to each exported field (0 none, 1 read, 2 edit). */
export interface MetaTarget { kind: 'Profile' | 'PermissionSet'; fullName: string; access: (0 | 1 | 2)[] }

const FOLDER = { Profile: 'profiles', PermissionSet: 'permissionsets' } as const;
const SUFFIX = { Profile: 'profile', PermissionSet: 'permissionset' } as const;

/** `field`: FLS rows named Object.Field. `apex`: Apex classes named ApexClass.Name, written as classAccesses. */
export type BundleKind = 'field' | 'apex';

/** One row of a permission file: a field (Object.Field) or an Apex class (ApexClass.Name), with its access. */
export interface MetaEntry { name: string; access: 0 | 1 | 2 }
/** A profile or permission set with its own rows, e.g. only the ones a change set touches. */
export interface MetaFile { kind: MetaTarget['kind']; fullName: string; entries: MetaEntry[] }

const APEX_PREFIX = 'ApexClass.';

function permissionFile(t: MetaFile): string {
  const byName = (x: MetaEntry, y: MetaEntry) => x.name.localeCompare(y.name);
  // Salesforce writes the sections in alphabetical order: classAccesses before fieldPermissions.
  const classes = t.entries.filter(e => e.name.startsWith(APEX_PREFIX)).sort(byName)
    .map(e => `    <classAccesses>\n        <apexClass>${xmlEscape(e.name.slice(APEX_PREFIX.length))}</apexClass>\n        <enabled>${e.access > 0}</enabled>\n    </classAccesses>`);
  const fields = t.entries.filter(e => !e.name.startsWith(APEX_PREFIX)).sort(byName)
    .map(e => `    <fieldPermissions>\n        <editable>${e.access === 2}</editable>\n        <field>${xmlEscape(e.name)}</field>\n        <readable>${e.access > 0}</readable>\n    </fieldPermissions>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${t.kind} xmlns="http://soap.sforce.com/2006/04/metadata">\n${[...classes, ...fields].join('\n')}\n</${t.kind}>\n`;
}

/**
 * Permission files in Salesforce DX source format: one per profile or permission set holding only its rows,
 * plus manifest/package.xml. Deploying it sets exactly these rows and leaves the rest alone.
 */
export function metadataBundle(files: MetaFile[], root = 'force-app/main/default'): ZipEntry[] {
  const members = (kind: MetaTarget['kind']) => files.filter(t => t.kind === kind).map(t => t.fullName).sort();
  const types = (['PermissionSet', 'Profile'] as const).filter(k => members(k).length)
    .map(k => `    <types>\n${members(k).map(m => `        <members>${xmlEscape(m)}</members>`).join('\n')}\n        <name>${k}</name>\n    </types>`);
  return [
    { path: 'manifest/package.xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n${types.join('\n')}\n    <version>${API_VERSION}</version>\n</Package>\n` },
    ...files.map(t => ({ path: `${root}/${FOLDER[t.kind]}/${t.fullName}.${SUFFIX[t.kind]}-meta.xml`, content: permissionFile(t) })),
    { path: 'sfdx-project.json', content: JSON.stringify({ packageDirectories: [{ path: 'force-app', default: true }], sourceApiVersion: API_VERSION }, null, 2) + '\n' }
  ];
}

/** The same rows for every target, as exported from the matrix. Apex rows are recognised by their ApexClass. prefix. */
export function fieldPermissionBundle(targets: MetaTarget[], fields: string[], _kind: BundleKind = 'field', root = 'force-app/main/default'): ZipEntry[] {
  return metadataBundle(targets.map(t => ({ kind: t.kind, fullName: t.fullName, entries: fields.map((name, i) => ({ name, access: t.access[i] ?? 0 })) })), root);
}
