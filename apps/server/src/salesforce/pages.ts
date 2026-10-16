import { assignmentKey, FORM_FACTORS, type AssignmentChange, type FormFactor, type PageAssignments } from '@fls/core';
import type { MetadataRecord, SfApi } from './client.ts';
import { loadFieldPermissions, loadFields, loadObjectPermissions, tableId } from './metadata.ts';

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

/** ProfileLayout gives Master as a special record type id (012000000000000AAA); the app uses null. */
const recordTypeIdOf = (id: string | null | undefined) => !id || id.startsWith('012000000000000') ? null : id;

/** Name the app uses for a layout: its name, with the namespace prefix for managed layouts. */
export const layoutName = (l: { name: string; namespace: string | null }) => l.namespace ? `${l.namespace}__${l.name}` : l.name;

/** Current layout per profile (metadata full name) and record type (developer name, '' for Master), keyed `profile|recordType`. */
export async function currentLayouts(api: SfApi, object: string): Promise<Map<string, string>> {
  const table = await tableId(api, object);
  const [recordTypes, profiles, layoutRows, rows] = await Promise.all([
    loadRecordTypes(api, object),
    loadProfiles(api),
    api.tooling<{ Id: string; Name: string; NamespacePrefix: string | null }>(
      `SELECT Id, Name, NamespacePrefix FROM Layout WHERE TableEnumOrId = ${quote(table)} AND LayoutType = 'Standard' ORDER BY Name`),
    api.tooling<{ ProfileId: string; LayoutId: string; RecordTypeId: string | null }>(
      `SELECT ProfileId, LayoutId, RecordTypeId FROM ProfileLayout WHERE TableEnumOrId = ${quote(table)}`)
  ]);
  const profile = new Map(profiles.map(p => [p.id, p.fullName]));
  const rt = new Map(recordTypes.map(r => [r.id, r.developerName]));
  const layout = new Map(layoutRows.map(l => [l.Id, layoutName({ name: l.Name, namespace: l.NamespacePrefix })]));
  const out = new Map<string, string>();
  for (const r of rows) {
    const p = profile.get(r.ProfileId);
    const l = layout.get(r.LayoutId);
    const id = recordTypeIdOf(r.RecordTypeId);
    if (p && l && rt.has(id)) out.set(`${p}|${rt.get(id) ?? ''}`, l);
  }
  return out;
}

/**
 * Metadata full names of the object's layouts by the app's layout name. Full names encode some
 * characters (for example "(" as %28), so they come from listMetadata rather than being built.
 */
export async function layoutFullNames(api: SfApi, object: string): Promise<Map<string, string>> {
  const prefix = `${object}-`;
  const out = new Map<string, string>();
  for (const f of await api.listMetadata('Layout')) {
    let decoded = f.fullName;
    try { decoded = decodeURIComponent(f.fullName); } catch { /* keep as is */ }
    if (decoded.startsWith(prefix)) out.set(decoded.slice(prefix.length), f.fullName);
  }
  return out;
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

  const assignments = assignmentRows.map(r => ({ profileId: r.ProfileId, recordTypeId: recordTypeIdOf(r.RecordTypeId), layoutId: r.LayoutId }));
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
export interface PageAnalysis {
  object: string;
  recordTypes: RecordTypeInfo[];
  profiles: ProfileInfo[];
  /** Lightning apps; `formFactors` are the devices the app runs on (Large desktop, Small phone). */
  apps: { name: string; label: string; formFactors: FormFactor[] }[];
  pages: PageInfo[];
  /** Assignments per form factor: desktop and phone are set separately. */
  forms: Record<FormFactor, PageAssignments>;
}

interface Override { actionName?: string; content?: string; formFactor?: string; pageOrSobjectType?: string; type?: string; profile?: string; recordType?: string }
const isView = (o: Override, ff: FormFactor) => o.actionName === 'View' && o.type === 'Flexipage' && (o.formFactor || 'Large') === ff && !!o.content;

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

  const form = (ff: FormFactor): PageAssignments => ({
    orgDefault: list<Override>((objects[0] as MetadataRecord | undefined)?.actionOverrides).find(o => isView(o, ff))?.content ?? null,
    appDefaults: apps.flatMap(a => list<Override>(a.actionOverrides)
      .filter(o => isView(o, ff) && o.pageOrSobjectType === object).map(o => ({ app: a.fullName, page: o.content! }))),
    assignments: profilePages(apps, object, ff)
  });

  return {
    object, recordTypes, profiles, pages,
    forms: { Large: form('Large'), Small: form('Small') },
    apps: apps.map(a => {
      const ffs = list<string>(a.formFactors).filter((f): f is FormFactor => f === 'Large' || f === 'Small');
      return { name: a.fullName, label: String(a.label ?? a.fullName), formFactors: ffs.length ? ffs : ['Large' as FormFactor] };
    }).sort((x, y) => x.label.localeCompare(y.label))
  };
}

/** App + profile + record type page assignments of an object in the given CustomApplication records. */
function profilePages(apps: MetadataRecord[], object: string, ff: FormFactor): PageAssignments['assignments'] {
  return apps.flatMap(a => list<Override>(a.profileActionOverrides)
    .filter(o => isView(o, ff) && o.pageOrSobjectType === object && o.profile)
    .map(o => ({ app: a.fullName, profile: o.profile!, recordType: o.recordType ? o.recordType.slice(object.length + 1) : null, page: o.content! })));
}

/** Current page per app, profile, record type and form factor for the objects and apps of `changes`, keyed by assignmentKey. */
export async function currentPages(api: SfApi, changes: Pick<AssignmentChange, 'object' | 'app'>[], apps?: MetadataRecord[]): Promise<Map<string, string>> {
  const appNames = [...new Set(changes.map(c => c.app).filter((a): a is string => !!a))];
  const records = apps ?? (appNames.length ? await api.readMetadata('CustomApplication', appNames) : []);
  const out = new Map<string, string>();
  for (const object of new Set(changes.map(c => c.object))) {
    for (const formFactor of FORM_FACTORS) {
      for (const a of profilePages(records, object, formFactor)) out.set(assignmentKey({ kind: 'page', object, app: a.app, profile: a.profile, recordType: a.recordType, formFactor }), a.page);
    }
  }
  return out;
}
