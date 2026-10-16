import { APEX_CLASS, FlsSnapshot, isApex, type FieldMeta, type FieldPermRecord, type ObjectPermRecord, type PermSetMeta } from '@fls/core';
import type { SfApi } from './client.ts';

const SKIP_FIELD_TYPES = new Set(['address', 'location']);
const API_NAME = /^[A-Za-z0-9_]+$/;

/** SOQL IN list; API names and Salesforce ids are validated before quoting. */
export function inList(values: string[]): string {
  for (const v of values) if (!API_NAME.test(v)) throw new Error(`Invalid identifier: ${v}`);
  return `(${values.map(v => `'${v}'`).join(',')})`;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Runs one query per chunk of parent IDs, a few at a time, keeping the chunk order. */
async function perChunk<T>(parentIds: string[], run: (ids: string[]) => Promise<T[]>, concurrency = 4): Promise<T[]> {
  const chunks = chunk(parentIds, 200);
  const results: T[][] = new Array(chunks.length);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) { const i = next++; results[i] = await run(chunks[i]!); }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, worker));
  return results.flat();
}

export interface SObjectSummary { name: string; label: string; custom: boolean }

export async function listObjects(api: SfApi): Promise<SObjectSummary[]> {
  const res = await api.request<{ sobjects: { name: string; label: string; custom: boolean; queryable: boolean; layoutable: boolean; deprecatedAndHidden: boolean }[] }>(
    'GET', `/services/data/${api.apiVersion}/sobjects`);
  return res.sobjects
    .filter(o => o.queryable && o.layoutable && !o.deprecatedAndHidden)
    .map(o => ({ name: o.name, label: o.label, custom: o.custom }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

interface DescribeField {
  name: string; label: string; type: string; permissionable: boolean; calculated: boolean;
  autoNumber: boolean; custom: boolean; encrypted?: boolean;
}

/** Id the Tooling API uses for an object: its name for standard objects, the 01I id for custom ones. */
export async function tableId(api: SfApi, object: string): Promise<string> {
  const [row] = await api.query<{ DurableId: string }>(`SELECT DurableId FROM EntityDefinition WHERE QualifiedApiName = ${inList([object]).slice(1, -1)}`);
  if (!row) throw new Error(`Object not found: ${object}`);
  return row.DurableId;
}

/**
 * Custom fields the connected user cannot see. Tooling CustomField lists every custom field whatever the FLS;
 * label and type come from the Metadata API.
 */
async function hiddenCustomFields(api: SfApi, object: string, known: Set<string>): Promise<FieldMeta[]> {
  const table = await tableId(api, object);
  const rows = await api.tooling<{ DeveloperName: string; NamespacePrefix: string | null }>(
    `SELECT DeveloperName, NamespacePrefix FROM CustomField WHERE TableEnumOrId = ${inList([table]).slice(1, -1)}`);
  const names = rows.map(r => `${r.NamespacePrefix ? `${r.NamespacePrefix}__` : ''}${r.DeveloperName}__c`).filter(n => !known.has(n));
  if (!names.length) return [];
  const records = new Map((await api.readMetadata('CustomField', names.map(n => `${object}.${n}`))).map(r => [r.fullName, r]));
  const out: FieldMeta[] = [];
  for (const n of names) {
    const r = records.get(`${object}.${n}`);
    const type = String(r?.type ?? '');
    if (type === 'Location') continue;
    out.push({
      object, name: `${object}.${n}`, label: String(r?.label ?? n), type: type || 'custom',
      // Master-detail and required fields have no FLS.
      permissionable: type !== 'MasterDetail' && r?.required !== 'true',
      calculated: !!r?.formula || type === 'Summary' || type === 'AutoNumber',
      custom: true, encrypted: type === 'EncryptedText', hiddenFromUser: true
    });
  }
  return out;
}

/** Apex classes as rows of the pseudo-object ApexClass (see APEX_CLASS in core). */
export async function loadApexClasses(api: SfApi): Promise<FieldMeta[]> {
  const rows = await api.query<{ Id: string; Name: string; NamespacePrefix: string | null }>('SELECT Id, Name, NamespacePrefix FROM ApexClass');
  return rows
    .map(r => {
      const full = r.NamespacePrefix ? `${r.NamespacePrefix}__${r.Name}` : r.Name;
      return {
        object: APEX_CLASS, name: `${APEX_CLASS}.${full}`, label: full, type: r.NamespacePrefix ? 'managed' : 'apex',
        // Enabled or not: "calculated" keeps the matrix to two states.
        permissionable: true, calculated: true, custom: !r.NamespacePrefix, encrypted: false, entityId: r.Id
      };
    })
    .sort((a, b) => Number(!a.custom) - Number(!b.custom) || a.label.localeCompare(b.label));
}

interface ParticleRow { QualifiedApiName: string; Label: string; DataType: string; IsPermissionable: boolean; IsCalculated: boolean; IsCompound: boolean }

/**
 * Fields of the objects. Describe only returns the fields the connected user can see, so fields hidden from them
 * (even from an admin) are added from EntityParticle and, for custom fields, from the Tooling API. If those lookups
 * fail, the fields found so far are used and `log` gets the reason.
 */
export async function loadFields(api: SfApi, objects: string[], log?: (msg: string) => void): Promise<FieldMeta[]> {
  const out: FieldMeta[] = [];
  for (const object of objects) {
    if (isApex(object)) { out.push(...await loadApexClasses(api)); continue; }
    if (!API_NAME.test(object)) throw new Error(`Invalid object name: ${object}`);
    const [d, particles] = await Promise.all([
      api.request<{ fields: DescribeField[] }>('GET', `/services/data/${api.apiVersion}/sobjects/${object}/describe`),
      api.query<ParticleRow>(`SELECT QualifiedApiName, Label, DataType, IsPermissionable, IsCalculated, IsCompound FROM EntityParticle WHERE EntityDefinition.QualifiedApiName = '${object}'`)
        .catch((e: Error) => { log?.(`EntityParticle query failed for ${object}: ${e.message}`); return [] as ParticleRow[]; })
    ]);
    const seen = new Set<string>();
    for (const f of d.fields) {
      seen.add(f.name);
      if (SKIP_FIELD_TYPES.has(f.type)) continue;
      out.push({
        object, name: `${object}.${f.name}`, label: f.label, type: f.type,
        permissionable: f.permissionable, calculated: f.calculated || f.autoNumber,
        custom: f.custom, encrypted: !!f.encrypted
      });
    }
    for (const p of particles) {
      // Only permissionable fields can be hidden by FLS; compound fields (addresses) are covered by their components.
      if (seen.has(p.QualifiedApiName) || !p.IsPermissionable || p.IsCompound) continue;
      const type = p.DataType ?? '';
      out.push({
        object, name: `${object}.${p.QualifiedApiName}`, label: p.Label, type,
        permissionable: true, calculated: p.IsCalculated || /^(Formula|Roll-Up Summary|Auto Number)/i.test(type),
        custom: p.QualifiedApiName.endsWith('__c'), encrypted: /encrypted/i.test(type), hiddenFromUser: true
      });
      seen.add(p.QualifiedApiName);
    }
    try {
      out.push(...await hiddenCustomFields(api, object, seen));
    } catch (e) {
      log?.(`Custom field lookup failed for ${object}: ${(e as Error).message}`);
    }
  }
  return out;
}

interface PermSetRow {
  Id: string; Name: string; Label: string; Type: string | null; IsOwnedByProfile: boolean;
  NamespacePrefix: string | null; PermissionSetGroupId: string | null;
  Profile: { Name: string; UserLicense: { Name: string } | null } | null;
}

/** Profiles and permission sets that can hold FLS. Group-owned permission sets are derived, so they are left out. */
export async function loadPermissionSets(api: SfApi): Promise<PermSetMeta[]> {
  const rows = await api.query<PermSetRow>(
    'SELECT Id, Name, Label, Type, IsOwnedByProfile, NamespacePrefix, PermissionSetGroupId, Profile.Name, Profile.UserLicense.Name FROM PermissionSet');
  return rows
    .filter(r => !r.PermissionSetGroupId && r.Type !== 'Group')
    .map(r => ({
      id: r.Id,
      name: r.IsOwnedByProfile ? r.Profile?.Name ?? r.Name : r.Name,
      label: r.IsOwnedByProfile ? r.Profile?.Name ?? r.Label : r.Label,
      isProfile: r.IsOwnedByProfile,
      namespace: r.NamespacePrefix,
      license: r.Profile?.UserLicense?.Name ?? null,
      type: r.Type
    }))
    .sort((a, b) => Number(b.isProfile) - Number(a.isProfile) || a.label.localeCompare(b.label));
}

/** Enabled Apex classes as FieldPermRecords of the ApexClass pseudo-object; the record id is the SetupEntityAccess id. */
export async function loadApexAccess(api: SfApi, parentIds: string[]): Promise<FieldPermRecord[]> {
  const nameOf = new Map((await loadApexClasses(api)).map(c => [c.entityId!, c.name]));
  return perChunk(parentIds, async ids => {
    const rows = await api.query<{ Id: string; ParentId: string; SetupEntityId: string }>(
      `SELECT Id, ParentId, SetupEntityId FROM SetupEntityAccess WHERE SetupEntityType = 'ApexClass' AND ParentId IN ${inList(ids)}`);
    return rows.flatMap(r => {
      const field = nameOf.get(r.SetupEntityId);
      return field ? [{ id: r.Id, parentId: r.ParentId, sobjectType: APEX_CLASS, field, read: true, edit: false }] : [];
    });
  });
}

export async function loadFieldPermissions(api: SfApi, allObjects: string[], parentIds: string[]): Promise<FieldPermRecord[]> {
  const objects = allObjects.filter(o => !isApex(o));
  const apex = objects.length < allObjects.length ? await loadApexAccess(api, parentIds) : [];
  if (!objects.length) return apex;
  return apex.concat(await perChunk(parentIds, async ids => {
    const rows = await api.query<{ Id: string; ParentId: string; SobjectType: string; Field: string; PermissionsRead: boolean; PermissionsEdit: boolean }>(
      `SELECT Id, ParentId, SobjectType, Field, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE SobjectType IN ${inList(objects)} AND ParentId IN ${inList(ids)}`);
    return rows.map(r => ({ id: r.Id, parentId: r.ParentId, sobjectType: r.SobjectType, field: r.Field, read: r.PermissionsRead, edit: r.PermissionsEdit }));
  }));
}

export async function loadObjectPermissions(api: SfApi, allObjects: string[], parentIds: string[]): Promise<ObjectPermRecord[]> {
  const objects = allObjects.filter(o => !isApex(o));
  if (!objects.length) return [];
  return perChunk(parentIds, async ids => {
    const rows = await api.query<{ ParentId: string; SobjectType: string; PermissionsRead: boolean }>(
      `SELECT ParentId, SobjectType, PermissionsRead FROM ObjectPermissions WHERE SobjectType IN ${inList(objects)} AND ParentId IN ${inList(ids)}`);
    return rows.map(r => ({ parentId: r.ParentId, sobjectType: r.SobjectType, read: r.PermissionsRead }));
  });
}

/**
 * Compact matrix encoding: for each permission set with any access, one character per field
 * ('0' none, '1' read, '2' edit) in the order of `fieldNames`. Keeps large matrices small on the wire.
 */
export function accessStrings(fieldNames: string[], fieldPerms: FieldPermRecord[]): Record<string, string> {
  const index = new Map(fieldNames.map((f, i) => [f, i]));
  const rows = new Map<string, Uint8Array>();
  for (const r of fieldPerms) {
    const i = index.get(r.field);
    if (i === undefined || !(r.read || r.edit)) continue;
    let row = rows.get(r.parentId);
    if (!row) rows.set(r.parentId, row = new Uint8Array(fieldNames.length).fill(48));
    row[i] = r.edit ? 50 : 49;
  }
  return Object.fromEntries([...rows].map(([id, row]) => [id, Buffer.from(row).toString('latin1')]));
}

export async function loadSnapshot(api: SfApi, objects: string[], parentIds: string[]): Promise<{ snapshot: FlsSnapshot; fieldPerms: FieldPermRecord[]; objectPerms: ObjectPermRecord[] }> {
  if (!objects.length || !parentIds.length) return { snapshot: new FlsSnapshot([]), fieldPerms: [], objectPerms: [] };
  const [fieldPerms, objectPerms] = await Promise.all([loadFieldPermissions(api, objects, parentIds), loadObjectPermissions(api, objects, parentIds)]);
  return { snapshot: new FlsSnapshot(fieldPerms, objectPerms), fieldPerms, objectPerms };
}

export interface OrgInfo { orgId: string; name: string; isSandbox: boolean }

export async function loadOrgInfo(api: SfApi): Promise<OrgInfo> {
  const [org] = await api.query<{ Id: string; Name: string; IsSandbox: boolean }>('SELECT Id, Name, IsSandbox FROM Organization');
  if (!org) throw new Error('Organization record not found.');
  return { orgId: org.Id, name: org.Name, isSandbox: org.IsSandbox };
}

export interface UserPermissions { apiEnabled: boolean; viewSetup: boolean; manageProfilesPermissionSets: boolean }

/** Permissions of the connected user; null when the org does not expose them. */
export async function loadUserPermissions(api: SfApi): Promise<UserPermissions | null> {
  try {
    const [p] = await api.query<{ PermissionsApiEnabled: boolean; PermissionsViewSetup: boolean; PermissionsManageProfilesPermissionsets: boolean }>(
      'SELECT PermissionsApiEnabled, PermissionsViewSetup, PermissionsManageProfilesPermissionsets FROM UserPermissionAccess');
    return p ? { apiEnabled: p.PermissionsApiEnabled, viewSetup: p.PermissionsViewSetup, manageProfilesPermissionSets: p.PermissionsManageProfilesPermissionsets } : null;
  } catch {
    return null;
  }
}
