import { randomUUID } from 'node:crypto';
import {
  buildRequests, expandBulk, findConflicts, isApex, objectOf, parseResults, planChanges, rollbackDesired, transition,
  type BulkAction, type ChangeSetEvent, type ChangeSetStatus, type Desired, type SaveResult
} from '@fls/core';
import type { SfApi } from '../salesforce/client.ts';
import { loadApexClasses, loadFields, loadPermissionSets, loadSnapshot } from '../salesforce/metadata.ts';
import { itemFromRow, now, type ChangeSetRow, type Db, type OrgRow } from '../db.ts';

export interface ServiceDeps {
  db: Db;
  tenant: string;
  actor: string;
  requireDifferentApprover: boolean;
  apiFor(org: OrgRow): SfApi;
}

export interface CreateInput {
  description?: string;
  changes?: Desired[];
  bulk?: { fields: string[]; parentIds: string[]; action: BulkAction }[];
}

export class NotFoundError extends Error {}

const unique = <T>(xs: T[]) => [...new Set(xs)];

export class ChangeSetService {
  constructor(private readonly d: ServiceDeps) {}

  private org(id: string): OrgRow {
    const org = this.d.db.getOrg(this.d.tenant, id);
    if (!org) throw new NotFoundError('Org not found.');
    return org;
  }

  private changeSet(id: string): ChangeSetRow {
    const cs = this.d.db.getChangeSet(this.d.tenant, id);
    if (!cs) throw new NotFoundError('Change set not found.');
    return cs;
  }

  /** Plans the requested changes against the live org state and saves them as a draft. */
  async create(orgId: string, input: CreateInput, rollbackOf: string | null = null): Promise<ChangeSetRow> {
    const org = this.org(orgId);
    const api = this.d.apiFor(org);
    const changes = input.changes ?? [];
    const bulk = input.bulk ?? [];
    const allFields = unique([...changes.map(c => c.field), ...bulk.flatMap(b => b.fields)]);
    const parentIds = unique([...changes.map(c => c.parentId), ...bulk.flatMap(b => b.parentIds)]);
    const objects = unique(allFields.map(objectOf));

    const [fieldList, permSets, { snapshot }] = await Promise.all([
      loadFields(api, objects), loadPermissionSets(api), loadSnapshot(api, objects, parentIds)
    ]);
    const desired = [...bulk.flatMap(b => expandBulk(b.fields, b.parentIds, b.action, snapshot)), ...changes];
    const permissionSets = new Map(permSets.map(p => [p.id, p]));
    const plan = planChanges({ snapshot, fields: new Map(fieldList.map(f => [f.name, f])), permissionSets, desired });

    const cs = this.d.db.createChangeSet(
      { id: randomUUID(), tenant: this.d.tenant, orgId, author: this.d.actor, description: input.description ?? '', rollbackOf, skipped: plan.skipped },
      plan.items.map(i => ({ ...i, parentLabel: permissionSets.get(i.parentId)?.label ?? i.parentId }))
    );
    this.d.db.audit({ tenant: this.d.tenant, orgId, changeSetId: cs.id, actor: this.d.actor, action: 'change_set.created', detail: `${plan.items.length} items` });
    return cs;
  }

  private move(cs: ChangeSetRow, event: ChangeSetEvent, outcome?: 'done' | 'partial' | 'failed'): ChangeSetStatus {
    const org = this.org(cs.org_id);
    return transition(cs.status, event, {
      isProduction: !org.is_sandbox, actor: this.d.actor, author: cs.author,
      requireDifferentApprover: this.d.requireDifferentApprover, outcome
    });
  }

  submit(id: string): ChangeSetRow {
    const cs = this.changeSet(id);
    this.d.db.updateChangeSet(id, { status: this.move(cs, 'submit'), submitted_at: now() });
    this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: id, actor: this.d.actor, action: 'change_set.submitted' });
    return this.changeSet(id);
  }

  reject(id: string): ChangeSetRow {
    const cs = this.changeSet(id);
    this.d.db.updateChangeSet(id, { status: this.move(cs, 'reject') });
    this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: id, actor: this.d.actor, action: 'change_set.rejected' });
    return this.changeSet(id);
  }

  /** Approving re-checks the org: rows changed since the preview are reported before anything is written. */
  async approve(id: string): Promise<{ changeSet: ChangeSetRow; conflicts: number }> {
    const cs = this.changeSet(id);
    const status = this.move(cs, 'approve');
    const conflicts = await this.countConflicts(cs);
    this.d.db.updateChangeSet(id, { status, approved_by: this.d.actor, approved_at: now() });
    this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: id, actor: this.d.actor, action: 'change_set.approved', detail: `${conflicts} conflicts` });
    return { changeSet: this.changeSet(id), conflicts };
  }

  private async countConflicts(cs: ChangeSetRow): Promise<number> {
    const items = this.d.db.listItems(cs.id).map(itemFromRow);
    if (!items.length) return 0;
    const api = this.d.apiFor(this.org(cs.org_id));
    const { snapshot } = await loadSnapshot(api, unique(items.map(i => i.sobjectType)), unique(items.map(i => i.parentId)));
    return findConflicts(items, snapshot).length;
  }

  /** Validates the move to "running" synchronously, then writes to Salesforce in the background. */
  start(id: string): { changeSet: ChangeSetRow; done: Promise<void> } {
    const cs = this.changeSet(id);
    this.d.db.updateChangeSet(id, { status: this.move(cs, 'start'), started_at: now() });
    this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: id, actor: this.d.actor, action: 'change_set.started' });
    const done = this.execute(id).catch(err => {
      this.d.db.updateChangeSet(id, { status: 'failed', finished_at: now() });
      this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: id, actor: this.d.actor, action: 'change_set.failed', detail: String(err) });
    });
    return { changeSet: this.changeSet(id), done };
  }

  private async execute(id: string): Promise<void> {
    const cs = this.changeSet(id);
    const org = this.org(cs.org_id);
    const api = this.d.apiFor(org);
    const rows = this.d.db.listItems(id);
    const objects = unique(rows.map(r => r.sobject_type));
    const parentIds = unique(rows.map(r => r.parent_id));

    // 1. Concurrency check: skip rows whose state changed after the preview.
    const { snapshot: fresh } = await loadSnapshot(api, objects, parentIds);
    const items = rows.map(r => ({ row: r, item: itemFromRow(r) }));
    const conflicts = new Set(findConflicts(items.map(x => x.item), fresh));
    // Inserting Apex class access needs the class id, which the stored rows don't keep.
    const classIds = rows.some(r => isApex(r.sobject_type)) ? new Map((await loadApexClasses(api)).map(c => [c.name, c.entityId!])) : new Map<string, string>();
    const runnable = [];
    for (const x of items) {
      if (conflicts.has(x.item)) {
        this.d.db.updateItem(x.row.id, { status: 'conflict', error_code: 'CONFLICT', error_message: 'Changed in the org after the preview.' });
        continue;
      }
      // Use the record id the org has now; the operation follows from it.
      const recordId = fresh.get(x.item.parentId, x.item.field).recordId;
      const op = recordId === null ? 'insert' : x.item.after === 0 ? 'delete' : 'update';
      if (isApex(x.item.sobjectType) && op === 'insert') {
        const entityId = classIds.get(x.item.field);
        if (!entityId) {
          this.d.db.updateItem(x.row.id, { status: 'error', error_code: 'UNKNOWN_CLASS', error_message: 'The Apex class no longer exists in the org.' });
          continue;
        }
        x.item.entityId = entityId;
      }
      Object.assign(x.item, { recordId, op });
      this.d.db.updateItem(x.row.id, { record_id: recordId, op });
      runnable.push(x);
    }

    // 2. Write with sObject Collections, max 200 records per call.
    const rowIdOf = new Map(runnable.map(x => [x.item, x.row.id]));
    const okItems = [];
    for (const req of buildRequests(runnable.map(x => x.item), api.apiVersion)) {
      try {
        const res = await api.request<SaveResult[]>(req.method, req.path, req.body);
        for (const r of parseResults(req, res)) {
          const rowId = rowIdOf.get(r.item)!;
          if (r.ok) { okItems.push(r.item); this.d.db.updateItem(rowId, { status: 'ok', record_id: r.recordId }); }
          else this.d.db.updateItem(rowId, { status: 'error', error_code: r.errorCode, error_message: r.errorMessage });
        }
      } catch (err) {
        for (const item of req.items) this.d.db.updateItem(rowIdOf.get(item)!, { status: 'error', error_code: 'REQUEST_FAILED', error_message: String(err) });
      }
    }

    // 3. Verify: read back and compare with what was requested.
    let verified = 0;
    if (okItems.length) {
      const { snapshot: after } = await loadSnapshot(api, objects, parentIds);
      for (const item of okItems) {
        if (after.get(item.parentId, item.field).access === item.after) { verified++; continue; }
        this.d.db.updateItem(rowIdOf.get(item)!, { status: 'error', error_code: 'VERIFY_MISMATCH', error_message: 'The org does not show the requested access after the update.' });
      }
    }

    const outcome = verified === rows.length ? 'done' : verified > 0 ? 'partial' : 'failed';
    this.d.db.updateChangeSet(id, { status: this.move(this.changeSet(id), 'finish', outcome), finished_at: now() });
    this.d.db.touchOrg(org.id);
    this.d.db.audit({ tenant: this.d.tenant, orgId: org.id, changeSetId: id, actor: this.d.actor, action: 'change_set.finished', detail: `${outcome}: ${verified}/${rows.length}` });
  }

  /** New draft that restores the rows this change set changed successfully. */
  async rollback(id: string): Promise<ChangeSetRow> {
    const cs = this.changeSet(id);
    const ok = this.d.db.listItems(id).filter(r => r.status === 'ok').map(itemFromRow);
    if (!ok.length) throw new Error('Nothing to roll back: no row of this change set was applied.');
    return this.create(cs.org_id, { description: `Annulla CS-${String(cs.seq).padStart(4, '0')}`, changes: rollbackDesired(ok) }, id);
  }
}
