import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TENANT, Db } from '../src/db.ts';
import { openTestDb } from './helpers.ts';

const org = { id: 'o1', tenant_id: DEFAULT_TENANT, sf_org_id: '00D1', name: 'Acme', username: 'me@acme.com', instance_url: 'https://x', login_url: 'https://y', is_sandbox: 1, refresh_token_enc: 'r', access_token_enc: null };

describe('org alias', () => {
  it('adds the alias column to a database created before it existed', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'fls-')), 'old.db');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE orgs (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, sf_org_id TEXT NOT NULL, name TEXT NOT NULL, username TEXT NOT NULL,
      instance_url TEXT NOT NULL, login_url TEXT NOT NULL, is_sandbox INTEGER NOT NULL, refresh_token_enc TEXT NOT NULL, access_token_enc TEXT,
      created_at TEXT NOT NULL, last_sync_at TEXT, UNIQUE (tenant_id, sf_org_id, username))`);
    old.close();
    const db = await Db.open({ path });
    await db.upsertOrg({ ...org, alias: 'UAT' });
    expect((await db.getOrg(DEFAULT_TENANT, 'o1'))?.alias).toBe('UAT');
  });

  it('keeps the saved alias when the org is reconnected without one', async () => {
    const db = await openTestDb();
    await db.upsertOrg({ ...org, alias: 'UAT' });
    await db.upsertOrg({ ...org, id: 'other', alias: null });
    expect((await db.listOrgs(DEFAULT_TENANT)).map(o => [o.id, o.alias])).toEqual([['o1', 'UAT']]);
    await db.upsertOrg({ ...org, alias: 'UAT 2' });
    expect((await db.getOrg(DEFAULT_TENANT, 'o1'))?.alias).toBe('UAT 2');
  });
});

describe('change sets in the database', () => {
  it('stores large change sets in batches, numbers them per tenant and counts their rows', async () => {
    const db = await openTestDb();
    await db.upsertOrg({ ...org, alias: null });
    await db.upsertOrg({ ...org, id: 'o2', tenant_id: 'other', alias: null });
    const items = Array.from({ length: 1203 }, (_, i) => ({
      parentId: `0PS${i}`, parentLabel: `PS ${i}`, field: 'Account.Industry', sobjectType: 'Account', before: 0 as const, after: 1 as const, recordId: null, op: 'insert' as const, warnings: []
    }));
    const a = await db.createChangeSet({ id: 'cs1', tenant: DEFAULT_TENANT, orgId: 'o1', author: 'me', description: '', rollbackOf: null, skipped: [] }, items);
    const b = await db.createChangeSet({ id: 'cs2', tenant: DEFAULT_TENANT, orgId: 'o1', author: 'me', description: '', rollbackOf: null, skipped: [] }, items.slice(0, 2));
    const c = await db.createChangeSet({ id: 'cs3', tenant: 'other', orgId: 'o2', author: 'you', description: '', rollbackOf: null, skipped: [] }, items.slice(0, 1));
    expect([a.seq, b.seq, c.seq]).toEqual([1, 2, 1]);
    const first = (await db.listItems('cs1'))[0]!;
    await db.updateItem(first.id, { status: 'ok' });
    expect((await db.listChangeSets(DEFAULT_TENANT)).map(r => [r.id, r.total, r.ok, r.errors])).toEqual([['cs2', 2, 0, 0], ['cs1', 1203, 1, 0]]);
    expect(await db.getChangeSet('other', 'cs1')).toBeUndefined();
    await db.updateChangeSet('cs3', { status: 'running' });
    expect((await db.listRunning()).map(r => [r.id, r.tenant_id])).toEqual([['cs3', 'other']]);
  });

  it('rolls back a change set whose rows fail to save', async () => {
    const db = await openTestDb();
    await db.upsertOrg({ ...org, alias: null });
    const bad = [{ parentId: 'x', parentLabel: 'x', field: 'f', sobjectType: 'Account', before: 0 as const, after: 1 as const, recordId: null, op: 'insert' as const, warnings: [] }];
    await expect(db.createChangeSet({ id: 'cs1', tenant: DEFAULT_TENANT, orgId: 'missing', author: 'me', description: '', rollbackOf: null, skipped: [] }, bad)).rejects.toThrow();
    expect(await db.getChangeSet(DEFAULT_TENANT, 'cs1')).toBeUndefined();
    expect(await db.listItems('cs1')).toEqual([]);
  });
});
