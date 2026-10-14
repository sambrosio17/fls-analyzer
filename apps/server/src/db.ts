import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Access, ChangeItem, ChangeSetStatus, Operation, SkippedItem, WarningCode } from '@fls/core';

/** Single tenant in the personal MVP; every table already carries tenant_id for the multi-client phase. */
export const DEFAULT_TENANT = 'default';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sf_org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  instance_url TEXT NOT NULL,
  login_url TEXT NOT NULL,
  is_sandbox INTEGER NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  created_at TEXT NOT NULL,
  last_sync_at TEXT,
  UNIQUE (tenant_id, sf_org_id, username)
);
CREATE TABLE IF NOT EXISTS change_sets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  skipped_json TEXT NOT NULL DEFAULT '[]',
  rollback_of TEXT,
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  started_at TEXT,
  finished_at TEXT,
  UNIQUE (tenant_id, seq)
);
CREATE TABLE IF NOT EXISTS change_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_set_id TEXT NOT NULL REFERENCES change_sets(id),
  parent_id TEXT NOT NULL,
  parent_label TEXT NOT NULL,
  field TEXT NOT NULL,
  sobject_type TEXT NOT NULL,
  before_access INTEGER NOT NULL,
  after_access INTEGER NOT NULL,
  record_id TEXT,
  op TEXT NOT NULL,
  warnings TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS change_items_cs ON change_items(change_set_id);
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  org_id TEXT,
  change_set_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  at TEXT NOT NULL
);
`;

export interface OrgRow {
  id: string;
  tenant_id: string;
  sf_org_id: string;
  name: string;
  username: string;
  instance_url: string;
  login_url: string;
  is_sandbox: number;
  refresh_token_enc: string;
  access_token_enc: string | null;
  created_at: string;
  last_sync_at: string | null;
}

export interface ChangeSetRow {
  id: string;
  tenant_id: string;
  seq: number;
  org_id: string;
  author: string;
  description: string;
  status: ChangeSetStatus;
  skipped_json: string;
  rollback_of: string | null;
  created_at: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export type ItemStatus = 'pending' | 'ok' | 'error' | 'conflict';

export interface ItemRow {
  id: number;
  change_set_id: string;
  parent_id: string;
  parent_label: string;
  field: string;
  sobject_type: string;
  before_access: Access;
  after_access: Access;
  record_id: string | null;
  op: Operation;
  warnings: string;
  status: ItemStatus;
  error_code: string | null;
  error_message: string | null;
}

export const now = () => new Date().toISOString();

export function itemFromRow(r: ItemRow): ChangeItem {
  return {
    parentId: r.parent_id, field: r.field, sobjectType: r.sobject_type,
    before: r.before_access, after: r.after_access, recordId: r.record_id, op: r.op,
    warnings: r.warnings ? (r.warnings.split(',') as WarningCode[]) : []
  };
}

export class Db {
  readonly sql: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.sql = new DatabaseSync(path);
    this.sql.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.sql.exec(SCHEMA);
  }

  // ---- orgs
  upsertOrg(o: Omit<OrgRow, 'created_at' | 'last_sync_at'>): OrgRow {
    const existing = this.sql.prepare('SELECT id FROM orgs WHERE tenant_id = ? AND sf_org_id = ? AND username = ?')
      .get(o.tenant_id, o.sf_org_id, o.username) as { id: string } | undefined;
    if (existing) {
      this.sql.prepare(`UPDATE orgs SET name = ?, instance_url = ?, login_url = ?, is_sandbox = ?, refresh_token_enc = ?, access_token_enc = ? WHERE id = ?`)
        .run(o.name, o.instance_url, o.login_url, o.is_sandbox, o.refresh_token_enc, o.access_token_enc, existing.id);
      return this.getOrg(o.tenant_id, existing.id)!;
    }
    this.sql.prepare(`INSERT INTO orgs (id, tenant_id, sf_org_id, name, username, instance_url, login_url, is_sandbox, refresh_token_enc, access_token_enc, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.id, o.tenant_id, o.sf_org_id, o.name, o.username, o.instance_url, o.login_url, o.is_sandbox, o.refresh_token_enc, o.access_token_enc, now());
    return this.getOrg(o.tenant_id, o.id)!;
  }

  getOrg(tenant: string, id: string): OrgRow | undefined {
    return this.sql.prepare('SELECT * FROM orgs WHERE tenant_id = ? AND id = ?').get(tenant, id) as OrgRow | undefined;
  }

  listOrgs(tenant: string): OrgRow[] {
    return this.sql.prepare('SELECT * FROM orgs WHERE tenant_id = ? ORDER BY name').all(tenant) as unknown as OrgRow[];
  }

  deleteOrg(tenant: string, id: string): void {
    this.sql.prepare('DELETE FROM orgs WHERE tenant_id = ? AND id = ?').run(tenant, id);
  }

  setAccessToken(id: string, enc: string): void {
    this.sql.prepare('UPDATE orgs SET access_token_enc = ? WHERE id = ?').run(enc, id);
  }

  touchOrg(id: string): void {
    this.sql.prepare('UPDATE orgs SET last_sync_at = ? WHERE id = ?').run(now(), id);
  }

  // ---- change sets
  createChangeSet(cs: { id: string; tenant: string; orgId: string; author: string; description: string; rollbackOf: string | null; skipped: SkippedItem[] },
    items: (ChangeItem & { parentLabel: string })[]): ChangeSetRow {
    const insertItem = this.sql.prepare(`INSERT INTO change_items (change_set_id, parent_id, parent_label, field, sobject_type, before_access, after_access, record_id, op, warnings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    this.sql.exec('BEGIN');
    try {
      const { seq } = this.sql.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM change_sets WHERE tenant_id = ?').get(cs.tenant) as { seq: number };
      this.sql.prepare(`INSERT INTO change_sets (id, tenant_id, seq, org_id, author, description, status, skipped_json, rollback_of, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`)
        .run(cs.id, cs.tenant, seq, cs.orgId, cs.author, cs.description, JSON.stringify(cs.skipped), cs.rollbackOf, now());
      for (const i of items) {
        insertItem.run(cs.id, i.parentId, i.parentLabel, i.field, i.sobjectType, i.before, i.after, i.recordId, i.op, i.warnings.join(','));
      }
      this.sql.exec('COMMIT');
    } catch (e) {
      this.sql.exec('ROLLBACK');
      throw e;
    }
    return this.getChangeSet(cs.tenant, cs.id)!;
  }

  getChangeSet(tenant: string, id: string): ChangeSetRow | undefined {
    return this.sql.prepare('SELECT * FROM change_sets WHERE tenant_id = ? AND id = ?').get(tenant, id) as ChangeSetRow | undefined;
  }

  listChangeSets(tenant: string, orgId?: string): (ChangeSetRow & { total: number; ok: number; errors: number })[] {
    const where = orgId ? 'cs.tenant_id = ? AND cs.org_id = ?' : 'cs.tenant_id = ?';
    const args = orgId ? [tenant, orgId] : [tenant];
    return this.sql.prepare(`SELECT cs.*, COUNT(ci.id) AS total,
        SUM(CASE WHEN ci.status = 'ok' THEN 1 ELSE 0 END) AS ok,
        SUM(CASE WHEN ci.status IN ('error', 'conflict') THEN 1 ELSE 0 END) AS errors
      FROM change_sets cs LEFT JOIN change_items ci ON ci.change_set_id = cs.id
      WHERE ${where} GROUP BY cs.id ORDER BY cs.seq DESC LIMIT 200`).all(...args) as never;
  }

  updateChangeSet(id: string, fields: Partial<Pick<ChangeSetRow, 'status' | 'submitted_at' | 'approved_by' | 'approved_at' | 'started_at' | 'finished_at'>>): void {
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (!keys.length) return;
    this.sql.prepare(`UPDATE change_sets SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...keys.map(k => fields[k] ?? null), id);
  }

  listItems(changeSetId: string): ItemRow[] {
    return this.sql.prepare('SELECT * FROM change_items WHERE change_set_id = ? ORDER BY parent_label, field').all(changeSetId) as unknown as ItemRow[];
  }

  updateItem(id: number, fields: Partial<Pick<ItemRow, 'status' | 'error_code' | 'error_message' | 'record_id' | 'op'>>): void {
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (!keys.length) return;
    this.sql.prepare(`UPDATE change_items SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...keys.map(k => fields[k] ?? null), id);
  }

  // ---- audit
  audit(e: { tenant: string; orgId?: string | null; changeSetId?: string | null; actor: string; action: string; detail?: string }): void {
    this.sql.prepare('INSERT INTO audit_events (tenant_id, org_id, change_set_id, actor, action, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(e.tenant, e.orgId ?? null, e.changeSetId ?? null, e.actor, e.action, e.detail ?? null, now());
  }
}
