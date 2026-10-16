import { afterEach, describe, expect, it, vi } from 'vitest';
import { SalesforceClient } from '../src/salesforce/client.ts';
import { demoOrg } from '../src/salesforce/demo.ts';
import { loadLayoutAnalysis, loadPageAnalysis } from '../src/salesforce/pages.ts';

describe('layout analysis', () => {
  it('reads assignments, finds unassigned layouts and fields the profile cannot read', async () => {
    const org = demoOrg();
    const r = await loadLayoutAnalysis(org, 'Account');
    expect(r.recordTypes.map(t => t.label)).toEqual(['Business', 'Partner', 'Master']);
    expect(r.layouts.map(l => l.name)).toEqual(['Account Layout', 'Account Partner Layout', 'Account (Marketing) Layout']);
    const sales = r.profiles.find(p => p.name === 'Sales User')!;
    expect(sales.fullName).toBe('Sales User');
    expect(r.assignments.filter(x => x.profileId === sales.id).map(x => [x.recordTypeId, x.layoutId]))
      .toEqual([['0120000000000B1', '00h0000000000L1'], ['0120000000000B2', '00h0000000000L2'], [null, '00h0000000000L1']]);
    expect(r.assignments.some(x => x.layoutId === '00h0000000000L3')).toBe(false);

    // Every gap is a permissionable field on the layout without read for that profile.
    expect(r.gaps.length).toBeGreaterThan(0);
    for (const g of r.gaps) {
      const permSetId = r.profiles.find(p => p.id === g.profileId)!.permSetId;
      const layout = r.layouts.find(l => l.id === g.layoutId)!;
      for (const f of g.fields) {
        expect(layout.fields).toContain(f);
        expect(org.fieldPerms.some(p => p.ParentId === permSetId && p.Field === f && p.PermissionsRead)).toBe(false);
      }
    }
    expect(r.gaps.flatMap(g => g.fields)).not.toContain('Account.Name');
  });
});

describe('Lightning page analysis', () => {
  it('reads pages and their org, app and profile assignments', async () => {
    const r = await loadPageAnalysis(demoOrg(), 'Account');
    expect(r.pages.map(p => p.name)).toEqual(['Account_Record_Page', 'Account_Sales_Page', 'Account_Partner_Page', 'Account_Draft']);
    expect(r.pages[1]!.fields).toEqual(['Account.Industry', 'Account.AnnualRevenue', 'Account.Tax_Code__c', 'Account.Billing_IBAN__c']);
    expect(r.apps.map(a => a.label)).toEqual(['Sales', 'Service Console']);
    expect(r.forms.Large.orgDefault).toBe('Account_Record_Page');
    expect(r.forms.Large.appDefaults).toEqual([{ app: 'standard__LightningSales', page: 'Account_Sales_Page' }]);
    expect(r.forms.Large.assignments).toEqual([
      { app: 'standard__LightningSales', profile: 'Sales User', recordType: 'Partner', page: 'Account_Partner_Page' },
      { app: 'standard__LightningSales', profile: 'Partner Community User', recordType: 'Partner', page: 'Account_Partner_Page' }
    ]);
  });
});

describe('Metadata SOAP client', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('parses readMetadata records, keeping single overrides as lists', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Body><readMetadataResponse><result>
      <records xsi:type="CustomApplication"><fullName>Sales</fullName><label>Sales &amp; Co</label><uiType>Lightning</uiType>
        <profileActionOverrides><actionName>View</actionName><content>Account_Partner</content><formFactor>Large</formFactor><pageOrSobjectType>Account</pageOrSobjectType><recordType>Account.Partner</recordType><type>Flexipage</type><profile>Admin</profile></profileActionOverrides>
      </records><records xsi:nil="true"/></result></readMetadataResponse></soapenv:Body></soapenv:Envelope>`;
    const fetchMock = vi.fn(async () => new Response(xml, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new SalesforceClient({ instanceUrl: 'https://acme.my.salesforce.com', apiVersion: 'v62.0', accessToken: 'tok', refresh: async () => 'tok' });
    const records = await client.readMetadata('CustomApplication', ['Sales', 'Missing']);
    expect(records).toEqual([{
      fullName: 'Sales', label: 'Sales & Co', uiType: 'Lightning',
      profileActionOverrides: [{ actionName: 'View', content: 'Account_Partner', formFactor: 'Large', pageOrSobjectType: 'Account', recordType: 'Account.Partner', type: 'Flexipage', profile: 'Admin' }]
    }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://acme.my.salesforce.com/services/Soap/m/62.0');
    expect(String(init.body)).toContain('<met:fullNames>Missing</met:fullNames>');
  });

  it('turns a SOAP fault into an error', async () => {
    const fault = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><soapenv:Fault><faultcode>sf:INSUFFICIENT_ACCESS</faultcode><faultstring>No access</faultstring></soapenv:Fault></soapenv:Body></soapenv:Envelope>`;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(fault, { status: 500 })));
    const client = new SalesforceClient({ instanceUrl: 'https://x', apiVersion: 'v62.0', accessToken: 'tok', refresh: async () => 'tok' });
    await expect(client.listMetadata('Profile')).rejects.toThrow('sf:INSUFFICIENT_ACCESS: No access');
  });
});
