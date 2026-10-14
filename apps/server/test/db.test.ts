import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TENANT, Db } from '../src/db.ts';

const org = { id: 'o1', tenant_id: DEFAULT_TENANT, sf_org_id: '00D1', name: 'Acme', username: 'me@acme.com', instance_url: 'https://x', login_url: 'https://y', is_sandbox: 1, refresh_token_enc: 'r', access_token_enc: null };

describe('org alias', () => {
  it('adds the alias column to a database created before it existed', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'fls-')), 'old.db');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE orgs (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, sf_org_id TEXT NOT NULL, name TEXT NOT NULL, username TEXT NOT NULL,
      instance_url TEXT NOT NULL, login_url TEXT NOT NULL, is_sandbox INTEGER NOT NULL, refresh_token_enc TEXT NOT NULL, access_token_enc TEXT,
      created_at TEXT NOT NULL, last_sync_at TEXT, UNIQUE (tenant_id, sf_org_id, username))`);
    old.close();
    const db = new Db(path);
    db.upsertOrg({ ...org, alias: 'UAT' });
    expect(db.getOrg(DEFAULT_TENANT, 'o1')?.alias).toBe('UAT');
  });

  it('keeps the saved alias when the org is reconnected without one', () => {
    const db = new Db(':memory:');
    db.upsertOrg({ ...org, alias: 'UAT' });
    db.upsertOrg({ ...org, id: 'other', alias: null });
    expect(db.listOrgs(DEFAULT_TENANT).map(o => [o.id, o.alias])).toEqual([['o1', 'UAT']]);
    db.upsertOrg({ ...org, alias: 'UAT 2' });
    expect(db.getOrg(DEFAULT_TENANT, 'o1')?.alias).toBe('UAT 2');
  });
});
