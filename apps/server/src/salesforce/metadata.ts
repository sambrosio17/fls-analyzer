import { FlsSnapshot, type FieldMeta, type FieldPermRecord, type ObjectPermRecord, type PermSetMeta } from '@fls/core';
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

export async function loadFields(api: SfApi, objects: string[]): Promise<FieldMeta[]> {
  const out: FieldMeta[] = [];
  for (const object of objects) {
    if (!API_NAME.test(object)) throw new Error(`Invalid object name: ${object}`);
    const d = await api.request<{ fields: DescribeField[] }>('GET', `/services/data/${api.apiVersion}/sobjects/${object}/describe`);
    for (const f of d.fields) {
      if (SKIP_FIELD_TYPES.has(f.type)) continue;
      out.push({
        object, name: `${object}.${f.name}`, label: f.label, type: f.type,
        permissionable: f.permissionable, calculated: f.calculated || f.autoNumber,
        custom: f.custom, encrypted: !!f.encrypted
      });
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

export async function loadFieldPermissions(api: SfApi, objects: string[], parentIds: string[]): Promise<FieldPermRecord[]> {
  const out: FieldPermRecord[] = [];
  for (const ids of chunk(parentIds, 200)) {
    const rows = await api.query<{ Id: string; ParentId: string; SobjectType: string; Field: string; PermissionsRead: boolean; PermissionsEdit: boolean }>(
      `SELECT Id, ParentId, SobjectType, Field, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE SobjectType IN ${inList(objects)} AND ParentId IN ${inList(ids)}`);
    for (const r of rows) out.push({ id: r.Id, parentId: r.ParentId, sobjectType: r.SobjectType, field: r.Field, read: r.PermissionsRead, edit: r.PermissionsEdit });
  }
  return out;
}

export async function loadObjectPermissions(api: SfApi, objects: string[], parentIds: string[]): Promise<ObjectPermRecord[]> {
  const out: ObjectPermRecord[] = [];
  for (const ids of chunk(parentIds, 200)) {
    const rows = await api.query<{ ParentId: string; SobjectType: string; PermissionsRead: boolean }>(
      `SELECT ParentId, SobjectType, PermissionsRead FROM ObjectPermissions WHERE SobjectType IN ${inList(objects)} AND ParentId IN ${inList(ids)}`);
    for (const r of rows) out.push({ parentId: r.ParentId, sobjectType: r.SobjectType, read: r.PermissionsRead });
  }
  return out;
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
