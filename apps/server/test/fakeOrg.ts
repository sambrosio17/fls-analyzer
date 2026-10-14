import type { SaveResult } from '@fls/core';
import type { SfApi } from '../src/salesforce/client.ts';

interface FP { Id: string; ParentId: string; SobjectType: string; Field: string; PermissionsRead: boolean; PermissionsEdit: boolean }

const ins = (soql: string, column: string) => {
  const m = soql.match(new RegExp(`${column} IN \\(([^)]*)\\)`));
  return new Set((m?.[1] ?? '').split(',').map(s => s.replace(/'/g, '')));
};

/** In-memory Salesforce org that understands the queries and calls the app makes. */
export class FakeOrg implements SfApi {
  readonly apiVersion = 'v62.0';
  fieldPerms: FP[] = [];
  seq = 0;
  /** Field names whose insert fails, to simulate license errors. */
  rejectFields = new Set<string>();
  calls: string[] = [];

  permissionSets = [
    { Id: '0PS000000000001', Name: 'X00e1', Label: 'X00e1', Type: 'Profile', IsOwnedByProfile: true, NamespacePrefix: null, PermissionSetGroupId: null, Profile: { Name: 'Sales User', UserLicense: { Name: 'Salesforce' } } },
    { Id: '0PS000000000002', Name: 'Finance_Access', Label: 'Finance Access', Type: 'Regular', IsOwnedByProfile: false, NamespacePrefix: null, PermissionSetGroupId: null, Profile: null },
    { Id: '0PS000000000003', Name: 'CPQ_Admin', Label: 'CPQ Admin', Type: 'Regular', IsOwnedByProfile: false, NamespacePrefix: 'SBQQ', PermissionSetGroupId: null, Profile: null },
    { Id: '0PS000000000004', Name: 'Grp', Label: 'Group aggregate', Type: 'Group', IsOwnedByProfile: false, NamespacePrefix: null, PermissionSetGroupId: '0PG000000000001', Profile: null }
  ];
  objectPerms = [
    { ParentId: '0PS000000000001', SobjectType: 'Account', PermissionsRead: true },
    { ParentId: '0PS000000000002', SobjectType: 'Account', PermissionsRead: true }
  ];
  describes: Record<string, unknown[]> = {
    Account: [
      { name: 'Name', label: 'Account Name', type: 'string', permissionable: false, calculated: false, autoNumber: false, custom: false },
      { name: 'Industry', label: 'Industry', type: 'picklist', permissionable: true, calculated: false, autoNumber: false, custom: false },
      { name: 'Tax_Code__c', label: 'Tax Code', type: 'string', permissionable: true, calculated: false, autoNumber: false, custom: true },
      { name: 'Score__c', label: 'Score', type: 'double', permissionable: true, calculated: true, autoNumber: false, custom: true },
      { name: 'BillingAddress', label: 'Billing Address', type: 'address', permissionable: true, calculated: false, autoNumber: false, custom: false }
    ]
  };

  constructor(readonly isSandbox = true) {
    this.addPerm('0PS000000000001', 'Account.Industry', true, false);
  }

  addPerm(parentId: string, field: string, read: boolean, edit: boolean): string {
    const Id = `01k${String(++this.seq).padStart(12, '0')}`;
    this.fieldPerms.push({ Id, ParentId: parentId, SobjectType: field.split('.')[0]!, Field: field, PermissionsRead: read, PermissionsEdit: edit });
    return Id;
  }

  async query<T>(soql: string): Promise<T[]> {
    if (soql.includes('FROM PermissionSet')) return this.permissionSets as T[];
    if (soql.includes('FROM Organization')) return [{ Id: '00D000000000001', Name: this.isSandbox ? 'Acme UAT' : 'Acme', IsSandbox: this.isSandbox }] as T[];
    if (soql.includes('FROM UserPermissionAccess')) return [{ PermissionsApiEnabled: true, PermissionsViewSetup: true, PermissionsManageProfilesPermissionsets: true }] as T[];
    const objects = ins(soql, 'SobjectType');
    const parents = ins(soql, 'ParentId');
    if (soql.includes('FROM FieldPermissions')) return this.fieldPerms.filter(p => objects.has(p.SobjectType) && parents.has(p.ParentId)).map(p => ({ ...p })) as T[];
    if (soql.includes('FROM ObjectPermissions')) return this.objectPerms.filter(p => objects.has(p.SobjectType) && parents.has(p.ParentId)) as T[];
    throw new Error(`Unexpected query: ${soql}`);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.calls.push(`${method} ${path.split('?')[0]}`);
    const describe = path.match(/\/sobjects\/(\w+)\/describe$/);
    if (method === 'GET' && describe) return { fields: this.describes[describe[1]!] ?? [] } as T;
    if (method === 'GET' && path.endsWith('/sobjects')) return { sobjects: [{ name: 'Account', label: 'Account', custom: false, queryable: true, layoutable: true, deprecatedAndHidden: false }] } as T;
    const records = (body as { records?: Record<string, unknown>[] } | undefined)?.records ?? [];
    if (method === 'POST') {
      return records.map((r): SaveResult => {
        if (this.rejectFields.has(r.Field as string)) return { success: false, errors: [{ statusCode: 'FIELD_INTEGRITY_EXCEPTION', message: 'Not available for this license' }] };
        return { id: this.addPerm(r.ParentId as string, r.Field as string, r.PermissionsRead as boolean, r.PermissionsEdit as boolean), success: true };
      }) as T;
    }
    if (method === 'PATCH') {
      return records.map((r): SaveResult => {
        const p = this.fieldPerms.find(x => x.Id === r.Id);
        if (!p) return { success: false, errors: [{ statusCode: 'ENTITY_IS_DELETED', message: 'gone' }] };
        p.PermissionsRead = r.PermissionsRead as boolean; p.PermissionsEdit = r.PermissionsEdit as boolean;
        return { id: p.Id, success: true };
      }) as T;
    }
    if (method === 'DELETE') {
      const ids = new URL(`https://x${path}`).searchParams.get('ids')!.split(',');
      return ids.map((id): SaveResult => {
        const before = this.fieldPerms.length;
        this.fieldPerms = this.fieldPerms.filter(p => p.Id !== id);
        return before === this.fieldPerms.length ? { success: false, errors: [{ statusCode: 'ENTITY_IS_DELETED', message: 'gone' }] } : { id, success: true };
      }) as T;
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  }
}
