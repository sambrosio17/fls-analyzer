import { randomUUID } from 'node:crypto';
import {
  assignmentConflicts, assignmentKey, normalizeAssignments, reverseAssignments, type AssignmentChange,
  buildRequests, expandBulk, findConflicts, isApex, objectOf, parseResults, planChanges, rollbackDesired, transition,
  type BulkAction, type ChangeSetEvent, type ChangeSetStatus, type Desired, type SaveResult
} from '@fls/core';
import type { SfApi } from '../salesforce/client.ts';
import { loadApexClasses, loadFields, loadPermissionSets, loadSnapshot } from '../salesforce/metadata.ts';
import { loadCurrentAssignments, Timings, writeAssignments } from './assignments.ts';
import { assignmentFromRow, itemFromRow, now, type ChangeSetRow, type Db, type OrgRow } from '../db.ts';

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

  /**
   * Saves page layout and Lightning page assignment changes as a draft. The "before" values come
   * from the org, not from the request, so the preview shows what will really change.
   */
  async createAssignments(orgId: string, input: { description?: string; changes: AssignmentChange[] }, rollbackOf: string | null = null): Promise<ChangeSetRow> {
    const org = this.org(orgId);
    const current = await loadCurrentAssignments(this.d.apiFor(org), input.changes);
    const changes = normalizeAssignments(input.changes.map(c => ({ ...c, before: current(c) })));
    if (!changes.length) throw Object.assign(new Error('Nothing to change: the org already has these assignments.'), { statusCode: 400 });
    const cs = this.d.db.createChangeSet(
      { id: randomUUID(), tenant: this.d.tenant, orgId, author: this.d.actor, description: input.description ?? '', rollbackOf, skipped: [] }, [], changes);
    this.d.db.audit({ tenant: this.d.tenant, orgId, changeSetId: cs.id, actor: this.d.actor, action: 'change_set.created', detail: `${changes.length} assignments` });
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
    if (cs.kind === 'assignments') {
      const changes = this.d.db.listAssignments(cs.id).map(assignmentFromRow);
      return assignmentConflicts(changes, await loadCurrentAssignments(this.d.apiFor(this.org(cs.org_id)), changes)).length;
    }
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
    return { changeSet: this.changeSet(id), done: this.runInBackground(cs, false) };
  }

  /**
   * Picks up the runs a server restart cut short. Rows already settled keep their result; the pending ones go
   * through the same check against the org, so a row written just before the restart is recognised, not redone.
   */
  resumeInterrupted(): Promise<void>[] {
    return this.d.db.listRunning(this.d.tenant).map(cs => {
      this.d.db.updateChangeSet(cs.id, { resumed_at: now() });
      this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: cs.id, actor: this.d.actor, action: 'change_set.resumed' });
      return this.runInBackground(cs, true);
    });
  }

  private runInBackground(cs: ChangeSetRow, resumed: boolean): Promise<void> {
    return (cs.kind === 'assignments' ? this.executeAssignments(cs, resumed) : this.execute(cs.id, resumed)).catch(err => {
      this.d.db.updateChangeSet(cs.id, { status: 'failed', finished_at: now() });
      this.d.db.audit({ tenant: this.d.tenant, orgId: cs.org_id, changeSetId: cs.id, actor: this.d.actor, action: 'change_set.failed', detail: String(err) });
    });
  }

  private async execute(id: string, resumed: boolean): Promise<void> {
    const cs = this.changeSet(id);
    const org = this.org(cs.org_id);
    const api = this.d.apiFor(org);
    const all = this.d.db.listItems(id);
    // A resumed run only handles the rows the interrupted one did not settle.
    const rows = all.filter(r => r.status === 'pending');
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
      if (resumed && fresh.get(x.item.parentId, x.item.field).access === x.item.after) {
        this.d.db.updateItem(x.row.id, { status: 'ok', record_id: fresh.get(x.item.parentId, x.item.field).recordId });
        continue;
      }
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
    if (okItems.length) {
      const { snapshot: after } = await loadSnapshot(api, objects, parentIds);
      for (const item of okItems) {
        if (after.get(item.parentId, item.field).access === item.after) continue;
        this.d.db.updateItem(rowIdOf.get(item)!, { status: 'error', error_code: 'VERIFY_MISMATCH', error_message: 'The org does not show the requested access after the update.' });
      }
    }

    const verified = this.d.db.listItems(id).filter(r => r.status === 'ok').length;
    const outcome = verified === all.length ? 'done' : verified > 0 ? 'partial' : 'failed';
    this.d.db.updateChangeSet(id, { status: this.move(this.changeSet(id), 'finish', outcome), finished_at: now() });
    this.d.db.touchOrg(org.id);
    this.d.db.audit({ tenant: this.d.tenant, orgId: org.id, changeSetId: id, actor: this.d.actor, action: 'change_set.finished', detail: `${outcome}: ${verified}/${all.length}` });
  }

  /** Assignments: skip the ones changed in the org since the preview, write the rest, read back to verify. */
  private async executeAssignments(cs: ChangeSetRow, resumed: boolean): Promise<void> {
    const org = this.org(cs.org_id);
    const api = this.d.apiFor(org);
    const all = this.d.db.listAssignments(cs.id);
    // A resumed run only handles the rows the interrupted one did not settle.
    const rows = all.filter(r => r.status === 'pending').map(r => ({ row: r, change: assignmentFromRow(r) }));
    const rowIdOf = new Map(rows.map(x => [assignmentKey(x.change), x.row.id]));

    const timings = new Timings();
    const current = await timings.time('check org', () => loadCurrentAssignments(api, rows.map(x => x.change)));
    const alreadyApplied = new Set(resumed ? rows.map(x => x.change).filter(c => current(c) === c.after) : []);
    for (const c of alreadyApplied) this.d.db.updateAssignment(rowIdOf.get(assignmentKey(c))!, { status: 'ok' });
    const pending = rows.map(x => x.change).filter(c => !alreadyApplied.has(c));
    const conflicts = new Set(assignmentConflicts(pending, current));
    for (const c of conflicts) this.d.db.updateAssignment(rowIdOf.get(assignmentKey(c))!, { status: 'conflict', error_code: 'CONFLICT', error_message: 'Changed in the org after the preview.' });
    const runnable = pending.filter(c => !conflicts.has(c));

    const written = await writeAssignments(api, runnable, timings);
    for (const w of written.filter(w => !w.ok)) this.d.db.updateAssignment(rowIdOf.get(assignmentKey(w.change))!, { status: 'error', error_code: w.errorCode, error_message: w.errorMessage });

    const ok = written.filter(w => w.ok).map(w => w.change);
    if (ok.length) {
      const after = await timings.time('verify', () => loadCurrentAssignments(api, ok));
      for (const c of ok) {
        const rowId = rowIdOf.get(assignmentKey(c))!;
        if (after(c) === c.after) this.d.db.updateAssignment(rowId, { status: 'ok' });
        else this.d.db.updateAssignment(rowId, { status: 'error', error_code: 'VERIFY_MISMATCH', error_message: 'The org does not show the requested assignment after the update.' });
      }
    }

    const verified = this.d.db.listAssignments(cs.id).filter(r => r.status === 'ok').length;
    const outcome = verified === all.length ? 'done' : verified > 0 ? 'partial' : 'failed';
    this.d.db.updateChangeSet(cs.id, { status: this.move(this.changeSet(cs.id), 'finish', outcome), finished_at: now(), timings_json: JSON.stringify(timings.steps) });
    this.d.db.touchOrg(org.id);
    this.d.db.audit({ tenant: this.d.tenant, orgId: org.id, changeSetId: cs.id, actor: this.d.actor, action: 'change_set.finished', detail: `${outcome}: ${verified}/${all.length}` });
  }

  /** New draft that restores the rows this change set changed successfully. */
  async rollback(id: string): Promise<ChangeSetRow> {
    const cs = this.changeSet(id);
    if (cs.kind === 'assignments') {
      const done = this.d.db.listAssignments(id).filter(r => r.status === 'ok').map(assignmentFromRow);
      if (!done.length) throw new Error('Nothing to roll back: no row of this change set was applied.');
      return this.createAssignments(cs.org_id, { description: `Annulla CS-${String(cs.seq).padStart(4, '0')}`, changes: reverseAssignments(done) }, id);
    }
    const ok = this.d.db.listItems(id).filter(r => r.status === 'ok').map(itemFromRow);
    if (!ok.length) throw new Error('Nothing to roll back: no row of this change set was applied.');
    return this.create(cs.org_id, { description: `Annulla CS-${String(cs.seq).padStart(4, '0')}`, changes: rollbackDesired(ok) }, id);
  }
}
