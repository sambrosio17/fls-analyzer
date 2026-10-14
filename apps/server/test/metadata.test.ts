import { describe, expect, it } from 'vitest';
import { demoOrg } from '../src/salesforce/demo.ts';
import { accessStrings, loadFields, loadPermissionSets, loadSnapshot } from '../src/salesforce/metadata.ts';

describe('accessStrings', () => {
  it('encodes one char per field and skips permission sets without access', () => {
    const perm = (parentId: string, field: string, read: boolean, edit: boolean) => ({ id: `${parentId}${field}`, parentId, sobjectType: 'Account', field, read, edit });
    const out = accessStrings(['Account.A', 'Account.B', 'Account.C'], [
      perm('ps1', 'Account.B', true, false), perm('ps1', 'Account.C', true, true),
      perm('ps2', 'Account.A', false, false), perm('ps3', 'Account.Unknown', true, true)
    ]);
    expect(out).toEqual({ ps1: '012' });
  });
});

describe('large demo org', () => {
  it('loads every permission set across several query chunks', async () => {
    const org = demoOrg(true);
    const [fields, permissionSets] = await Promise.all([loadFields(org, ['Account']), loadPermissionSets(org)]);
    expect(fields.length).toBeGreaterThan(400);
    expect(permissionSets.length).toBeGreaterThan(1500);
    const { fieldPerms } = await loadSnapshot(org, ['Account'], permissionSets.map(p => p.id));
    const access = accessStrings(fields.map(f => f.name), fieldPerms);
    expect(new Set(fieldPerms.map(r => r.parentId)).size).toBe(Object.keys(access).length);
    expect(Object.values(access).every(s => s.length === fields.length)).toBe(true);
  });
});
