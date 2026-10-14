import type { SaveResult } from '@fls/core';
import type { MetadataRecord, SfApi } from './client.ts';

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
}

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
  /** Fields whose insert fails, to simulate license errors. */
  rejectFields = new Set<string>();
  private seq = 0;

  constructor(readonly data: MemoryOrgData) {}

  addPerm(parentId: string, field: string, read: boolean, edit: boolean): string {
    const Id = `01k${String(++this.seq).padStart(12, '0')}`;
    this.fieldPerms.push({ Id, ParentId: parentId, SobjectType: field.split('.')[0]!, Field: field, PermissionsRead: read, PermissionsEdit: edit });
    return Id;
  }

  async query<T>(soql: string): Promise<T[]> {
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
      return (this.data.describes[object]?.fields ?? []).map(f => ({
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
    throw new Error(`Unexpected listMetadata: ${type}`);
  }

  async readMetadata(type: string, fullNames: string[]): Promise<MetadataRecord[]> {
    const source = type === 'CustomApplication' ? this.data.pages?.apps : type === 'CustomObject' ? this.data.pages?.objects : undefined;
    if (!source) throw new Error(`Unexpected readMetadata: ${type}`);
    return structuredClone(source.filter(r => fullNames.includes(r.fullName)));
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
        const before = this.fieldPerms.length;
        this.fieldPerms = this.fieldPerms.filter(p => p.Id !== id);
        return before === this.fieldPerms.length ? { success: false, errors: [{ statusCode: 'ENTITY_IS_DELETED', message: 'Record not found' }] } : { id, success: true };
      }) as T;
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  }
}
