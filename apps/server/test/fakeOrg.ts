import { MemoryOrg, type MemField } from '../src/salesforce/memoryOrg.ts';

const f = (name: string, label: string, type: string, extra: Partial<MemField> = {}): MemField =>
  ({ name, label, type, permissionable: true, calculated: false, autoNumber: false, custom: name.endsWith('__c'), ...extra });

export function fakeOrg(isSandbox = true): MemoryOrg {
  const org = new MemoryOrg({
    name: isSandbox ? 'Acme UAT' : 'Acme',
    isSandbox,
    permissionSets: [
      { Id: '0PS000000000001', Name: 'X00e1', Label: 'X00e1', Type: 'Profile', IsOwnedByProfile: true, NamespacePrefix: null, PermissionSetGroupId: null, Profile: { Name: 'Sales User', UserLicense: { Name: 'Salesforce' } } },
      { Id: '0PS000000000002', Name: 'Finance_Access', Label: 'Finance Access', Type: 'Regular', IsOwnedByProfile: false, NamespacePrefix: null, PermissionSetGroupId: null, Profile: null },
      { Id: '0PS000000000003', Name: 'CPQ_Admin', Label: 'CPQ Admin', Type: 'Regular', IsOwnedByProfile: false, NamespacePrefix: 'SBQQ', PermissionSetGroupId: null, Profile: null },
      { Id: '0PS000000000004', Name: 'Grp', Label: 'Group aggregate', Type: 'Group', IsOwnedByProfile: false, NamespacePrefix: null, PermissionSetGroupId: '0PG000000000001', Profile: null }
    ],
    objectPerms: [
      { ParentId: '0PS000000000001', SobjectType: 'Account', PermissionsRead: true },
      { ParentId: '0PS000000000002', SobjectType: 'Account', PermissionsRead: true }
    ],
    describes: {
      Account: {
        label: 'Account',
        fields: [
          f('Name', 'Account Name', 'string', { permissionable: false }),
          f('Industry', 'Industry', 'picklist'),
          f('Tax_Code__c', 'Tax Code', 'string'),
          f('Score__c', 'Score', 'double', { calculated: true }),
          f('Secret_Code__c', 'Secret Code', 'Text(20)', { hidden: true }),
          f('BillingAddress', 'Billing Address', 'address')
        ]
      }
    },
    apexClasses: [
      { Id: '01p000000000001', Name: 'AccountController', NamespacePrefix: null },
      { Id: '01p000000000002', Name: 'InvoiceBatch', NamespacePrefix: null },
      { Id: '01p000000000003', Name: 'QuoteCalculator', NamespacePrefix: 'SBQQ' }
    ]
  });
  org.addPerm('0PS000000000001', 'Account.Industry', true, false);
  org.addClassAccess('0PS000000000001', '01p000000000001');
  return org;
}
