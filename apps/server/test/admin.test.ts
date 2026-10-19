import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { Db } from '../src/db.ts';
import { fakeOrg } from './fakeOrg.ts';
import { addUser, config, login, openTestDb, PASSWORD } from './helpers.ts';

const ADMIN = 'admin@example.com';
const ADA = 'ada@example.com';

async function setup() {
  const db = await openTestDb();
  await addUser(db, ADMIN, 'tenant-admin', true);
  await addUser(db, ADA, 'tenant-ada');
  const app = buildApp({ config, db, apiFor: () => fakeOrg(true) });
  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, cookie?: string, payload?: object) => {
    const res = await app.inject({ method, url, payload, headers: { host: 'localhost:3000', ...(cookie ? { cookie } : {}) } });
    return { status: res.statusCode, body: res.body ? res.json() : null, cookie: String(res.headers['set-cookie'] ?? '').split(';')[0] };
  };
  return { app, db, call, admin: await login(app, ADMIN), ada: await login(app, ADA) };
}

let current: Awaited<ReturnType<typeof setup>> | null = null;
afterEach(async () => { await current?.app.close(); current = null; });

const userId = async (db: Db, email: string) => (await db.getUserByEmail(email))!.id;

describe('admin page', () => {
  it('is only for admins', async () => {
    current = await setup();
    const { call, admin, ada } = current;
    expect((await call('GET', '/api/admin', ada)).status).toBe(403);
    expect((await call('POST', '/api/admin/invites', ada, { email: 'x@example.com' })).status).toBe(403);
    expect((await call('GET', '/api/admin')).status).toBe(401);
    const res = await call('GET', '/api/admin', admin);
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { email: string; isAdmin: boolean }) => [u.email, u.isAdmin])).toEqual([[ADMIN, true], [ADA, false]]);
    expect((await call('GET', '/api/session', admin)).body.user.isAdmin).toBe(true);
  });

  it('creates an invite that works once, lists it and revokes unused ones', async () => {
    current = await setup();
    const { call, admin } = current;
    expect((await call('POST', '/api/admin/invites', admin, { email: ADA })).body.code).toBe('EMAIL_TAKEN');
    const { link } = (await call('POST', '/api/admin/invites', admin, { email: ' Bob@Example.com ', days: 3 })).body;
    expect(link).toMatch(/^http:\/\/localhost:3000\/\?invite=/);
    const code = decodeURIComponent(link.split('invite=')[1]);
    let invites = (await call('GET', '/api/admin', admin)).body.invites;
    expect(invites).toMatchObject([{ email: 'bob@example.com', status: 'pending', createdBy: ADMIN }]);
    expect(Date.parse(invites[0].expiresAt) - Date.now()).toBeLessThan(3.1 * 86400000);
    expect((await call('POST', '/api/account', undefined, { name: 'Bob', email: 'bob@example.com', password: PASSWORD, invite: code })).status).toBe(200);
    invites = (await call('GET', '/api/admin', admin)).body.invites;
    expect(invites[0].status).toBe('used');
    expect((await call('DELETE', `/api/admin/invites/${encodeURIComponent(invites[0].id)}`, admin)).status).toBe(404);

    await call('POST', '/api/admin/invites', admin, { email: 'eve@example.com' });
    const eve = (await call('GET', '/api/admin', admin)).body.invites.find((i: { email: string }) => i.email === 'eve@example.com');
    expect((await call('DELETE', `/api/admin/invites/${encodeURIComponent(eve.id)}`, admin)).status).toBe(200);
    expect((await call('GET', '/api/admin', admin)).body.invites.map((i: { email: string }) => i.email)).toEqual(['bob@example.com']);
  });

  it('disables an account, closing its sessions, and enables it again', async () => {
    current = await setup();
    const { call, admin, ada, db } = current;
    const id = await userId(db, ADA);
    expect((await call('PATCH', `/api/admin/users/${id}`, admin, { disabled: true })).status).toBe(200);
    expect((await call('GET', '/api/orgs', ada)).status).toBe(401);
    const refused = await call('POST', '/api/session', undefined, { email: ADA, password: PASSWORD });
    expect([refused.status, refused.body.code]).toEqual([403, 'ACCOUNT_DISABLED']);
    expect((await call('POST', `/api/admin/users/${id}/reset-link`, admin)).status).toBe(409);
    expect((await call('GET', '/api/admin', admin)).body.users.find((u: { email: string }) => u.email === ADA).disabled).toBe(true);
    await call('PATCH', `/api/admin/users/${id}`, admin, { disabled: false });
    expect((await call('POST', '/api/session', undefined, { email: ADA, password: PASSWORD })).status).toBe(200);
  });

  it('makes reset links, logs an account out everywhere and grants admin, never on itself', async () => {
    current = await setup();
    const { call, admin, ada, db } = current;
    const id = await userId(db, ADA);
    const { link } = (await call('POST', `/api/admin/users/${id}/reset-link`, admin)).body;
    expect(link).toMatch(/\?reset=/);
    expect((await call('GET', `/api/account/link?kind=reset&code=${link.split('reset=')[1]}`)).body).toEqual({ email: ADA });
    await call('POST', `/api/admin/users/${id}/logout`, admin);
    expect((await call('GET', '/api/orgs', ada)).status).toBe(401);
    await call('PATCH', `/api/admin/users/${id}`, admin, { isAdmin: true });
    expect((await call('GET', '/api/admin', await login(current.app, ADA))).status).toBe(200);
    const self = await call('PATCH', `/api/admin/users/${await userId(db, ADMIN)}`, admin, { disabled: true });
    expect([self.status, self.body.code]).toEqual([400, 'SELF']);
  });

  it('makes the oldest account an admin when an install has none', async () => {
    const db = await openTestDb();
    await addUser(db, ADA, 'a');
    await addUser(db, 'bob@example.com', 'b');
    await db.sql.run('UPDATE users SET created_at = ? WHERE email = ?', ['2099-01-01T00:00:00.000Z', 'bob@example.com']);
    // The check runs each time the database is opened.
    await (db as unknown as { migrateAccounts(): Promise<void> }).migrateAccounts();
    expect((await db.getUserByEmail(ADA))!.is_admin).toBe(1);
    expect((await db.getUserByEmail('bob@example.com'))!.is_admin).toBe(0);
  });
});
