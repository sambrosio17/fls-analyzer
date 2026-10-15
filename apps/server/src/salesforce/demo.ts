import { MemoryOrg, type MemField, type MemPages, type MemPermSet } from './memoryOrg.ts';

/** Demo org with sample data, to try the app without a Salesforce org (DEMO_MODE=true). */
export const DEMO_ORG_ID = 'demo';

const f = (name: string, label: string, type: string, extra: Partial<MemField> = {}): MemField =>
  ({ name, label, type, permissionable: true, calculated: false, autoNumber: false, custom: name.endsWith('__c'), ...extra });

const profile = (id: string, name: string, license = 'Salesforce'): MemPermSet =>
  ({ Id: id, Name: `X00e${id.slice(-2)}`, Label: `X00e${id.slice(-2)}`, Type: 'Profile', IsOwnedByProfile: true, NamespacePrefix: null, PermissionSetGroupId: null, Profile: { Name: name, UserLicense: { Name: license } }, ProfileId: profileId(id) });
/** Profile record id derived from the profile-owned permission set id (0PS... -> 00e...). */
const profileId = (permSetId: string) => `00e${permSetId.slice(3)}`;
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
  const org = new MemoryOrg({ name: 'Demo (dati di esempio)', isSandbox: true, permissionSets, objectPerms, describes, pages: demoPages(permissionSets) });
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

/** Page layouts and Lightning pages: one unassigned layout and page, a partner record type with its own layout and page. */
function demoPages(permissionSets: MemPermSet[]): MemPages {
  const profiles = permissionSets.filter(p => p.IsOwnedByProfile);
  const fullName = (p: MemPermSet) => p.Profile!.Name === 'System Administrator' ? 'Admin' : p.Profile!.Name;
  const BUSINESS = '0120000000000B1', PARTNER = '0120000000000B2';
  const layouts: MemPages['layouts'] = [
    { Id: '00h0000000000L1', Name: 'Account Layout', NamespacePrefix: null, TableEnumOrId: 'Account', fields: ['Name', 'Industry', 'Rating', 'AnnualRevenue', 'Tax_Code__c', 'Billing_IBAN__c'] },
    { Id: '00h0000000000L2', Name: 'Account Partner Layout', NamespacePrefix: null, TableEnumOrId: 'Account', fields: ['Name', 'Industry', 'CustomerPriority__c', 'SLAExpirationDate__c'] },
    { Id: '00h0000000000L3', Name: 'Account (Marketing) Layout', NamespacePrefix: null, TableEnumOrId: 'Account', fields: ['Name', 'Rating'] },
    { Id: '00h0000000000L4', Name: 'Opportunity Layout', NamespacePrefix: null, TableEnumOrId: 'Opportunity', fields: ['StageName', 'Amount', 'Probability', 'Discount__c', 'Margin__c'] },
    { Id: '00h0000000000L5', Name: 'Contact Layout', NamespacePrefix: null, TableEnumOrId: 'Contact', fields: ['Email', 'Phone', 'Birthdate', 'Fiscal_Code__c'] }
  ];
  const profileLayouts: MemPages['profileLayouts'] = profiles.flatMap(p => {
    const partnerUser = p.Profile!.Name === 'Partner Community User';
    const sales = p.Profile!.Name === 'Sales User';
    const account = (rt: string | null) => partnerUser || (sales && rt === PARTNER) ? '00h0000000000L2' : '00h0000000000L1';
    return [
      ...[BUSINESS, PARTNER, null].map(rt => ({ ProfileId: p.ProfileId!, LayoutId: account(rt), RecordTypeId: rt, TableEnumOrId: 'Account' })),
      { ProfileId: p.ProfileId!, LayoutId: '00h0000000000L4', RecordTypeId: null, TableEnumOrId: 'Opportunity' },
      { ProfileId: p.ProfileId!, LayoutId: '00h0000000000L5', RecordTypeId: null, TableEnumOrId: 'Contact' }
    ];
  });
  const page = (id: string, name: string, label: string, object: string, components: string[], fields: string[] = []) =>
    ({ Id: id, DeveloperName: name, MasterLabel: label, NamespacePrefix: null, EntityDefinitionId: object, components, fields });
  const base = ['force:highlightsPanel', 'flexipage:tabset', 'force:relatedListContainer'];
  const view = (content: string, extra: Record<string, string> = {}) => ({ actionName: 'View', content, formFactor: 'Large', type: 'Flexipage', ...extra });
  return {
    recordTypes: [
      { Id: BUSINESS, Name: 'Business', DeveloperName: 'Business', IsActive: true, NamespacePrefix: null, SobjectType: 'Account' },
      { Id: PARTNER, Name: 'Partner', DeveloperName: 'Partner', IsActive: true, NamespacePrefix: null, SobjectType: 'Account' }
    ],
    profileFullNames: Object.fromEntries(profiles.map(p => [p.ProfileId!, fullName(p)])),
    layouts,
    profileLayouts,
    flexiPages: [
      page('0M00000000000P1', 'Account_Record_Page', 'Account Record Page', 'Account', [...base, 'force:recordDetailPanelMobile']),
      page('0M00000000000P2', 'Account_Sales_Page', 'Account (Sales)', 'Account', [...base, 'runtime_sales_activities:activityPanel', 'flexipage:fieldSection'], ['Industry', 'AnnualRevenue', 'Tax_Code__c', 'Billing_IBAN__c']),
      page('0M00000000000P3', 'Account_Partner_Page', 'Account (Partner)', 'Account', [...base, 'flexipage:fieldSection'], ['Industry', 'CustomerPriority__c']),
      page('0M00000000000P4', 'Account_Draft', 'Account (bozza)', 'Account', ['force:highlightsPanel']),
      page('0M00000000000P5', 'Opportunity_Record_Page', 'Opportunity Record Page', 'Opportunity', [...base, 'runtime_sales_pathassistant:pathAssistant'])
    ],
    apps: [
      {
        fullName: 'standard__LightningSales', label: 'Sales', uiType: 'Lightning',
        actionOverrides: [view('Account_Sales_Page', { pageOrSobjectType: 'Account' })],
        profileActionOverrides: ['Sales User', 'Partner Community User'].map(profile =>
          view('Account_Partner_Page', { pageOrSobjectType: 'Account', recordType: 'Account.Partner', profile }))
      },
      { fullName: 'standard__LightningService', label: 'Service Console', uiType: 'Lightning' },
      { fullName: 'Classic_Sales', label: 'Sales (Classic)', uiType: 'Aloha' }
    ],
    objects: [
      { fullName: 'Account', actionOverrides: [view('Account_Record_Page')] },
      { fullName: 'Opportunity', actionOverrides: [view('Opportunity_Record_Page')] },
      { fullName: 'Contact' }
    ]
  };
}
