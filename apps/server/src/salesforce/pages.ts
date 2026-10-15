import type { PageAssignments } from '@fls/core';
import type { MetadataRecord, SfApi } from './client.ts';
import { loadFieldPermissions, loadFields, loadObjectPermissions } from './metadata.ts';

export interface RecordTypeInfo { id: string | null; developerName: string | null; label: string; active: boolean }
export interface ProfileInfo { id: string; permSetId: string; name: string; fullName: string | null }

const ID = /^[A-Za-z0-9_]+$/;
const quote = (v: string) => { if (!ID.test(v)) throw new Error(`Invalid identifier: ${v}`); return `'${v}'`; };

/** Runs `fn` over `items`, a few at a time. */
async function pool<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 4): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]) as T[];

/** Id the Tooling API uses for an object: its name for standard objects, the 01I id for custom ones. */
export async function tableId(api: SfApi, object: string): Promise<string> {
  const [row] = await api.query<{ DurableId: string }>(`SELECT DurableId FROM EntityDefinition WHERE QualifiedApiName = ${quote(object)}`);
  if (!row) throw new Error(`Object not found: ${object}`);
  return row.DurableId;
}

/** Record types of the object, plus Master (id null), which every object has. */
export async function loadRecordTypes(api: SfApi, object: string): Promise<RecordTypeInfo[]> {
  const rows = await api.query<{ Id: string; Name: string; DeveloperName: string; IsActive: boolean; NamespacePrefix: string | null }>(
    `SELECT Id, Name, DeveloperName, IsActive, NamespacePrefix FROM RecordType WHERE SobjectType = ${quote(object)} ORDER BY Name`);
  return [
    ...rows.map(r => ({ id: r.Id, developerName: r.NamespacePrefix ? `${r.NamespacePrefix}__${r.DeveloperName}` : r.DeveloperName, label: r.Name, active: r.IsActive })),
    { id: null, developerName: null, label: 'Master', active: true }
  ];
}

/** Profiles with their profile-owned permission set and their metadata full name (used by page assignments). */
export async function loadProfiles(api: SfApi): Promise<ProfileInfo[]> {
  const [rows, files] = await Promise.all([
    api.query<{ Id: string; ProfileId: string; Profile: { Name: string } | null }>('SELECT Id, ProfileId, Profile.Name FROM PermissionSet WHERE IsOwnedByProfile = true'),
    api.listMetadata('Profile')
  ]);
  const fullNameById = new Map(files.map(f => [f.id.slice(0, 15), f.fullName]));
  return rows
    .filter(r => r.ProfileId && r.Profile)
    .map(r => ({ id: r.ProfileId, permSetId: r.Id, name: r.Profile!.Name, fullName: fullNameById.get(r.ProfileId.slice(0, 15)) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---- page layouts

export interface LayoutInfo { id: string; name: string; namespace: string | null; fields: string[] }
export interface LayoutAnalysis {
  object: string;
  recordTypes: RecordTypeInfo[];
  profiles: ProfileInfo[];
  layouts: LayoutInfo[];
  assignments: { profileId: string; recordTypeId: string | null; layoutId: string }[];
  /** Profiles without read access to the object: their layout does not matter. */
  noObjectRead: string[];
  /** Fields on a layout that the profile assigned to it cannot read through the profile alone. */
  gaps: { profileId: string; layoutId: string; fields: string[] }[];
}

export async function loadLayoutAnalysis(api: SfApi, object: string): Promise<LayoutAnalysis> {
  const table = await tableId(api, object);
  const [recordTypes, profiles, layoutRows, assignmentRows, fields] = await Promise.all([
    loadRecordTypes(api, object),
    loadProfiles(api),
    api.tooling<{ Id: string; Name: string; NamespacePrefix: string | null }>(
      `SELECT Id, Name, NamespacePrefix FROM Layout WHERE TableEnumOrId = ${quote(table)} AND LayoutType = 'Standard' ORDER BY Name`),
    api.tooling<{ ProfileId: string; LayoutId: string; RecordTypeId: string | null }>(
      `SELECT ProfileId, LayoutId, RecordTypeId FROM ProfileLayout WHERE TableEnumOrId = ${quote(table)}`),
    loadFields(api, [object])
  ]);
  const layouts = await pool(layoutRows, async l => {
    const [row] = await api.tooling<{ Metadata: { layoutSections?: { layoutColumns?: { layoutItems?: { field?: string | null }[] }[] }[] } }>(
      `SELECT Metadata FROM Layout WHERE Id = ${quote(l.Id)}`);
    const names = (row?.Metadata.layoutSections ?? []).flatMap(s => (s.layoutColumns ?? []).flatMap(c => (c.layoutItems ?? []).map(i => i.field)))
      .filter((f): f is string => !!f).map(f => `${object}.${f}`);
    return { id: l.Id, name: l.Name, namespace: l.NamespacePrefix, fields: [...new Set(names)] };
  });

  const permSetIds = profiles.map(p => p.permSetId);
  const [fieldPerms, objectPerms] = permSetIds.length
    ? await Promise.all([loadFieldPermissions(api, [object], permSetIds), loadObjectPermissions(api, [object], permSetIds)])
    : [[], []];
  const readable = new Set(fieldPerms.filter(r => r.read).map(r => `${r.parentId}|${r.field}`));
  const objectRead = new Set(objectPerms.filter(o => o.read).map(o => o.parentId));
  const permissionable = new Set(fields.filter(f => f.permissionable).map(f => f.name));

  const assignments = assignmentRows.map(r => ({ profileId: r.ProfileId, recordTypeId: r.RecordTypeId ?? null, layoutId: r.LayoutId }));
  const noObjectRead = profiles.filter(p => !objectRead.has(p.permSetId)).map(p => p.id);
  const gaps: LayoutAnalysis['gaps'] = [];
  const seen = new Set<string>();
  for (const a of assignments) {
    const profile = profiles.find(p => p.id === a.profileId);
    const layout = layouts.find(l => l.id === a.layoutId);
    if (!profile || !layout || !objectRead.has(profile.permSetId) || seen.has(`${profile.id}|${layout.id}`)) continue;
    seen.add(`${profile.id}|${layout.id}`);
    const missing = layout.fields.filter(f => permissionable.has(f) && !readable.has(`${profile.permSetId}|${f}`));
    if (missing.length) gaps.push({ profileId: profile.id, layoutId: layout.id, fields: missing });
  }
  return { object, recordTypes, profiles, layouts, assignments, noObjectRead, gaps };
}

// ---- Lightning record pages

export interface PageInfo { id: string; name: string; label: string; components: string[]; fields: string[] }
export interface PageAnalysis extends PageAssignments {
  object: string;
  recordTypes: RecordTypeInfo[];
  profiles: ProfileInfo[];
  apps: { name: string; label: string }[];
  pages: PageInfo[];
}

interface Override { actionName?: string; content?: string; formFactor?: string; pageOrSobjectType?: string; type?: string; profile?: string; recordType?: string }
const isDesktopView = (o: Override) => o.actionName === 'View' && o.type === 'Flexipage' && (o.formFactor ?? 'Large') === 'Large' && !!o.content;

export async function loadPageAnalysis(api: SfApi, object: string): Promise<PageAnalysis> {
  const table = await tableId(api, object);
  const [recordTypes, profiles, pageRows, appFiles, objects] = await Promise.all([
    loadRecordTypes(api, object),
    loadProfiles(api),
    api.tooling<{ Id: string; DeveloperName: string; MasterLabel: string; NamespacePrefix: string | null; EntityDefinitionId: string | null }>(
      `SELECT Id, DeveloperName, MasterLabel, NamespacePrefix, EntityDefinitionId FROM FlexiPage WHERE Type = 'RecordPage'`),
    api.listMetadata('CustomApplication'),
    api.readMetadata('CustomObject', [object])
  ]);
  const appRecords = await api.readMetadata('CustomApplication', appFiles.map(f => f.fullName));
  const apps = appRecords.filter(a => a.uiType === 'Lightning');

  const pages = await pool(pageRows.filter(p => p.EntityDefinitionId === table), async p => {
    const [row] = await api.tooling<{ Metadata: { flexiPageRegions?: { itemInstances?: { componentInstance?: { componentName?: string } | null; fieldInstance?: { fieldItem?: string } | null }[] }[] } }>(
      `SELECT Metadata FROM FlexiPage WHERE Id = ${quote(p.Id)}`);
    const items = (row?.Metadata.flexiPageRegions ?? []).flatMap(r => r.itemInstances ?? []);
    const components = [...new Set(items.map(i => i.componentInstance?.componentName).filter((c): c is string => !!c))].sort();
    const fields = [...new Set(items.map(i => i.fieldInstance?.fieldItem).filter((f): f is string => !!f).map(f => `${object}.${f.replace(/^Record\./, '')}`))];
    return { id: p.Id, name: p.NamespacePrefix ? `${p.NamespacePrefix}__${p.DeveloperName}` : p.DeveloperName, label: p.MasterLabel, components, fields };
  });

  const orgDefault = list<Override>((objects[0] as MetadataRecord | undefined)?.actionOverrides).find(isDesktopView)?.content ?? null;
  const appDefaults = apps.flatMap(a => list<Override>(a.actionOverrides)
    .filter(o => isDesktopView(o) && o.pageOrSobjectType === object).map(o => ({ app: a.fullName, page: o.content! })));
  const assignments = apps.flatMap(a => list<Override>(a.profileActionOverrides)
    .filter(o => isDesktopView(o) && o.pageOrSobjectType === object && o.profile)
    .map(o => ({ app: a.fullName, profile: o.profile!, recordType: o.recordType ? o.recordType.slice(object.length + 1) : null, page: o.content! })));

  return {
    object, recordTypes, profiles, pages, orgDefault, appDefaults, assignments,
    apps: apps.map(a => ({ name: a.fullName, label: String(a.label ?? a.fullName) })).sort((x, y) => x.label.localeCompare(y.label))
  };
}

