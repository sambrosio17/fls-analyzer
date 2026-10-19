import { afterEach, describe, expect, it } from 'vitest';
import { createLink } from '../src/accounts.ts';
import { buildApp } from '../src/app.ts';
import { Throttle, hashPassword, tokenHash, verifyPassword } from '../src/auth.ts';
import type { Config } from '../src/config.ts';
import { DEFAULT_TENANT, type Db } from '../src/db.ts';
import { fakeOrg } from './fakeOrg.ts';
import { addUser, config, login, openTestDb, OWNER, PASSWORD } from './helpers.ts';

const NEW_PASSWORD = 'another long password';

async function setup(overrides: Partial<Config> = {}, db?: Db) {
  const database = db ?? await openTestDb();
  const app = buildApp({ config: { ...config, ...overrides }, db: database, apiFor: () => fakeOrg(true) });
  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object, cookie?: string, headers: Record<string, string> = {}) => {
    const res = await app.inject({ method, url, payload, headers: { host: 'localhost:3000', ...(cookie ? { cookie } : {}), ...headers } });
    return { status: res.statusCode, body: res.body ? res.json() : null, headers: res.headers, cookie: String(res.headers['set-cookie'] ?? '').split(';')[0] };
  };
  return { app, db: database, call };
}

const org = (id: string, tenant: string) => ({
  id, tenant_id: tenant, sf_org_id: `00D${id}`, name: `Org ${id}`, username: `me@${id}.com`, instance_url: 'https://x.my.salesforce.com',
  login_url: 'https://test.salesforce.com', is_sandbox: 1, refresh_token_enc: 'x', access_token_enc: null, alias: null
});

let current: Awaited<ReturnType<typeof setup>> | null = null;
afterEach(async () => { await current?.app.close(); current = null; });

describe('passwords', () => {
  it('hashes with a salt and checks the password', async () => {
    const a = await hashPassword(PASSWORD);
    expect(a).not.toBe(await hashPassword(PASSWORD));
    expect(a).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, a)).toBe(true);
    expect(await verifyPassword('wrong password!', a)).toBe(false);
    expect(await verifyPassword(PASSWORD, 'garbage')).toBe(false);
  });

  it('throttles a key after too many failures until the window passes', () => {
    const t = new Throttle(3, 1000);
    for (let i = 0; i < 3; i++) t.fail(['ip:1'], i);
    expect(t.retryAfter(['ip:1', 'ip:2'], 10)).toBe(1);
    expect(t.retryAfter(['ip:2'], 10)).toBe(0);
    expect(t.retryAfter(['ip:1'], 1001)).toBe(0);
  });
});

describe('sign up', () => {
  it('lets the first account of a local install in without an invite, then asks for one', async () => {
    current = await setup();
    const { call } = current;
    expect((await call('GET', '/api/session')).body).toEqual({ authenticated: false, user: null, signup: 'open' });
    const first = await call('POST', '/api/account', { name: 'Salvatore', email: ' Owner@Example.com ', password: PASSWORD });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ authenticated: true, user: { name: 'Salvatore', email: OWNER } });
    expect((await call('GET', '/api/session', undefined, first.cookie)).body).toMatchObject({ authenticated: true, user: { email: OWNER } });

    expect((await call('GET', '/api/session')).body.signup).toBe('invite');
    const second = await call('POST', '/api/account', { name: 'Eve', email: 'eve@example.com', password: PASSWORD });
    expect(second.status).toBe(403);
    expect(second.body.code).toBe('INVITE_REQUIRED');
  });

  it('needs an invite for the first account of a hosted install', async () => {
    current = await setup({ appUrl: 'https://app.orgfox.com' });
    const res = await current.call('POST', '/api/account', { name: 'Eve', email: 'eve@example.com', password: PASSWORD }, undefined, { host: 'app.orgfox.com' });
    expect(res.status).toBe(403);
  });

  it('accepts an invite once, only for the email it was made for', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    const code = await createLink(db, 'invite', 'Ada@Example.com');
    expect((await call('GET', `/api/account/link?kind=invite&code=${code}`)).body).toEqual({ email: 'ada@example.com' });
    expect((await call('GET', `/api/account/link?kind=reset&code=${code}`)).status).toBe(404);
    expect((await call('POST', '/api/account', { name: 'Bob', email: 'bob@example.com', password: PASSWORD, invite: code })).status).toBe(403);
    const ada = await call('POST', '/api/account', { name: 'Ada', email: 'ada@example.com', password: PASSWORD, invite: code });
    expect(ada.status).toBe(200);
    expect((await call('POST', '/api/account', { name: 'Ada 2', email: 'ada@example.com', password: PASSWORD, invite: code })).status).toBe(403);
    expect((await call('GET', `/api/account/link?kind=invite&code=${code}`)).status).toBe(404);
  });

  it('refuses short passwords and emails already taken', async () => {
    current = await setup({ signup: 'open' });
    const { call, db } = current;
    await addUser(db);
    expect((await call('POST', '/api/account', { name: 'Ada', email: 'ada@example.com', password: 'short' })).status).toBe(400);
    const taken = await call('POST', '/api/account', { name: 'Owner', email: OWNER, password: PASSWORD });
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe('EMAIL_TAKEN');
  });

  it('gives the orgs and change sets of an install made before accounts to its first account', async () => {
    const db = await openTestDb();
    await db.upsertOrg(org('old', DEFAULT_TENANT));
    current = await setup({}, db);
    const { call } = current;
    const first = await call('POST', '/api/account', { name: 'Salvatore', email: OWNER, password: PASSWORD });
    expect((await call('GET', '/api/orgs', undefined, first.cookie)).body.map((o: { id: string }) => o.id)).toEqual(['old']);
    const code = await createLink(db, 'invite', 'ada@example.com');
    const ada = await call('POST', '/api/account', { name: 'Ada', email: 'ada@example.com', password: PASSWORD, invite: code });
    expect((await call('GET', '/api/orgs', undefined, ada.cookie)).body).toEqual([]);
  });
});

describe('sessions', () => {
  it('logs in with email and password, and logging out ends the session on the server', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    expect((await call('POST', '/api/session', { email: OWNER, password: 'wrong password!' })).body.code).toBe('WRONG_LOGIN');
    expect((await call('POST', '/api/session', { email: 'nobody@example.com', password: PASSWORD })).status).toBe(401);
    const cookie = await login(current.app, ' OWNER@example.com ');
    expect((await call('GET', '/api/orgs', undefined, cookie)).status).toBe(200);
    // The database keeps only a hash of the token.
    const token = decodeURIComponent(cookie.split('=')[1]!).split('.')[0]!;
    expect(await db.sql.get('SELECT id FROM sessions WHERE id = ?', [token])).toBeUndefined();
    expect(await db.sql.get('SELECT id FROM sessions WHERE id = ?', [tokenHash(token)])).toBeDefined();
    await call('DELETE', '/api/session', undefined, cookie);
    expect((await call('GET', '/api/orgs', undefined, cookie)).status).toBe(401);
  });

  it('refuses an expired session', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    const cookie = await login(current.app);
    await db.sql.run('UPDATE sessions SET expires_at = ?', [new Date(Date.now() - 1000).toISOString()]);
    expect((await call('GET', '/api/orgs', undefined, cookie)).status).toBe(401);
  });

  it('blocks logins after repeated wrong passwords', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    for (let i = 0; i < 10; i++) await call('POST', '/api/session', { email: OWNER, password: `wrong password ${i}` });
    const res = await call('POST', '/api/session', { email: OWNER, password: PASSWORD });
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('resets a password with a one-time link and closes the old sessions', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    const old = await login(current.app);
    const code = await createLink(db, 'reset', OWNER);
    const reset = await call('POST', '/api/account/reset', { code, password: NEW_PASSWORD });
    expect(reset.status).toBe(200);
    expect((await call('GET', '/api/orgs', undefined, old)).status).toBe(401);
    expect((await call('GET', '/api/orgs', undefined, reset.cookie)).status).toBe(200);
    expect((await call('POST', '/api/account/reset', { code, password: NEW_PASSWORD })).status).toBe(404);
    await login(current.app, OWNER, NEW_PASSWORD);
  });

  it('changes name and password, keeping only the current session', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    const here = await login(current.app);
    const elsewhere = await login(current.app);
    expect((await call('PATCH', '/api/account', { newPassword: NEW_PASSWORD, currentPassword: 'wrong password!' }, here)).status).toBe(403);
    expect((await call('PATCH', '/api/account', { name: 'Salvo', newPassword: NEW_PASSWORD, currentPassword: PASSWORD }, here)).body).toEqual({ name: 'Salvo', email: OWNER });
    expect((await call('GET', '/api/orgs', undefined, here)).status).toBe(200);
    expect((await call('GET', '/api/orgs', undefined, elsewhere)).status).toBe(401);
    expect((await call('PATCH', '/api/account', { name: 'X' })).status).toBe(401);
  });
});

describe('isolation between accounts', () => {
  it("never shows or changes another account's orgs and change sets", async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db, 'ada@example.com', 'tenant-a');
    await addUser(db, 'bob@example.com', 'tenant-b');
    await db.upsertOrg(org('orgA', 'tenant-a'));
    await db.upsertOrg(org('orgB', 'tenant-b'));
    const ada = await login(current.app, 'ada@example.com');
    const bob = await login(current.app, 'bob@example.com');
    expect((await call('GET', '/api/orgs', undefined, ada)).body.map((o: { id: string }) => o.id)).toEqual(['orgA']);

    const cs = await call('POST', '/api/orgs/orgA/change-sets', { changes: [{ parentId: '0PS000000000002', field: 'Account.Industry', access: 1 }] }, ada);
    expect(cs.status).toBe(200);
    expect(cs.body.author).toBe('ada@example.com');
    for (const [method, url, payload] of [
      ['GET', '/api/orgs/orgA/matrix?objects=Account'], ['PATCH', '/api/orgs/orgA', { alias: 'mine' }], ['DELETE', '/api/orgs/orgA'],
      ['POST', '/api/orgs/orgA/change-sets', { changes: [] }], ['GET', `/api/change-sets/${cs.body.id}`],
      ['POST', `/api/change-sets/${cs.body.id}/execute`, {}], ['POST', `/api/change-sets/${cs.body.id}/rollback`], ['GET', '/oauth/start?org=orgA']
    ] as const) {
      expect((await call(method, url, payload as object | undefined, bob)).status, `${method} ${url}`).toBe(404);
    }
    expect((await call('GET', '/api/change-sets', undefined, bob)).body).toEqual([]);
    expect((await call('GET', '/api/change-sets', undefined, ada)).body).toHaveLength(1);
  });
});

describe('browser protections', () => {
  it('sends security headers on pages and API answers, and no-store on the API', async () => {
    current = await setup({ appUrl: 'https://app.orgfox.com' });
    const res = await current.app.inject({ method: 'GET', url: '/api/session', headers: { host: 'app.orgfox.com' } });
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('refuses changes sent from another site', async () => {
    current = await setup();
    const { call, db } = current;
    await addUser(db);
    const cookie = await login(current.app);
    expect((await call('DELETE', '/api/session', undefined, cookie, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('POST', '/api/session', { email: OWNER, password: PASSWORD }, undefined, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('GET', '/api/orgs', undefined, cookie, { origin: 'https://evil.example' })).status).toBe(200);
    expect((await call('DELETE', '/api/session', undefined, cookie, { origin: 'http://localhost:3000' })).status).toBe(200);
  });
});
