import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../src/auth.ts';
import type { Config } from '../src/config.ts';
import { DEFAULT_TENANT, Db } from '../src/db.ts';
import { postgres } from '../src/sql.ts';

export const config: Config = {
  port: 0, host: '127.0.0.1', appUrl: 'http://localhost:3000', appSecret: 'x'.repeat(40),
  sfClientId: 'cid', sfClientSecret: null, sfApiVersion: 'v62.0', dbPath: ':memory:', databaseUrl: null,
  signup: 'invite', trustProxy: false, requireDifferentApprover: false, demoMode: false
};

export const OWNER = 'owner@example.com';
export const PASSWORD = 'correct horse battery';

/**
 * A fresh database: SQLite in memory, or with TEST_DATABASE_URL set, Postgres in a schema of its own
 * (so `TEST_DATABASE_URL=postgres://... npm test` runs the whole suite on Postgres).
 */
export async function openTestDb(): Promise<Db> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return Db.open({ path: ':memory:' });
  const schema = `t_${randomBytes(6).toString('hex')}`;
  const admin = postgres(url);
  await admin.exec(`CREATE SCHEMA ${schema}`);
  await admin.close();
  return Db.open({ databaseUrl: url, searchPath: schema });
}

let ownerHash: Promise<string> | null = null;
/** Adds a user to a tenant (the default one unless given) and returns its email. */
export async function addUser(db: Db, email = OWNER, tenant = DEFAULT_TENANT): Promise<string> {
  const passwordHash = await (ownerHash ??= hashPassword(PASSWORD));
  await db.createUser({ id: randomBytes(6).toString('hex'), tenant, email, name: email.split('@')[0]!, passwordHash });
  return email;
}

/** Logs in and returns the session cookie. */
export async function login(app: FastifyInstance, email = OWNER, password = PASSWORD): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/session', payload: { email, password } });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return String(res.headers['set-cookie']).split(';')[0]!;
}
