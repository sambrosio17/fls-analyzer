import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { DEFAULT_TENANT, type Db } from '../src/db.ts';
import { addUser, config, login, OWNER, openTestDb } from './helpers.ts';
import { fakeOrg } from './fakeOrg.ts';
import { TokenCipher } from '../src/crypto.ts';
import type { TokenResponse } from '../src/salesforce/oauth.ts';


const SALES = '0PS000000000001';
const FIN = '0PS000000000002';
const CPQ = '0PS000000000003';

async function setup(isSandbox = true, reuse?: { db: Db; fake: ReturnType<typeof fakeOrg> }) {
  const db = reuse?.db ?? await openTestDb();
  if (!reuse) await addUser(db);
  const fake = reuse?.fake ?? fakeOrg(isSandbox);
  if (!reuse) await db.upsertOrg({ id: 'org1', tenant_id: DEFAULT_TENANT, sf_org_id: '00D000000000001', name: isSandbox ? 'Acme UAT' : 'Acme', username: 'me@acme.com',
    instance_url: 'https://acme.my.salesforce.com', login_url: 'https://login.salesforce.com', is_sandbox: isSandbox ? 1 : 0, refresh_token_enc: 'x', access_token_enc: null, alias: null });
  const app = buildApp({ config, db, apiFor: () => fake });
  const cookie = await login(app);
  const call = async (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) => {
    const res = await app.inject({ method, url, payload, headers: { cookie } });
    return { status: res.statusCode, body: res.json() };
  };
  const waitDone = async (id: string) => {
    for (let i = 0; i < 50; i++) {
      const { body } = await call('GET', `/api/change-sets/${id}`);
      if (!['running', 'approved'].includes(body.status)) return body;
      await new Promise(r => setTimeout(r, 10));
    }
    throw new Error('timeout');
  };
  return { app, db, fake, call, waitDone };
}

let current: Awaited<ReturnType<typeof setup>> | null = null;
afterEach(async () => { await current?.app.close(); current = null; });

describe('API', () => {
  it('requires login', async () => {
    current = await setup();
    const res = await current.app.inject({ method: 'GET', url: '/api/orgs' });
    expect(res.statusCode).toBe(401);
  });

  it('sends page loads to the APP_URL host so the session cookie survives the OAuth round trip', async () => {
    current = await setup();
    const res = await current.app.inject({ method: 'GET', url: '/oauth/callback?code=x&state=y', headers: { host: '127.0.0.1:3000' } });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/oauth/callback?code=x&state=y');
  });

  it('redirects OAuth routes without an app session to the login page instead of returning JSON', async () => {
    current = await setup();
    const res = await current.app.inject({ method: 'GET', url: '/oauth/callback?code=x&state=y', headers: { host: 'localhost:3000' } });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/^\/\?oauthError=/);
  });

  it('returns the matrix without compound fields and group permission sets', async () => {
    current = await setup();
    const { body } = await current.call('GET', '/api/orgs/org1/matrix?objects=Account');
    expect(body.fields.map((f: { name: string }) => f.name)).toEqual(['Account.Name', 'Account.Industry', 'Account.Tax_Code__c', 'Account.Score__c', 'Account.Secret_Code__c']);
    // Hidden from the connected user, so missing from describe: found through EntityParticle.
    expect(body.fields.filter((f: { hiddenFromUser?: boolean }) => f.hiddenFromUser).map((f: { name: string }) => f.name)).toEqual(['Account.Secret_Code__c']);
    expect(body.permissionSets.map((p: { label: string }) => p.label)).toEqual(['Sales User', 'CPQ Admin', 'Finance Access']);
    expect(body.access).toEqual({ [SALES]: '01000' });
  });

  it('plans changes on fields hidden from the connected user', async () => {
    current = await setup();
    const { body } = await current.call('POST', '/api/orgs/org1/change-sets', { changes: [{ parentId: SALES, field: 'Account.Secret_Code__c', access: 2 }] });
    expect(body.items.map((i: { field: string; op: string }) => [i.field, i.op])).toEqual([['Account.Secret_Code__c', 'insert']]);
  });

  it('plans, runs and verifies a bulk change on a sandbox, then rolls it back', async () => {
    current = await setup();
    const { call, waitDone, fake } = current;
    const created = await call('POST', '/api/orgs/org1/change-sets', {
      bulk: [{ fields: ['Account.Industry', 'Account.Tax_Code__c', 'Account.Score__c', 'Account.Name'], parentIds: [SALES, FIN, CPQ], action: 'edit' }]
    });
    expect(created.status).toBe(200);
    const cs = created.body;
    expect(cs.status).toBe('draft');
    expect(cs.items.map((i: { parentLabel: string; field: string; op: string; after: number }) => `${i.parentLabel}|${i.field}|${i.op}|${i.after}`)).toEqual([
      'Finance Access|Account.Industry|insert|2', 'Finance Access|Account.Score__c|insert|1', 'Finance Access|Account.Tax_Code__c|insert|2',
      'Sales User|Account.Industry|update|2', 'Sales User|Account.Score__c|insert|1', 'Sales User|Account.Tax_Code__c|insert|2'
    ]);
    const reasons = cs.skipped.map((s: { reason: string }) => s.reason).sort();
    expect(reasons).toEqual(['MANAGED_PERMISSION_SET', 'MANAGED_PERMISSION_SET', 'MANAGED_PERMISSION_SET', 'NOT_PERMISSIONABLE', 'NOT_PERMISSIONABLE', 'NOT_PERMISSIONABLE']);

    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, {})).status).toBe(200);
    const done = await waitDone(cs.id);
    expect(done.status).toBe('done');
    expect(done.items.every((i: { status: string }) => i.status === 'ok')).toBe(true);
    expect(fake.fieldPerms).toHaveLength(6);

    const rb = await call('POST', `/api/change-sets/${cs.id}/rollback`);
    expect(rb.body.rollbackOf).toBe(cs.id);
    expect(rb.body.items.map((i: { op: string }) => i.op).sort()).toEqual(['delete', 'delete', 'delete', 'delete', 'delete', 'update']);
    await call('POST', `/api/change-sets/${rb.body.id}/execute`, {});
    expect((await waitDone(rb.body.id)).status).toBe('done');
    expect(fake.fieldPerms.map(p => [p.ParentId, p.Field, p.PermissionsRead, p.PermissionsEdit])).toEqual([[SALES, 'Account.Industry', true, false]]);
  });

  it('picks up a run cut short by a restart without redoing or flagging the rows already written', async () => {
    current = await setup();
    const { db, fake, call } = current;
    const created = await call('POST', '/api/orgs/org1/change-sets', {
      bulk: [{ fields: ['Account.Industry', 'Account.Tax_Code__c'], parentIds: [SALES, FIN], action: 'edit' }]
    });
    const cs = created.body;
    const row = (label: string, field: string) => cs.items.find((i: { parentLabel: string; field: string }) => i.parentLabel === label && i.field === field);
    // The server stopped mid-run: one row was written and recorded, one written but not yet recorded, two not written.
    await db.updateChangeSet(cs.id, { status: 'running', started_at: new Date().toISOString() });
    fake.addPerm(FIN, 'Account.Industry', true, true);
    await db.updateItem(row('Finance Access', 'Account.Industry').id, { status: 'ok' });
    fake.addPerm(FIN, 'Account.Tax_Code__c', true, true);
    await current.app.close();

    current = await setup(true, { db, fake });
    const done = await current.waitDone(cs.id);
    expect(done.status).toBe('done');
    expect(done.resumedAt).not.toBeNull();
    expect(done.items.map((i: { status: string }) => i.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(fake.fieldPerms).toHaveLength(4);
  });

  it('reads Apex class access as a matrix of enabled classes', async () => {
    current = await setup();
    const { body } = await current.call('GET', '/api/orgs/org1/matrix?objects=ApexClass');
    expect(body.fields.map((f: { name: string; custom: boolean }) => [f.name, f.custom])).toEqual([
      ['ApexClass.AccountController', true], ['ApexClass.InvoiceBatch', true], ['ApexClass.SBQQ__QuoteCalculator', false]
    ]);
    expect(body.access).toEqual({ [SALES]: '100' });
    expect(body.objectRead).toEqual([]);
  });

  it('enables and disables Apex classes through SetupEntityAccess, then rolls it back', async () => {
    current = await setup();
    const { call, waitDone, fake } = current;
    const created = await call('POST', '/api/orgs/org1/change-sets', {
      changes: [
        { parentId: SALES, field: 'ApexClass.AccountController', access: 0 },
        { parentId: FIN, field: 'ApexClass.InvoiceBatch', access: 2 },
        { parentId: FIN, field: 'ApexClass.SBQQ__QuoteCalculator', access: 1 },
        { parentId: CPQ, field: 'ApexClass.InvoiceBatch', access: 1 }
      ]
    });
    const cs = created.body;
    expect(cs.items.map((i: { parentLabel: string; field: string; op: string; after: number; warnings: string[] }) => `${i.parentLabel}|${i.field}|${i.op}|${i.after}|${i.warnings.join()}`)).toEqual([
      'Finance Access|ApexClass.InvoiceBatch|insert|1|', 'Finance Access|ApexClass.SBQQ__QuoteCalculator|insert|1|', 'Sales User|ApexClass.AccountController|delete|0|'
    ]);
    expect(cs.skipped.map((s: { reason: string }) => s.reason)).toEqual(['MANAGED_PERMISSION_SET']);

    await call('POST', `/api/change-sets/${cs.id}/execute`, {});
    const done = await waitDone(cs.id);
    expect(done.status).toBe('done');
    expect(fake.entityAccess.map(a => [a.ParentId, a.SetupEntityId]).sort()).toEqual([[FIN, '01p000000000002'], [FIN, '01p000000000003']]);

    const rb = await call('POST', `/api/change-sets/${cs.id}/rollback`);
    expect(rb.body.items.map((i: { op: string }) => i.op).sort()).toEqual(['delete', 'delete', 'insert']);
    await call('POST', `/api/change-sets/${rb.body.id}/execute`, {});
    expect((await waitDone(rb.body.id)).status).toBe('done');
    expect(fake.entityAccess.map(a => [a.ParentId, a.SetupEntityId])).toEqual([[SALES, '01p000000000001']]);
  });

  it('reports per-row errors and conflicts as a partial result', async () => {
    current = await setup();
    const { call, waitDone, fake } = current;
    fake.rejectFields.add('Account.Tax_Code__c');
    const { body: cs } = await call('POST', '/api/orgs/org1/change-sets', {
      changes: [
        { parentId: FIN, field: 'Account.Tax_Code__c', access: 1 },
        { parentId: FIN, field: 'Account.Industry', access: 1 },
        { parentId: SALES, field: 'Account.Industry', access: 2 }
      ]
    });
    // Someone changes Sales User / Industry after the preview.
    fake.fieldPerms[0]!.PermissionsEdit = true;
    await call('POST', `/api/change-sets/${cs.id}/execute`, {});
    const done = await waitDone(cs.id);
    expect(done.status).toBe('partial');
    expect(Object.fromEntries(done.items.map((i: { parentLabel: string; field: string; status: string }) => [`${i.parentLabel}|${i.field}`, i.status]))).toEqual({
      'Finance Access|Account.Industry': 'ok', 'Finance Access|Account.Tax_Code__c': 'error', 'Sales User|Account.Industry': 'conflict'
    });
  });

  it('requires approval and the typed org name in production', async () => {
    current = await setup(false);
    const { call, waitDone } = current;
    const { body: cs } = await call('POST', '/api/orgs/org1/change-sets', { changes: [{ parentId: FIN, field: 'Account.Industry', access: 1 }] });
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Acme' })).status).toBe(409);
    expect((await call('POST', `/api/change-sets/${cs.id}/submit`)).body.status).toBe('pending_approval');
    const approved = await call('POST', `/api/change-sets/${cs.id}/approve`);
    expect(approved.body).toMatchObject({ status: 'approved', approvedBy: OWNER, conflicts: 0 });
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Wrong' })).status).toBe(400);
    // Once the org has an alias, that is the name to type.
    expect((await call('PATCH', '/api/orgs/org1', { alias: '  Acme PROD ' })).body).toMatchObject({ alias: 'Acme PROD', label: 'Acme PROD', name: 'Acme' });
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Acme' })).status).toBe(400);
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Acme PROD' })).status).toBe(200);
    expect((await waitDone(cs.id)).status).toBe('done');
  });

  it('keeps an accent color per org, from the palette only', async () => {
    current = await setup(true);
    const { call } = current;
    expect((await call('PATCH', '/api/orgs/org1', { accent: 'cyan' })).body).toMatchObject({ accent: 'cyan' });
    expect((await call('PATCH', '/api/orgs/org1', { alias: 'UAT' })).body).toMatchObject({ accent: 'cyan', alias: 'UAT' });
    expect((await call('PATCH', '/api/orgs/org1', { accent: 'red' })).status).toBe(400);
    expect((await call('PATCH', '/api/orgs/org1', { accent: null })).body).toMatchObject({ accent: null });
  });
});

describe('access token refresh', () => {
  async function tokenSetup(refresh: (loginUrl: string, token: string) => Promise<TokenResponse>) {
    const db = await openTestDb();
    await addUser(db);
    const cipher = new TokenCipher(config.appSecret);
    await db.upsertOrg({ id: 'org1', tenant_id: DEFAULT_TENANT, sf_org_id: '00D000000000001', name: 'Acme UAT', username: 'me@acme.com',
      instance_url: 'https://acme.my.salesforce.com', login_url: 'https://test.salesforce.com', is_sandbox: 1,
      refresh_token_enc: cipher.encrypt('refresh-1'), access_token_enc: cipher.encrypt('old'), alias: 'UAT' });
    const app = buildApp({ config, db, apiFor: () => fakeOrg(true), refreshToken: refresh });
    const cookie = await login(app);
    return { app, db, cipher, cookie };
  }

  it('stores the new access token', async () => {
    const calls: string[] = [];
    const { app, db, cipher, cookie } = await tokenSetup(async (loginUrl, token) => {
      calls.push(`${loginUrl} ${token}`);
      return { access_token: 'new', instance_url: 'https://acme.my.salesforce.com', id: 'x' };
    });
    const res = await app.inject({ method: 'POST', url: '/api/orgs/org1/token', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(calls).toEqual(['https://test.salesforce.com refresh-1']);
    expect(cipher.decrypt((await db.getOrg(DEFAULT_TENANT, 'org1'))!.access_token_enc!)).toBe('new');
    await app.close();
  });

  it('asks to log in again when Salesforce refuses the refresh token', async () => {
    const { app, db, cipher, cookie } = await tokenSetup(async () => { throw new Error('Salesforce OAuth error: invalid_grant expired access/refresh token'); });
    const res = await app.inject({ method: 'POST', url: '/api/orgs/org1/token', headers: { cookie } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ reauth: true });
    expect(res.json().error).toContain('invalid_grant');
    expect(cipher.decrypt((await db.getOrg(DEFAULT_TENANT, 'org1'))!.access_token_enc!)).toBe('old');
    await app.close();
  });

  it('logs in again to a connected org on its login URL, keeping the alias', async () => {
    const { app, cookie } = await tokenSetup(async () => { throw new Error('unused'); });
    const res = await app.inject({ method: 'GET', url: '/oauth/start?org=org1', headers: { cookie, host: 'localhost:3000' } });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/test\.salesforce\.com\/services\/oauth2\/authorize\?/);
    const set = String(res.headers['set-cookie']);
    expect(decodeURIComponent(set)).toContain('"alias":"UAT"');
    await app.close();
  });
});
