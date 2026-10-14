import { MemoryOrg, type MemField, type MemPermSet } from './memoryOrg.ts';

/** Demo org with sample data, to try the app without a Salesforce org (DEMO_MODE=true). */
export const DEMO_ORG_ID = 'demo';

const f = (name: string, label: string, type: string, extra: Partial<MemField> = {}): MemField =>
  ({ name, label, type, permissionable: true, calculated: false, autoNumber: false, custom: name.endsWith('__c'), ...extra });

const profile = (id: string, name: string, license = 'Salesforce'): MemPermSet =>
  ({ Id: id, Name: `X00e${id.slice(-2)}`, Label: `X00e${id.slice(-2)}`, Type: 'Profile', IsOwnedByProfile: true, NamespacePrefix: null, PermissionSetGroupId: null, Profile: { Name: name, UserLicense: { Name: license } } });
const permSet = (id: string, name: string, label: string, ns: string | null = null): MemPermSet =>
  ({ Id: id, Name: name, Label: label, Type: 'Regular', IsOwnedByProfile: false, NamespacePrefix: ns, PermissionSetGroupId: null, Profile: null });

const DESCRIBES = {
  Account: { label: 'Account', fields: [
    f('Name', 'Account Name', 'string', { permissionable: false }), f('AnnualRevenue', 'Annual Revenue', 'currency'),
    f('Industry', 'Industry', 'picklist'), f('Rating', 'Rating', 'picklist'), f('CustomerPriority__c', 'Customer Priority', 'picklist'),
    f('SLAExpirationDate__c', 'SLA Expiration Date', 'date'), f('Credit_Score__c', 'Credit Score', 'double', { calculated: true }),
    f('Tax_Code__c', 'Tax Code', 'string'), f('Internal_Rating__c', 'Internal Rating', 'Picklist', { hidden: true }), f('Billing_IBAN__c', 'Billing IBAN', 'encryptedstring', { encrypted: true }),
    f('BillingAddress', 'Billing Address', 'address')
  ] },
  Opportunity: { label: 'Opportunity', fields: [
    f('StageName', 'Stage', 'picklist', { permissionable: false }), f('Amount', 'Amount', 'currency'), f('Probability', 'Probability (%)', 'percent'),
    f('NextStep', 'Next Step', 'string'), f('Discount__c', 'Discount', 'percent'), f('Margin__c', 'Margin', 'currency', { calculated: true }),
    f('Loss_Reason__c', 'Loss Reason', 'textarea')
  ] },
  Contact: { label: 'Contact', fields: [
    f('Email', 'Email', 'email'), f('Phone', 'Phone', 'phone'), f('Birthdate', 'Birthdate', 'date'),
    f('Fiscal_Code__c', 'Fiscal Code', 'encryptedstring', { encrypted: true }), f('Contact_Code__c', 'Contact Code', 'string', { autoNumber: true })
  ] }
};

/** `large` adds hundreds of fields and over a thousand permission sets, to try the matrix at scale (DEMO_LARGE=true). */
export function demoOrg(large = false): MemoryOrg {
  const permissionSets = [
    profile('0PS0000000000A1', 'System Administrator'), profile('0PS0000000000A2', 'Sales User'), profile('0PS0000000000A3', 'Customer Service'),
    profile('0PS0000000000A5', 'Partner Community User', 'Partner Community'),
    permSet('0PS0000000000B1', 'Finance_Access', 'Finance Access'), permSet('0PS0000000000B2', 'Sales_Ops', 'Sales Ops'),
    permSet('0PS0000000000B3', 'GDPR_Data_Steward', 'GDPR Data Steward'), permSet('0PS0000000000B4', 'CPQ_Admin', 'CPQ Admin', 'SBQQ')
  ];
  const describes = large ? withExtraFields(DESCRIBES, 400) : DESCRIBES;
  if (large) {
    for (let k = 1; k <= 1500; k++) {
      const id = `0PS9${String(k).padStart(11, '0')}`;
      permissionSets.push(k % 5 === 0 ? profile(id, `Profilo ${k}`) : permSet(id, `Demo_Set_${k}`, `Permission set demo ${k}`));
    }
  }
  const noObject: Record<string, string[]> = { '0PS0000000000B1': ['Contact'], '0PS0000000000B3': ['Opportunity'], '0PS0000000000A5': ['Contact'] };
  const objectPerms = permissionSets.flatMap(p => Object.keys(describes)
    .filter(o => !(noObject[p.Id] ?? []).includes(o)).map(o => ({ ParentId: p.Id, SobjectType: o, PermissionsRead: true })));
  const org = new MemoryOrg({ name: 'Demo (dati di esempio)', isSandbox: true, permissionSets, objectPerms, describes });
  // Inserting encrypted fields fails, to show per-row errors in the result.
  org.rejectFields = new Set(['Account.Billing_IBAN__c', 'Contact.Fiscal_Code__c']);

  // Deterministic sample access.
  let n = 7;
  const rnd = () => (n = (n * 48271) % 2147483647) % 10;
  for (const p of permissionSets) {
    for (const [obj, d] of Object.entries(describes)) {
      if ((noObject[p.Id] ?? []).includes(obj)) continue;
      for (const field of d.fields) {
        if (!field.permissionable || field.type === 'address') continue;
        const r = p.Profile?.Name === 'System Administrator' ? 9 : rnd();
        if (r < 3) continue;
        const edit = r >= 7 && !field.calculated && !field.autoNumber;
        org.addPerm(p.Id, `${obj}.${field.name}`, true, edit);
      }
    }
  }
  return org;
}

function withExtraFields(base: typeof DESCRIBES, count: number): typeof DESCRIBES {
  const extra = Array.from({ length: count }, (_, k) => f(`Extra_Field_${k + 1}__c`, `Campo extra ${k + 1}`, k % 3 ? 'string' : 'picklist'));
  return { ...base, Account: { ...base.Account, fields: [...base.Account.fields, ...extra] } };
}
