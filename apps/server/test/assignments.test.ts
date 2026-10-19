import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.ts';
import { DEFAULT_TENANT, type Db } from '../src/db.ts';
import { addUser, config, login, OWNER, openTestDb } from './helpers.ts';
import { SalesforceClient, toXml } from '../src/salesforce/client.ts';
import { demoOrg } from '../src/salesforce/demo.ts';
import { loadLayoutAnalysis, loadPageAnalysis } from '../src/salesforce/pages.ts';
import { writeAssignments } from '../src/services/assignments.ts';
import { assignmentFromRow } from '../src/db.ts';


async function setup(reuse?: { db: Db; org: ReturnType<typeof demoOrg> }) {
  const db = reuse?.db ?? await openTestDb();
  if (!reuse) await addUser(db);
  const org = reuse?.org ?? demoOrg();
  if (!reuse) await db.upsertOrg({ id: 'org1', tenant_id: DEFAULT_TENANT, sf_org_id: '00D000000000001', name: 'Acme UAT', username: 'me@acme.com',
    instance_url: 'https://acme.my.salesforce.com', login_url: 'https://test.salesforce.com', is_sandbox: 1, refresh_token_enc: 'x', access_token_enc: null, alias: null });
  const app = buildApp({ config, db, apiFor: () => org });
  const cookie = await login(app);
  const call = async (method: 'GET' | 'POST', url: string, payload?: object) => {
    const res = await app.inject({ method, url, payload, headers: { cookie } });
    return { status: res.statusCode, body: res.json() };
  };
  const run = async (id: string) => {
    await call('POST', `/api/change-sets/${id}/execute`, {});
    for (let i = 0; i < 50; i++) {
      const { body } = await call('GET', `/api/change-sets/${id}`);
      if (body.status !== 'running') return body;
      await new Promise(r => setTimeout(r, 10));
    }
    throw new Error('timeout');
  };
  return { app, org, db, call, run };
}

let current: Awaited<ReturnType<typeof setup>> | null = null;
afterEach(async () => { await current?.app.close(); current = null; vi.unstubAllGlobals(); });

const layout = (profile: string, recordType: string | null, after: string) =>
  ({ kind: 'layout', object: 'Account', profile, profileLabel: profile, recordType, app: null, after });
const page = (profile: string, recordType: string | null, after: string | null) =>
  ({ kind: 'page', object: 'Account', profile, profileLabel: profile, recordType, app: 'standard__LightningSales', after });

describe('assignment change sets', () => {
  it('picks up a run cut short by a restart without flagging the assignment already written', async () => {
    current = await setup();
    const { call, db, org } = current;
    const cs = (await call('POST', '/api/orgs/org1/assignment-change-sets', {
      changes: [layout('Sales User', 'Business', 'Account (Marketing) Layout'), page('Admin', 'Partner', 'Account_Sales_Page')]
    })).body;
    // The server stopped after writing the layout, before recording it.
    await db.updateChangeSet(cs.id, { status: 'running', started_at: new Date().toISOString() });
    const [written] = (await db.listAssignments(cs.id)).filter(r => r.kind === 'layout').map(assignmentFromRow);
    expect((await writeAssignments(org, [written!]))[0]!.ok).toBe(true);
    await current.app.close();

    current = await setup({ db, org });
    let done = (await current.call('GET', `/api/change-sets/${cs.id}`)).body;
    for (let i = 0; i < 50 && done.status === 'running'; i++) {
      await new Promise(r => setTimeout(r, 10));
      done = (await current.call('GET', `/api/change-sets/${cs.id}`)).body;
    }
    expect(done.status).toBe('done');
    expect(done.resumedAt).not.toBeNull();
    expect(done.assignments.map((a: { status: string }) => a.status)).toEqual(['ok', 'ok']);
  });

  it('previews with the org values, writes layouts and pages, verifies and rolls back', async () => {
    current = await setup();
    const { call, run, org } = current;
    const created = await call('POST', '/api/orgs/org1/assignment-change-sets', {
      description: 'Marketing layout',
      changes: [
        layout('Sales User', 'Business', 'Account (Marketing) Layout'),
        layout('Sales User', null, 'Account Layout'), // already so: dropped
        page('Admin', 'Partner', 'Account_Sales_Page'),
        page('Sales User', 'Partner', null)
      ]
    });
    expect(created.status).toBe(200);
    const cs = created.body;
    expect(cs.kind).toBe('assignments');
    expect(cs.assignments.map((a: { profile: string; before: string | null; after: string | null }) => [a.profile, a.before, a.after])).toEqual([
      ['Sales User', 'Account Layout', 'Account (Marketing) Layout'],
      ['Admin', null, 'Account_Sales_Page'],
      ['Sales User', 'Account_Partner_Page', null]
    ]);

    const done = await run(cs.id);
    expect(done.status).toBe('done');
    expect(done.assignments.every((a: { status: string }) => a.status === 'ok')).toBe(true);

    const layouts = await loadLayoutAnalysis(org, 'Account');
    const sales = layouts.profiles.find(p => p.name === 'Sales User')!;
    expect(layouts.assignments.find(a => a.profileId === sales.id && a.recordTypeId === '0120000000000B1')!.layoutId).toBe('00h0000000000L3');
    const pages = await loadPageAnalysis(org, 'Account');
    expect(pages.forms.Large.assignments).toEqual([
      { app: 'standard__LightningSales', profile: 'Partner Community User', recordType: 'Partner', page: 'Account_Partner_Page' },
      { app: 'standard__LightningSales', profile: 'Admin', recordType: 'Partner', page: 'Account_Sales_Page' }
    ]);

    const list = await call('GET', '/api/change-sets?orgId=org1');
    expect(list.body[0]).toMatchObject({ kind: 'assignments', total: 3, ok: 3 });

    const rb = await call('POST', `/api/change-sets/${cs.id}/rollback`);
    expect(rb.body.assignments.map((a: { before: string | null; after: string | null }) => [a.before, a.after])).toEqual([
      ['Account (Marketing) Layout', 'Account Layout'], ['Account_Sales_Page', null], [null, 'Account_Partner_Page']
    ]);
    expect((await run(rb.body.id)).status).toBe('done');
    expect((await loadPageAnalysis(org, 'Account')).forms.Large.assignments).toEqual([
      { app: 'standard__LightningSales', profile: 'Partner Community User', recordType: 'Partner', page: 'Account_Partner_Page' },
      { app: 'standard__LightningSales', profile: 'Sales User', recordType: 'Partner', page: 'Account_Partner_Page' }
    ]);
  });

  it('skips assignments changed after the preview and reports Salesforce errors per row', async () => {
    current = await setup();
    const { call, run, org } = current;
    const cs = (await call('POST', '/api/orgs/org1/assignment-change-sets', {
      changes: [layout('Sales User', 'Business', 'Account Partner Layout'), page('Admin', null, 'Missing_Page'), page('Sales User', 'Partner', 'Account_Sales_Page')]
    })).body;
    // Someone changes the Sales User layout in Setup meanwhile.
    const salesId = Object.entries(org.data.pages!.profileFullNames).find(([, n]) => n === 'Sales User')![0];
    org.data.pages!.profileLayouts.find(l => l.ProfileId === salesId && l.RecordTypeId === '0120000000000B1')!.LayoutId = '00h0000000000L3';

    const done = await run(cs.id);
    expect(done.status).toBe('partial');
    // The unknown page is refused before writing, so the other change in the same app still goes through.
    expect(done.assignments.map((a: { status: string; errorCode: string | null }) => [a.status, a.errorCode])).toEqual([
      ['conflict', 'CONFLICT'], ['error', 'UNKNOWN_PAGE'], ['ok', null]
    ]);
    expect(done.timings.map((t: { step: string }) => t.step)).toContain('save app');
  });

  it('finds the change Salesforce refuses and retries a profile name in its plain form', async () => {
    current = await setup();
    const { call, run, org } = current;
    const names = org.data.pages!.profileFullNames;
    const csId = Object.entries(names).find(([, n]) => n === 'Customer Service')![0];
    names[csId] = 'Customer %28EU%29 Service';
    // This org accepts only the plain name of that profile, and refuses any override for Admin.
    org.rejectAppProfiles = new Set(['Customer %28EU%29 Service', 'Admin']);
    const cs = (await call('POST', '/api/orgs/org1/assignment-change-sets', {
      changes: [page('Customer %28EU%29 Service', 'Business', 'Account_Partner_Page'), page('Admin', 'Business', 'Account_Partner_Page'), page('Sales User', 'Business', 'Account_Partner_Page')]
    })).body;
    const done = await run(cs.id);
    expect(done.status).toBe('partial');
    expect(done.assignments.map((a: { profile: string; status: string; errorCode: string | null }) => [a.profile, a.status, a.errorCode])).toEqual([
      ['Admin', 'error', 'INVALID_CROSS_REFERENCE_KEY'], ['Customer %28EU%29 Service', 'ok', null], ['Sales User', 'ok', null]
    ]);
    const app = org.data.pages!.apps.find(a => a.fullName === 'standard__LightningSales')!;
    expect((app.profileActionOverrides as { profile: string }[]).map(o => o.profile)).toContain('Customer (EU) Service');
  });

  it('keeps desktop and phone assignments apart', async () => {
    current = await setup();
    const { call, run, org } = current;
    const cs = (await call('POST', '/api/orgs/org1/assignment-change-sets', {
      changes: [{ ...page('Admin', 'Partner', 'Account_Partner_Page'), formFactor: 'Small' }]
    })).body;
    expect(cs.assignments[0]).toMatchObject({ formFactor: 'Small', before: null });
    expect((await run(cs.id)).status).toBe('done');
    const r = await loadPageAnalysis(org, 'Account');
    expect(r.forms.Small.assignments).toEqual([{ app: 'standard__LightningSales', profile: 'Admin', recordType: 'Partner', page: 'Account_Partner_Page' }]);
    expect(r.forms.Large.assignments.some(a => a.profile === 'Admin')).toBe(false);
    expect(r.apps.find(a => a.name === 'standard__LightningSales')!.formFactors).toEqual(['Large', 'Small']);
  });

  it('refuses a change set that changes nothing', async () => {
    current = await setup();
    const res = await current.call('POST', '/api/orgs/org1/assignment-change-sets', { changes: [layout('Sales User', null, 'Account Layout')] });
    expect(res.status).toBe(400);
  });
});

describe('Metadata updateMetadata', () => {
  it('writes records in key order and reads per-record results', async () => {
    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://soap.sforce.com/2006/04/metadata"><soapenv:Body><updateMetadataResponse>
      <result><fullName>Admin</fullName><success>true</success></result>
      <result><errors><message>no Layout named X</message><statusCode>INVALID_CROSS_REFERENCE_KEY</statusCode></errors><fullName>Sales User</fullName><success>false</success></result>
      </updateMetadataResponse></soapenv:Body></soapenv:Envelope>`;
    const fetchMock = vi.fn(async () => new Response(xml, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new SalesforceClient({ instanceUrl: 'https://acme.my.salesforce.com', apiVersion: 'v62.0', accessToken: 'tok', refresh: async () => 'tok' });
    const res = await client.updateMetadata('Profile', [
      { fullName: 'Admin', layoutAssignments: [{ layout: 'Account-Account Layout', recordType: 'Account.Partner' }] },
      { fullName: 'Sales User', layoutAssignments: [{ layout: 'X' }] }
    ]);
    expect(res).toEqual([
      { fullName: 'Admin', success: true, errors: [] },
      { fullName: 'Sales User', success: false, errors: [{ statusCode: 'INVALID_CROSS_REFERENCE_KEY', message: 'no Layout named X' }] }
    ]);
    const body = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(body).toContain('<met:updateMetadata><met:metadata xsi:type="met:Profile"><met:fullName>Admin</met:fullName><met:layoutAssignments><met:layout>Account-Account Layout</met:layout><met:recordType>Account.Partner</met:recordType></met:layoutAssignments></met:metadata>');
    expect(toXml({ fullName: 'A&B', empty: '', tabs: ['x', 'y'] })).toBe('<met:fullName>A&amp;B</met:fullName><met:tabs>x</met:tabs><met:tabs>y</met:tabs>');
  });
});
