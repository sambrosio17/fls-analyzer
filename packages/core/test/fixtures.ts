import { FlsSnapshot, type FieldMeta, type PermSetMeta } from '../src/index.ts';

const field = (name: string, extra: Partial<FieldMeta> = {}): FieldMeta => ({
  object: name.split('.')[0]!, name, label: name, type: 'string',
  permissionable: true, calculated: false, custom: name.endsWith('__c'), encrypted: false, ...extra
});
const ps = (id: string, extra: Partial<PermSetMeta> = {}): PermSetMeta => ({
  id, name: id, label: id, isProfile: false, namespace: null, license: null, type: 'Regular', ...extra
});

export const fields = new Map([
  field('Account.Industry'),
  field('Account.Tax_Code__c'),
  field('Account.Credit_Score__c', { calculated: true }),
  field('Account.Name', { permissionable: false }),
  field('Case.Priority')
].map(f => [f.name, f]));

export const permissionSets = new Map([
  ps('PS_SALES', { isProfile: true, type: 'Profile' }),
  ps('PS_FIN'),
  ps('PS_CPQ', { namespace: 'SBQQ' }),
  ps('PS_GROUP', { type: 'Group' })
].map(p => [p.id, p]));

export const snapshot = () => new FlsSnapshot(
  [
    { id: '01k1', parentId: 'PS_SALES', sobjectType: 'Account', field: 'Account.Industry', read: true, edit: false },
    { id: '01k2', parentId: 'PS_SALES', sobjectType: 'Account', field: 'Account.Tax_Code__c', read: true, edit: true },
    { id: '01k3', parentId: 'PS_FIN', sobjectType: 'Account', field: 'Account.Industry', read: true, edit: true }
  ],
  [
    { parentId: 'PS_SALES', sobjectType: 'Account', read: true },
    { parentId: 'PS_FIN', sobjectType: 'Account', read: true }
  ]
);
