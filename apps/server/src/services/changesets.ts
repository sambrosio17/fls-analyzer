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
  requireDifferentApprover: boolean;
  apiFor(org: OrgRow): SfApi;
}

/** Who acts: the tenant whose data is touched and the user recorded as author, approver or runner. */
export interface Actor { tenant: string; actor: string }

export interface CreateInput {
  description?: string;
  changes?: Desired[];
  bulk?: { fields: string[]; parentIds: string[]; action: BulkAction }[];
}

export class NotFoundError extends Error {}

const unique = <T>(xs: T[]) => [...new Set(xs)];

export class ChangeSetService {
  constructor(private readonly d: ServiceDeps) {}

  private async org(ctx: Actor, id: string): Promise<OrgRow> {
    const org = await this.d.db.getOrg(ctx.tenant, id);
    if (!org) throw new NotFoundError('Org not found.');
    return org;
  }

  private async changeSet(ctx: Actor, id: string): Promise<ChangeSetRow> {
    const cs = await this.d.db.getChangeSet(ctx.tenant, id);
    if (!cs) throw new NotFoundError('Change set not found.');
    return cs;
  }

  /** Plans the requested changes against the live org state and saves them as a draft. */
  async create(ctx: Actor, orgId: string, input: CreateInput, rollbackOf: string | null = null): Promise<ChangeSetRow> {
    const org = await this.org(ctx, orgId);
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

    const cs = await this.d.db.createChangeSet(
      { id: randomUUID(), tenant: ctx.tenant, orgId, author: ctx.actor, description: input.description ?? '', rollbackOf, skipped: plan.skipped },
      plan.items.map(i => ({ ...i, parentLabel: permissionSets.get(i.parentId)?.label ?? i.parentId }))
    );
    await this.d.db.audit({ tenant: ctx.tenant, orgId, changeSetId: cs.id, actor: ctx.actor, action: 'change_set.created', detail: `${plan.items.length} items` });
    return cs;
  }

  /**
   * Saves page layout and Lightning page assignment changes as a draft. The "before" values come
   * from the org, not from the request, so the preview shows what will really change.
   */
  async createAssignments(ctx: Actor, orgId: string, input: { description?: string; changes: AssignmentChange[] }, rollbackOf: string | null = null): Promise<ChangeSetRow> {
    const org = await this.org(ctx, orgId);
    const current = await loadCurrentAssignments(this.d.apiFor(org), input.changes);
    const changes = normalizeAssignments(input.changes.map(c => ({ ...c, before: current(c) })));
    if (!changes.length) throw Object.assign(new Error('Nothing to change: the org already has these assignments.'), { statusCode: 400 });
    const cs = await this.d.db.createChangeSet(
      { id: randomUUID(), tenant: ctx.tenant, orgId, author: ctx.actor, description: input.description ?? '', rollbackOf, skipped: [] }, [], changes);
    await this.d.db.audit({ tenant: ctx.tenant, orgId, changeSetId: cs.id, actor: ctx.actor, action: 'change_set.created', detail: `${changes.length} assignments` });
    return cs;
  }

  private async move(ctx: Actor, cs: ChangeSetRow, event: ChangeSetEvent, outcome?: 'done' | 'partial' | 'failed'): Promise<ChangeSetStatus> {
    const org = await this.org(ctx, cs.org_id);
    return transition(cs.status, event, {
      isProduction: !org.is_sandbox, actor: ctx.actor, author: cs.author,
      requireDifferentApprover: this.d.requireDifferentApprover, outcome
    });
  }

  async submit(ctx: Actor, id: string): Promise<ChangeSetRow> {
    const cs = await this.changeSet(ctx, id);
    await this.d.db.updateChangeSet(id, { status: await this.move(ctx, cs, 'submit'), submitted_at: now() });
    await this.d.db.audit({ tenant: ctx.tenant, orgId: cs.org_id, changeSetId: id, actor: ctx.actor, action: 'change_set.submitted' });
    return this.changeSet(ctx, id);
  }

  async reject(ctx: Actor, id: string): Promise<ChangeSetRow> {
    const cs = await this.changeSet(ctx, id);
    await this.d.db.updateChangeSet(id, { status: await this.move(ctx, cs, 'reject') });
    await this.d.db.audit({ tenant: ctx.tenant, orgId: cs.org_id, changeSetId: id, actor: ctx.actor, action: 'change_set.rejected' });
    return this.changeSet(ctx, id);
  }

  /** Approving re-checks the org: rows changed since the preview are reported before anything is written. */
  async approve(ctx: Actor, id: string): Promise<{ changeSet: ChangeSetRow; conflicts: number }> {
    const cs = await this.changeSet(ctx, id);
    const status = await this.move(ctx, cs, 'approve');
    const conflicts = await this.countConflicts(ctx, cs);
    await this.d.db.updateChangeSet(id, { status, approved_by: ctx.actor, approved_at: now() });
    await this.d.db.audit({ tenant: ctx.tenant, orgId: cs.org_id, changeSetId: id, actor: ctx.actor, action: 'change_set.approved', detail: `${conflicts} conflicts` });
    return { changeSet: await this.changeSet(ctx, id), conflicts };
  }

  private async countConflicts(ctx: Actor, cs: ChangeSetRow): Promise<number> {
    if (cs.kind === 'assignments') {
      const changes = (await this.d.db.listAssignments(cs.id)).map(assignmentFromRow);
      return assignmentConflicts(changes, await loadCurrentAssignments(this.d.apiFor(await this.org(ctx, cs.org_id)), changes)).length;
    }
    const items = (await this.d.db.listItems(cs.id)).map(itemFromRow);
    if (!items.length) return 0;
    const api = this.d.apiFor(await this.org(ctx, cs.org_id));
    const { snapshot } = await loadSnapshot(api, unique(items.map(i => i.sobjectType)), unique(items.map(i => i.parentId)));
    return findConflicts(items, snapshot).length;
  }

  /** Validates the move to "running", then writes to Salesforce in the background. */
  async start(ctx: Actor, id: string): Promise<{ changeSet: ChangeSetRow; done: Promise<void> }> {
    const cs = await this.changeSet(ctx, id);
    await this.d.db.updateChangeSet(id, { status: await this.move(ctx, cs, 'start'), started_at: now() });
    await this.d.db.audit({ tenant: ctx.tenant, orgId: cs.org_id, changeSetId: id, actor: ctx.actor, action: 'change_set.started' });
    return { changeSet: await this.changeSet(ctx, id), done: this.runInBackground(ctx, cs, false) };
  }

  /**
   * Picks up the runs a server restart cut short. Rows already settled keep their result; the pending ones go
   * through the same check against the org, so a row written just before the restart is recognised, not redone.
   */
  async resumeInterrupted(): Promise<Promise<void>[]> {
    const runs = [];
    for (const cs of await this.d.db.listRunning()) {
      const ctx = { tenant: cs.tenant_id, actor: 'system' };
      await this.d.db.updateChangeSet(cs.id, { resumed_at: now() });
      await this.d.db.audit({ tenant: ctx.tenant, orgId: cs.org_id, changeSetId: cs.id, actor: ctx.actor, action: 'change_set.resumed' });
      runs.push(this.runInBackground(ctx, cs, true));
    }
    return runs;
  }

  private runInBackground(ctx: Actor, cs: ChangeSetRow, resumed: boolean): Promise<void> {
    return (cs.kind === 'assignments' ? this.executeAssignments(ctx, cs, resumed) : this.execute(ctx, cs.id, resumed)).catch(async err => {
      await this.d.db.updateChangeSet(cs.id, { status: 'failed', finished_at: now() });
      await this.d.db.audit({ tenant: ctx.tenant, orgId: cs.org_id, changeSetId: cs.id, actor: ctx.actor, action: 'change_set.failed', detail: String(err) });
    });
  }

  private async execute(ctx: Actor, id: string, resumed: boolean): Promise<void> {
    const cs = await this.changeSet(ctx, id);
    const org = await this.org(ctx, cs.org_id);
    const api = this.d.apiFor(org);
    const all = await this.d.db.listItems(id);
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
        await this.d.db.updateItem(x.row.id, { status: 'ok', record_id: fresh.get(x.item.parentId, x.item.field).recordId });
        continue;
      }
      if (conflicts.has(x.item)) {
        await this.d.db.updateItem(x.row.id, { status: 'conflict', error_code: 'CONFLICT', error_message: 'Changed in the org after the preview.' });
        continue;
      }
      // Use the record id the org has now; the operation follows from it.
      const recordId = fresh.get(x.item.parentId, x.item.field).recordId;
      const op = recordId === null ? 'insert' : x.item.after === 0 ? 'delete' : 'update';
      if (isApex(x.item.sobjectType) && op === 'insert') {
        const entityId = classIds.get(x.item.field);
        if (!entityId) {
          await this.d.db.updateItem(x.row.id, { status: 'error', error_code: 'UNKNOWN_CLASS', error_message: 'The Apex class no longer exists in the org.' });
          continue;
        }
        x.item.entityId = entityId;
      }
      Object.assign(x.item, { recordId, op });
      await this.d.db.updateItem(x.row.id, { record_id: recordId, op });
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
          if (r.ok) { okItems.push(r.item); await this.d.db.updateItem(rowId, { status: 'ok', record_id: r.recordId }); }
          else await this.d.db.updateItem(rowId, { status: 'error', error_code: r.errorCode, error_message: r.errorMessage });
        }
      } catch (err) {
        for (const item of req.items) await this.d.db.updateItem(rowIdOf.get(item)!, { status: 'error', error_code: 'REQUEST_FAILED', error_message: String(err) });
      }
    }

    // 3. Verify: read back and compare with what was requested.
    if (okItems.length) {
      const { snapshot: after } = await loadSnapshot(api, objects, parentIds);
      for (const item of okItems) {
        if (after.get(item.parentId, item.field).access === item.after) continue;
        await this.d.db.updateItem(rowIdOf.get(item)!, { status: 'error', error_code: 'VERIFY_MISMATCH', error_message: 'The org does not show the requested access after the update.' });
      }
    }

    const verified = (await this.d.db.listItems(id)).filter(r => r.status === 'ok').length;
    const outcome = verified === all.length ? 'done' : verified > 0 ? 'partial' : 'failed';
    await this.d.db.updateChangeSet(id, { status: await this.move(ctx, await this.changeSet(ctx, id), 'finish', outcome), finished_at: now() });
    await this.d.db.touchOrg(org.id);
    await this.d.db.audit({ tenant: ctx.tenant, orgId: org.id, changeSetId: id, actor: ctx.actor, action: 'change_set.finished', detail: `${outcome}: ${verified}/${all.length}` });
  }

  /** Assignments: skip the ones changed in the org since the preview, write the rest, read back to verify. */
  private async executeAssignments(ctx: Actor, cs: ChangeSetRow, resumed: boolean): Promise<void> {
    const org = await this.org(ctx, cs.org_id);
    const api = this.d.apiFor(org);
    const all = await this.d.db.listAssignments(cs.id);
    // A resumed run only handles the rows the interrupted one did not settle.
    const rows = all.filter(r => r.status === 'pending').map(r => ({ row: r, change: assignmentFromRow(r) }));
    const rowIdOf = new Map(rows.map(x => [assignmentKey(x.change), x.row.id]));

    const timings = new Timings();
    const current = await timings.time('check org', () => loadCurrentAssignments(api, rows.map(x => x.change)));
    const alreadyApplied = new Set(resumed ? rows.map(x => x.change).filter(c => current(c) === c.after) : []);
    for (const c of alreadyApplied) await this.d.db.updateAssignment(rowIdOf.get(assignmentKey(c))!, { status: 'ok' });
    const pending = rows.map(x => x.change).filter(c => !alreadyApplied.has(c));
    const conflicts = new Set(assignmentConflicts(pending, current));
    for (const c of conflicts) await this.d.db.updateAssignment(rowIdOf.get(assignmentKey(c))!, { status: 'conflict', error_code: 'CONFLICT', error_message: 'Changed in the org after the preview.' });
    const runnable = pending.filter(c => !conflicts.has(c));

    const written = await writeAssignments(api, runnable, timings);
    for (const w of written.filter(w => !w.ok)) await this.d.db.updateAssignment(rowIdOf.get(assignmentKey(w.change))!, { status: 'error', error_code: w.errorCode, error_message: w.errorMessage });

    const ok = written.filter(w => w.ok).map(w => w.change);
    if (ok.length) {
      const after = await timings.time('verify', () => loadCurrentAssignments(api, ok));
      for (const c of ok) {
        const rowId = rowIdOf.get(assignmentKey(c))!;
        if (after(c) === c.after) await this.d.db.updateAssignment(rowId, { status: 'ok' });
        else await this.d.db.updateAssignment(rowId, { status: 'error', error_code: 'VERIFY_MISMATCH', error_message: 'The org does not show the requested assignment after the update.' });
      }
    }

    const verified = (await this.d.db.listAssignments(cs.id)).filter(r => r.status === 'ok').length;
    const outcome = verified === all.length ? 'done' : verified > 0 ? 'partial' : 'failed';
    await this.d.db.updateChangeSet(cs.id, { status: await this.move(ctx, await this.changeSet(ctx, cs.id), 'finish', outcome), finished_at: now(), timings_json: JSON.stringify(timings.steps) });
    await this.d.db.touchOrg(org.id);
    await this.d.db.audit({ tenant: ctx.tenant, orgId: org.id, changeSetId: cs.id, actor: ctx.actor, action: 'change_set.finished', detail: `${outcome}: ${verified}/${all.length}` });
  }

  /** New draft that restores the rows this change set changed successfully. */
  async rollback(ctx: Actor, id: string): Promise<ChangeSetRow> {
    const cs = await this.changeSet(ctx, id);
    if (cs.kind === 'assignments') {
      const done = (await this.d.db.listAssignments(id)).filter(r => r.status === 'ok').map(assignmentFromRow);
      if (!done.length) throw new Error('Nothing to roll back: no row of this change set was applied.');
      return this.createAssignments(ctx, cs.org_id, { description: `Annulla CS-${String(cs.seq).padStart(4, '0')}`, changes: reverseAssignments(done) }, id);
    }
    const ok = (await this.d.db.listItems(id)).filter(r => r.status === 'ok').map(itemFromRow);
    if (!ok.length) throw new Error('Nothing to roll back: no row of this change set was applied.');
    return this.create(ctx, cs.org_id, { description: `Annulla CS-${String(cs.seq).padStart(4, '0')}`, changes: rollbackDesired(ok) }, id);
  }
}
