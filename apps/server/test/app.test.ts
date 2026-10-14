import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import { DEFAULT_TENANT, Db } from '../src/db.ts';
import { fakeOrg } from './fakeOrg.ts';

const config: Config = {
  port: 0, appUrl: 'http://localhost:3000', appPassword: 'secret-pass', appSecret: 'x'.repeat(40), appUser: 'owner',
  sfClientId: 'cid', sfClientSecret: null, sfApiVersion: 'v62.0', dbPath: ':memory:', requireDifferentApprover: false, demoMode: false
};

const SALES = '0PS000000000001';
const FIN = '0PS000000000002';
const CPQ = '0PS000000000003';

async function setup(isSandbox = true) {
  const db = new Db(':memory:');
  const fake = fakeOrg(isSandbox);
  db.upsertOrg({ id: 'org1', tenant_id: DEFAULT_TENANT, sf_org_id: '00D000000000001', name: isSandbox ? 'Acme UAT' : 'Acme', username: 'me@acme.com',
    instance_url: 'https://acme.my.salesforce.com', login_url: 'https://login.salesforce.com', is_sandbox: isSandbox ? 1 : 0, refresh_token_enc: 'x', access_token_enc: null, alias: null });
  const app = buildApp({ config, db, apiFor: () => fake });
  const login = await app.inject({ method: 'POST', url: '/api/session', payload: { password: 'secret-pass' } });
  const cookie = login.headers['set-cookie'] as string;
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
  return { app, fake, call, waitDone };
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
    expect(body.fields.map((f: { name: string }) => f.name)).toEqual(['Account.Name', 'Account.Industry', 'Account.Tax_Code__c', 'Account.Score__c']);
    expect(body.permissionSets.map((p: { label: string }) => p.label)).toEqual(['Sales User', 'CPQ Admin', 'Finance Access']);
    expect(body.access).toEqual({ [SALES]: '0100' });
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
    expect(approved.body).toMatchObject({ status: 'approved', approvedBy: 'owner', conflicts: 0 });
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Wrong' })).status).toBe(400);
    // Once the org has an alias, that is the name to type.
    expect((await call('PATCH', '/api/orgs/org1', { alias: '  Acme PROD ' })).body).toMatchObject({ alias: 'Acme PROD', label: 'Acme PROD', name: 'Acme' });
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Acme' })).status).toBe(400);
    expect((await call('POST', `/api/change-sets/${cs.id}/execute`, { confirmName: 'Acme PROD' })).status).toBe(200);
    expect((await waitDone(cs.id)).status).toBe('done');
  });
});
