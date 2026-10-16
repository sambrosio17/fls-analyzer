import { profileKey, type SaveResult } from '@fls/core';
import type { MetadataRecord, MetadataSaveResult, SfApi } from './client.ts';

export interface MemPermSet {
  Id: string; Name: string; Label: string; Type: string; IsOwnedByProfile: boolean; NamespacePrefix: string | null;
  PermissionSetGroupId: string | null; Profile: { Name: string; UserLicense: { Name: string } | null } | null;
  /** Profile record id (00e) for profile-owned permission sets. */
  ProfileId?: string;
}

/** Page layouts and Lightning pages of the fake org. Objects are standard, so their Tooling id is their name. */
export interface MemPages {
  recordTypes: { Id: string; Name: string; DeveloperName: string; IsActive: boolean; NamespacePrefix: string | null; SobjectType: string }[];
  /** Profile metadata full name by profile id. */
  profileFullNames: Record<string, string>;
  layouts: { Id: string; Name: string; NamespacePrefix: string | null; TableEnumOrId: string; fields: string[] }[];
  profileLayouts: { ProfileId: string; LayoutId: string; RecordTypeId: string | null; TableEnumOrId: string }[];
  flexiPages: { Id: string; DeveloperName: string; MasterLabel: string; NamespacePrefix: string | null; EntityDefinitionId: string; components: string[]; fields: string[] }[];
  apps: MetadataRecord[];
  objects: MetadataRecord[];
}
export interface MemField {
  name: string; label: string; type: string; permissionable: boolean; calculated: boolean; autoNumber: boolean; custom: boolean; encrypted?: boolean;
  /** Hidden from the connected user: left out of describe, still listed by EntityParticle. */
  hidden?: boolean;
}
export interface MemFieldPerm { Id: string; ParentId: string; SobjectType: string; Field: string; PermissionsRead: boolean; PermissionsEdit: boolean }

export interface MemoryOrgData {
  name: string;
  isSandbox: boolean;
  permissionSets: MemPermSet[];
  objectPerms: { ParentId: string; SobjectType: string; PermissionsRead: boolean }[];
  describes: Record<string, { label: string; fields: MemField[] }>;
  pages?: MemPages;
  apexClasses?: MemApexClass[];
}
export interface MemApexClass { Id: string; Name: string; NamespacePrefix: string | null }
export interface MemEntityAccess { Id: string; ParentId: string; SetupEntityId: string }

const layoutKey = (l: { Name: string; NamespacePrefix: string | null }) => l.NamespacePrefix ? `${l.NamespacePrefix}__${l.Name}` : l.Name;

const whereEq = (soql: string, column: string) => soql.match(new RegExp(`${column} = '([^']*)'`))?.[1];

const inSet = (soql: string, column: string) => {
  const m = soql.match(new RegExp(`${column} IN \\(([^)]*)\\)`));
  return new Set((m?.[1] ?? '').split(',').map(s => s.replace(/'/g, '')));
};

/**
 * In-memory Salesforce org that answers the queries and calls the app makes.
 * Used by the tests and by demo mode (DEMO_MODE=true), never against a real org.
 */
export class MemoryOrg implements SfApi {
  readonly apiVersion = 'v62.0';
  fieldPerms: MemFieldPerm[] = [];
  /** SetupEntityAccess rows for Apex classes. */
  entityAccess: MemEntityAccess[] = [];
  /** Profile names (as written) whose app overrides Salesforce refuses with an invalid reference. */
  rejectAppProfiles = new Set<string>();
  /** Fields whose insert fails, to simulate license errors. */
  rejectFields = new Set<string>();
  private seq = 0;

  constructor(readonly data: MemoryOrgData) {}

  addPerm(parentId: string, field: string, read: boolean, edit: boolean): string {
    const Id = `01k${String(++this.seq).padStart(12, '0')}`;
    this.fieldPerms.push({ Id, ParentId: parentId, SobjectType: field.split('.')[0]!, Field: field, PermissionsRead: read, PermissionsEdit: edit });
    return Id;
  }

  addClassAccess(parentId: string, classId: string): string {
    const Id = `0J0${String(++this.seq).padStart(12, '0')}`;
    this.entityAccess.push({ Id, ParentId: parentId, SetupEntityId: classId });
    return Id;
  }

  async query<T>(soql: string): Promise<T[]> {
    if (soql.includes('FROM ApexClass')) return (this.data.apexClasses ?? []).map(c => ({ ...c })) as T[];
    if (soql.includes('FROM SetupEntityAccess')) {
      const parents = inSet(soql, 'ParentId');
      return this.entityAccess.filter(a => parents.has(a.ParentId)).map(a => ({ ...a })) as T[];
    }
    if (soql.includes('FROM PermissionSet')) {
      return this.data.permissionSets.filter(p => !soql.includes('IsOwnedByProfile = true') || p.IsOwnedByProfile) as T[];
    }
    if (soql.includes('FROM EntityDefinition')) {
      const name = whereEq(soql, 'QualifiedApiName')!;
      return (this.data.describes[name] ? [{ DurableId: name }] : []) as T[];
    }
    if (soql.includes('FROM RecordType')) return (this.data.pages?.recordTypes ?? []).filter(r => r.SobjectType === whereEq(soql, 'SobjectType')) as T[];
    if (soql.includes('FROM Organization')) return [{ Id: '00D000000000001', Name: this.data.name, IsSandbox: this.data.isSandbox }] as T[];
    if (soql.includes('FROM UserPermissionAccess')) return [{ PermissionsApiEnabled: true, PermissionsViewSetup: true, PermissionsManageProfilesPermissionsets: true }] as T[];
    if (soql.includes('FROM EntityParticle')) {
      const object = soql.match(/QualifiedApiName = '(\w+)'/)![1]!;
      // Like a real org with FLS on EntityParticle: fields hidden from the user are left out.
      return (this.data.describes[object]?.fields ?? []).filter(f => !f.hidden).map(f => ({
        QualifiedApiName: f.name, Label: f.label, DataType: f.type, IsPermissionable: f.permissionable, IsCalculated: f.calculated, IsCompound: f.type === 'address'
      })) as T[];
    }
    const objects = inSet(soql, 'SobjectType');
    const parents = inSet(soql, 'ParentId');
    if (soql.includes('FROM FieldPermissions')) return this.fieldPerms.filter(p => objects.has(p.SobjectType) && parents.has(p.ParentId)).map(p => ({ ...p })) as T[];
    if (soql.includes('FROM ObjectPermissions')) return this.data.objectPerms.filter(p => objects.has(p.SobjectType) && parents.has(p.ParentId)) as T[];
    throw new Error(`Unexpected query: ${soql}`);
  }

  async tooling<T>(soql: string): Promise<T[]> {
    if (soql.includes('FROM CustomField')) {
      return (this.data.describes[whereEq(soql, 'TableEnumOrId')!]?.fields ?? []).filter(f => f.custom)
        .map(f => ({ DeveloperName: f.name.replace(/__c$/, ''), NamespacePrefix: null })) as T[];
    }
    const pages = this.data.pages;
    if (!pages) return [];
    const id = whereEq(soql, 'Id');
    const table = whereEq(soql, 'TableEnumOrId');
    if (soql.startsWith('SELECT Metadata FROM Layout')) {
      const l = pages.layouts.find(x => x.Id === id);
      return (l ? [{ Metadata: { layoutSections: [{ layoutColumns: [{ layoutItems: l.fields.map(field => ({ field })) }] }] } }] : []) as T[];
    }
    if (soql.includes('FROM Layout')) return pages.layouts.filter(l => l.TableEnumOrId === table) as T[];
    if (soql.includes('FROM ProfileLayout')) return pages.profileLayouts.filter(l => l.TableEnumOrId === table) as T[];
    if (soql.startsWith('SELECT Metadata FROM FlexiPage')) {
      const p = pages.flexiPages.find(x => x.Id === id);
      const items = p ? [...p.components.map(componentName => ({ componentInstance: { componentName } })), ...p.fields.map(fieldItem => ({ fieldInstance: { fieldItem: `Record.${fieldItem}` } }))] : [];
      return (p ? [{ Metadata: { flexiPageRegions: [{ itemInstances: items }] } }] : []) as T[];
    }
    if (soql.includes('FROM FlexiPage')) return pages.flexiPages as T[];
    throw new Error(`Unexpected tooling query: ${soql}`);
  }

  async listMetadata(type: string): Promise<{ fullName: string; id: string }[]> {
    const pages = this.data.pages;
    if (type === 'Profile') return Object.entries(pages?.profileFullNames ?? {}).map(([id, fullName]) => ({ id, fullName }));
    if (type === 'CustomApplication') return (pages?.apps ?? []).map((a, i) => ({ fullName: a.fullName, id: `02u${String(i).padStart(12, '0')}` }));
    // Like a real org, full names encode some characters of the layout name.
    if (type === 'Layout') return (pages?.layouts ?? []).map(l => ({ id: l.Id, fullName: `${l.TableEnumOrId}-${layoutKey(l).replace(/\(/g, '%28').replace(/\)/g, '%29')}` }));
    throw new Error(`Unexpected listMetadata: ${type}`);
  }

  async readMetadata(type: string, fullNames: string[]): Promise<MetadataRecord[]> {
    if (type === 'CustomField') {
      return fullNames.flatMap(n => {
        const [object, name] = n.split('.') as [string, string];
        const f = this.data.describes[object]?.fields.find(x => x.name === name);
        return f ? [{ fullName: n, label: f.label, type: f.type, ...(f.calculated ? { formula: '1' } : {}) }] : [];
      });
    }
    const source = type === 'CustomApplication' ? this.data.pages?.apps : type === 'CustomObject' ? this.data.pages?.objects : undefined;
    if (!source) throw new Error(`Unexpected readMetadata: ${type}`);
    return structuredClone(source.filter(r => fullNames.includes(r.fullName)));
  }

  /** Profiles (layout assignments only) and Lightning apps; other elements of a profile are ignored. */
  async updateMetadata(type: string, records: MetadataRecord[]): Promise<MetadataSaveResult[]> {
    const pages = this.data.pages;
    if (!pages) throw new Error('No pages in this org');
    const fail = (fullName: string, statusCode: string, message: string): MetadataSaveResult => ({ fullName, success: false, errors: [{ statusCode, message }] });
    if (type === 'Profile') {
      return records.map(r => {
        const profileId = Object.entries(pages.profileFullNames).find(([, n]) => n === r.fullName)?.[0];
        if (!profileId) return fail(r.fullName, 'INVALID_CROSS_REFERENCE_KEY', `No profile named ${r.fullName}`);
        const list = ([] as { layout: string; recordType?: string }[]).concat((r.layoutAssignments ?? []) as never);
        const resolved = [];
        for (const a of list) {
          const name = decodeURIComponent(a.layout);
          const layout = pages.layouts.find(l => `${l.TableEnumOrId}-${layoutKey(l)}` === name);
          if (!layout) return fail(r.fullName, 'INVALID_CROSS_REFERENCE_KEY', `In field: layout - no Layout named ${a.layout} found`);
          const rt = a.recordType ? pages.recordTypes.find(t => `${t.SobjectType}.${t.DeveloperName}` === a.recordType) : null;
          if (rt === undefined) return fail(r.fullName, 'INVALID_CROSS_REFERENCE_KEY', `In field: recordType - no RecordType named ${a.recordType} found`);
          resolved.push({ layout, recordTypeId: rt?.Id ?? null });
        }
        for (const { layout, recordTypeId } of resolved) {
          const at = pages.profileLayouts.find(x => x.ProfileId === profileId && x.TableEnumOrId === layout.TableEnumOrId && x.RecordTypeId === recordTypeId);
          if (at) at.LayoutId = layout.Id;
          else pages.profileLayouts.push({ ProfileId: profileId, LayoutId: layout.Id, RecordTypeId: recordTypeId, TableEnumOrId: layout.TableEnumOrId });
        }
        return { fullName: r.fullName, success: true, errors: [] };
      });
    }
    if (type === 'CustomApplication') {
      return records.map(r => {
        const i = pages.apps.findIndex(a => a.fullName === r.fullName);
        if (i < 0) return fail(r.fullName, 'INVALID_CROSS_REFERENCE_KEY', `No app named ${r.fullName}`);
        const overrides = ([] as { content?: string; profile?: string }[]).concat((r.profileActionOverrides ?? []) as never);
        const unknownPage = overrides.find(o => !pages.flexiPages.some(p => p.DeveloperName === o.content));
        if (unknownPage) return fail(r.fullName, 'FIELD_INTEGRITY_EXCEPTION', `Lightning page ${unknownPage.content} not found`);
        const unknownProfile = overrides.find(o => !Object.values(pages.profileFullNames).some(n => profileKey(n) === profileKey(o.profile ?? '')));
        if (unknownProfile) return fail(r.fullName, 'FIELD_INTEGRITY_EXCEPTION', `Profile ${unknownProfile.profile} not found`);
        if (overrides.some(o => this.rejectAppProfiles.has(o.profile ?? ''))) return fail(r.fullName, 'INVALID_CROSS_REFERENCE_KEY', 'invalid cross reference id');
        pages.apps[i] = structuredClone(r);
        return { fullName: r.fullName, success: true, errors: [] };
      });
    }
    throw new Error(`Unexpected updateMetadata: ${type}`);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const describe = path.match(/\/sobjects\/(\w+)\/describe$/);
    if (method === 'GET' && describe) return { fields: (this.data.describes[describe[1]!]?.fields ?? []).filter(f => !f.hidden) } as T;
    if (method === 'GET' && path.endsWith('/sobjects')) {
      return { sobjects: Object.entries(this.data.describes).map(([name, d]) => ({ name, label: d.label, custom: name.endsWith('__c'), queryable: true, layoutable: true, deprecatedAndHidden: false })) } as T;
    }
    const records = (body as { records?: Record<string, unknown>[] } | undefined)?.records ?? [];
    if (method === 'POST') {
      return records.map((r): SaveResult => {
        if ((r.attributes as { type: string }).type === 'SetupEntityAccess') {
          const classId = r.SetupEntityId as string;
          if (!this.data.apexClasses?.some(c => c.Id === classId)) return { success: false, errors: [{ statusCode: 'INVALID_CROSS_REFERENCE_KEY', message: 'Apex class not found' }] };
          if (this.entityAccess.some(a => a.ParentId === r.ParentId && a.SetupEntityId === classId)) return { success: false, errors: [{ statusCode: 'DUPLICATE_VALUE', message: 'Access already granted' }] };
          return { id: this.addClassAccess(r.ParentId as string, classId), success: true };
        }
        if (this.rejectFields.has(r.Field as string)) return { success: false, errors: [{ statusCode: 'FIELD_INTEGRITY_EXCEPTION', message: 'Field not available for this license' }] };
        return { id: this.addPerm(r.ParentId as string, r.Field as string, r.PermissionsRead as boolean, r.PermissionsEdit as boolean), success: true };
      }) as T;
    }
    if (method === 'PATCH') {
      return records.map((r): SaveResult => {
        const p = this.fieldPerms.find(x => x.Id === r.Id);
        if (!p) return { success: false, errors: [{ statusCode: 'ENTITY_IS_DELETED', message: 'Record not found' }] };
        p.PermissionsRead = r.PermissionsRead as boolean;
        p.PermissionsEdit = r.PermissionsEdit as boolean;
        return { id: p.Id, success: true };
      }) as T;
    }
    if (method === 'DELETE') {
      const ids = new URL(`https://x${path}`).searchParams.get('ids')!.split(',');
      return ids.map((id): SaveResult => {
        const before = this.fieldPerms.length + this.entityAccess.length;
        this.fieldPerms = this.fieldPerms.filter(p => p.Id !== id);
        this.entityAccess = this.entityAccess.filter(a => a.Id !== id);
        return before === this.fieldPerms.length + this.entityAccess.length ? { success: false, errors: [{ statusCode: 'ENTITY_IS_DELETED', message: 'Record not found' }] } : { id, success: true };
      }) as T;
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  }
}
