import { FlsSnapshot } from './snapshot.ts';
import {
  EDIT, NONE, READ, objectOf,
  type Access, type BulkAction, type ChangeItem, type Desired, type FieldMeta, type Operation,
  type PermSetMeta, type Plan, type SkippedItem, type WarningCode
} from './types.ts';

const NOT_EDITABLE_TYPES = new Set(['Group', 'Muting']);

/** Turns a bulk action on fields × permission sets into per-cell targets. */
export function expandBulk(fields: string[], parentIds: string[], action: BulkAction, snapshot: FlsSnapshot): Desired[] {
  const out: Desired[] = [];
  for (const field of fields) {
    for (const parentId of parentIds) {
      const current = snapshot.get(parentId, field).access;
      let access: Access;
      switch (action) {
        case 'read': access = READ; break;
        case 'edit': access = EDIT; break;
        case 'none': access = NONE; break;
        case 'removeEdit': access = current === EDIT ? READ : current; break;
      }
      out.push({ parentId, field, access });
    }
  }
  return out;
}

export interface PlanInput {
  snapshot: FlsSnapshot;
  fields: Map<string, FieldMeta>;
  permissionSets: Map<string, PermSetMeta>;
  desired: Desired[];
}

/**
 * Compares the desired state with the snapshot and returns the FieldPermissions
 * operations needed, applying Salesforce rules:
 * - edit requires read, and calculated fields accept read only;
 * - fields without FLS, managed and group/muting permission sets are skipped;
 * - no record + access → insert, record + other access → update, record + none → delete.
 * When the same cell is requested more than once, the last request wins.
 */
export function planChanges({ snapshot, fields, permissionSets, desired }: PlanInput): Plan {
  const last = new Map<string, Desired>();
  for (const d of desired) last.set(`${d.parentId}|${d.field}`, d);

  const items: ChangeItem[] = [];
  const skipped: SkippedItem[] = [];
  for (const d of last.values()) {
    const skip = (reason: SkippedItem['reason']) => skipped.push({ parentId: d.parentId, field: d.field, reason });
    const field = fields.get(d.field);
    const ps = permissionSets.get(d.parentId);
    if (!field) { skip('UNKNOWN_FIELD'); continue; }
    if (!ps) { skip('UNKNOWN_PERMISSION_SET'); continue; }
    if (!field.permissionable) { skip('NOT_PERMISSIONABLE'); continue; }
    if (ps.namespace) { skip('MANAGED_PERMISSION_SET'); continue; }
    if (ps.type && NOT_EDITABLE_TYPES.has(ps.type)) { skip('GROUP_PERMISSION_SET'); continue; }

    const warnings: WarningCode[] = [];
    let after = d.access;
    if (field.calculated && after === EDIT) { after = READ; warnings.push('CALCULATED_READ_ONLY'); }

    const cell = snapshot.get(d.parentId, d.field);
    if (after === cell.access) { skip('NO_CHANGE'); continue; }

    const sobjectType = objectOf(d.field);
    if (after !== NONE && !snapshot.hasObjectRead(d.parentId, sobjectType)) warnings.push('NO_OBJECT_ACCESS');

    const op: Operation = cell.recordId === null ? 'insert' : after === NONE ? 'delete' : 'update';
    items.push({ parentId: d.parentId, field: d.field, sobjectType, before: cell.access, after, recordId: cell.recordId, op, warnings });
  }
  items.sort((a, b) => a.parentId.localeCompare(b.parentId) || a.field.localeCompare(b.field));
  return { items, skipped };
}

/** Desired state that restores what successful items changed. Plan it against a fresh snapshot. */
export function rollbackDesired(items: Pick<ChangeItem, 'parentId' | 'field' | 'before'>[]): Desired[] {
  return items.map(i => ({ parentId: i.parentId, field: i.field, access: i.before }));
}

/** Items whose current state in the org no longer matches the state the plan was built on. */
export function findConflicts(items: ChangeItem[], fresh: FlsSnapshot): ChangeItem[] {
  return items.filter(i => fresh.get(i.parentId, i.field).access !== i.before);
}
